import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { logger } from "../../utils/logger.js";
import { r2Config, r2Endpoint } from "./config.js";
import { buildObjectKey, isValidObjectKey } from "./keys.js";
import { MAX_UPLOAD_BYTES, validateUpload, type UploadFolder } from "./validation.js";

/**
 * Media storage service (Phase 10A) — the ONLY place in the codebase that
 * talks to Cloudflare R2. Controllers never see S3/R2 types or credentials;
 * they call this service and map StorageError codes to HTTP envelopes.
 *
 * Vercel serverless compatibility:
 *  - buffers live in memory for the duration of a single invocation only —
 *    no filesystem persistence exists or is assumed;
 *  - the S3 client is created lazily and cached per warm instance (the same
 *    connection-reuse model as db/client.ts);
 *  - `src/index.ts` (listen path) and `api/index.ts` (serverless path) both
 *    reach this service identically through createApp().
 *
 * Secret hygiene: access/secret keys and signed URLs are NEVER logged —
 * upstream failures are summarized by error name/code only.
 */

export type StorageErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "INVALID_CONTENT_TYPE"
  | "TOO_LARGE"
  | "UPSTREAM";

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export interface StoredObject {
  /** Public URL for <img src>/metadata storage: `${R2_PUBLIC_URL}/${key}`. */
  readonly url: string;
  /** Server-generated object key — the stable storage reference. */
  readonly key: string;
  readonly contentType: string;
  readonly size: number;
}

/** Minimal structural type so tests can inject a fake client. */
interface S3SendClient {
  send(command: unknown): Promise<unknown>;
}

let cachedClient: S3Client | null = null;
let testClient: S3SendClient | null = null;

function getClient(): S3SendClient {
  if (testClient) return testClient;
  if (!cachedClient) {
    if (!r2Config) {
      throw new StorageError("NOT_CONFIGURED", "Media storage is not configured.");
    }
    cachedClient = new S3Client({
      region: "auto",
      endpoint: r2Endpoint(r2Config),
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return cachedClient;
}

function bucketName(): string {
  if (!r2Config) {
    throw new StorageError("NOT_CONFIGURED", "Media storage is not configured.");
  }
  return r2Config.bucketName;
}

/** True when uploads/deletes can actually run (all five env vars present). */
export function isStorageConfigured(): boolean {
  return r2Config !== null;
}

/** Test-only seam: inject a fake S3 client (pass null to reset). @internal */
export function setStorageClientForTests(client: S3SendClient | null): void {
  testClient = client;
}

export interface UploadInput {
  /** File bytes (memory buffer — never written to disk). */
  readonly buffer: Buffer;
  /** Declared multipart content type (validated against the actual bytes). */
  readonly contentType: string;
  /** Validated target folder — drives the key prefix and the allow-list. */
  readonly folder: UploadFolder;
}

/**
 * Validate + upload one object. Throws StorageError with a precise code so
 * the controller can answer 415 / 413 / 400 / 503 / 502 honestly.
 */
export async function uploadObject(input: UploadInput): Promise<StoredObject> {
  // Validation runs BEFORE the configuration gate: a malformed upload is the
  // client's problem (415/413/400) regardless of whether R2 is configured,
  // and the storage gate (503) should only ever describe the server state.
  if (input.buffer.length === 0) {
    throw new StorageError("INVALID_INPUT", "The uploaded file is empty.");
  }
  if (input.buffer.length > MAX_UPLOAD_BYTES) {
    throw new StorageError("TOO_LARGE", "The uploaded file exceeds the size limit.");
  }

  const verdict = validateUpload({
    declaredContentType: input.contentType,
    buffer: input.buffer,
    folder: input.folder,
  });
  if (!verdict.ok) {
    if (verdict.reason === "unsupported") {
      throw new StorageError(
        "INVALID_CONTENT_TYPE",
        `This file type is not supported for the "${input.folder}" library.`,
      );
    }
    throw new StorageError(
      "INVALID_CONTENT_TYPE",
      "The file contents do not match its declared type.",
    );
  }

  if (!r2Config) {
    throw new StorageError("NOT_CONFIGURED", "Media storage is not configured.");
  }

  const key = buildObjectKey(input.folder, verdict.ext);
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: key,
        Body: input.buffer,
        ContentType: verdict.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    // Summarize only — SDK error objects can embed request details; they are
    // never logged whole and credentials/signed URLs are never printed.
    logger.error(
      `[storage] upload failed for key ${key}: ${summarizeSdkError(error)}`,
    );
    throw new StorageError("UPSTREAM", "Media storage is temporarily unavailable.");
  }

  const url = `${r2Config.publicUrl}/${key}`;
  logger.info(
    `[storage] uploaded ${key} (${verdict.mime}, ${input.buffer.length} bytes)`,
  );
  return { url, key, contentType: verdict.mime, size: input.buffer.length };
}

/**
 * Delete one object by exact server-generated key. Unknown keys are rejected
 * BEFORE any network call, so only objects this app created can be removed.
 * S3 DeleteObject is idempotent — deleting an already-absent key succeeds.
 */
export async function deleteObject(key: string): Promise<void> {
  // Key validation precedes the configuration gate — same reasoning as
  // uploadObject: a malformed key is a client input problem (400).
  if (!isValidObjectKey(key)) {
    throw new StorageError("INVALID_INPUT", "Invalid object key.");
  }
  if (!r2Config) {
    throw new StorageError("NOT_CONFIGURED", "Media storage is not configured.");
  }
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
    );
  } catch (error) {
    logger.error(`[storage] delete failed for key ${key}: ${summarizeSdkError(error)}`);
    throw new StorageError("UPSTREAM", "Media storage is temporarily unavailable.");
  }
  logger.info(`[storage] deleted ${key}`);
}

/**
 * Existence/head check — returns object metadata or null when absent.
 * Useful for reconciling orphaned objects; not exposed over HTTP today.
 */
export async function headObject(
  key: string,
): Promise<{ size: number; contentType: string } | null> {
  if (!r2Config) {
    throw new StorageError("NOT_CONFIGURED", "Media storage is not configured.");
  }
  if (!isValidObjectKey(key)) {
    throw new StorageError("INVALID_INPUT", "Invalid object key.");
  }
  try {
    const output = (await getClient().send(
      new HeadObjectCommand({ Bucket: bucketName(), Key: key }),
    )) as { ContentLength?: number; ContentType?: string };
    return {
      size: output.ContentLength ?? 0,
      contentType: output.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    if (isSdkNotFound(error)) return null;
    logger.error(`[storage] head failed for key ${key}: ${summarizeSdkError(error)}`);
    throw new StorageError("UPSTREAM", "Media storage is temporarily unavailable.");
  }
}

function isSdkNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "NotFound"
  );
}

function summarizeSdkError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const { name, message, Code } = error as { name?: string; message?: string; Code?: string };
    return `${name ?? "Error"}${Code ? ` [${Code}]` : ""}: ${String(message ?? "").slice(0, 200)}`;
  }
  return String(error).slice(0, 200);
}

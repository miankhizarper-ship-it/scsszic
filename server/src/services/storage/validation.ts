/**
 * Upload validation (Phase 10A) — MIME allowlists, magic-byte sniffing and
 * object-key rules for the media storage service.
 *
 * Security posture:
 *  - the client-declared content type is NEVER trusted on its own; the actual
 *    bytes are sniffed and must both be allow-listed AND match the declared
 *    type (after `image/jpg` → `image/jpeg` normalization). Executables,
 *    documents and polyglot payloads therefore cannot ride through as images.
 *  - the storage key is always generated server-side; the original filename
 *    never reaches object storage.
 *  - size is capped below Vercel's 4.5 MB serverless request limit so a
 *    legitimate upload never dies at the platform edge.
 */

/** Permitted image types → canonical extension used in the object key. */
export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Permitted direct-video types → extension (Videos module thumbnails can
 * also be images; direct clips are accepted for the `videos` folder only). */
export const VIDEO_MIME_TYPES: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/** Folders that accept images (everything except direct-video uploads). */
export const IMAGE_FOLDERS = [
  "gallery",
  "blogs",
  "events",
  "alumni",
  "members",
  "projects",
  "feed",
  "misc",
] as const;

/** Folders that additionally accept direct video files. */
export const VIDEO_FOLDERS = ["videos"] as const;

export type UploadFolder = (typeof IMAGE_FOLDERS)[number] | (typeof VIDEO_FOLDERS)[number];

export const UPLOAD_FOLDERS: readonly UploadFolder[] = [...IMAGE_FOLDERS, ...VIDEO_FOLDERS];

export function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === "string" && (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

/** 4 MB — headroom under Vercel's 4.5 MB serverless request-body cap. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Keys are always server-generated: uploads/<folder>/<yyyy>/<mm>/<uuid>.<ext> */
export const OBJECT_KEY_PATTERN =
  /^uploads\/[a-z0-9-]+\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;

export function isValidObjectKey(key: string): boolean {
  return OBJECT_KEY_PATTERN.test(key);
}

function startsWith(bytes: Buffer, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function asciiAt(bytes: Buffer, start: number, length: number): string {
  return bytes.subarray(start, start + length).toString("latin1");
}

/**
 * Best-effort content sniffing of the first bytes. Returns the canonical
 * allow-listed MIME type for the buffer, or null when the bytes are not a
 * supported media type (or are something unrecognised entirely).
 */
export function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (asciiAt(buffer, 0, 6) === "GIF87a" || asciiAt(buffer, 0, 6) === "GIF89a") {
    return "image/gif";
  }
  // WEBP: "RIFF" + 4 bytes size + "WEBP"
  if (asciiAt(buffer, 0, 4) === "RIFF" && asciiAt(buffer, 8, 4) === "WEBP") {
    return "image/webp";
  }
  // ISO-BMFF family (AVIF images and MP4 videos both use an "ftyp" box).
  if (asciiAt(buffer, 4, 4) === "ftyp") {
    const brand = asciiAt(buffer, 8, 4).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    if (/^(isom|iso2|mp41|mp42|mp4v|dash|msdh|m4v)/.test(brand)) return "video/mp4";
    return null; // heic/mif1/… — not on the allow-list
  }
  // WEBM/EBML
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";

  return null;
}

function normalizeDeclaredType(contentType: string): string {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return type === "image/jpg" ? "image/jpeg" : type;
}

export type SniffResult =
  | { ok: true; mime: string; ext: string }
  | { ok: false; reason: "unsupported" | "mismatch" | "unknown" };

/**
 * Validate an upload against the allow-list for its target folder:
 *  1. the declared multipart type and the sniffed byte-level type must agree,
 *  2. the effective type must be allowed for the folder,
 *  3. the extension is always derived from the validated MIME type — never
 *     from the client filename.
 */
export function validateUpload(input: {
  declaredContentType: string;
  buffer: Buffer;
  folder: UploadFolder;
}): SniffResult {
  const sniffed = sniffMimeType(input.buffer);
  if (sniffed === null) return { ok: false, reason: "unknown" };

  const declared = normalizeDeclaredType(input.declaredContentType);
  if (declared !== sniffed) return { ok: false, reason: "mismatch" };

  const allowlist =
    input.folder === "videos"
      ? { ...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES }
      : IMAGE_MIME_TYPES;

  const ext = allowlist[sniffed];
  if (!ext) return { ok: false, reason: "unsupported" };

  return { ok: true, mime: sniffed, ext };
}

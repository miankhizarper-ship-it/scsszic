import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "../../config/env.js";

/**
 * ImageKit browser-direct upload signing (Task 37).
 *
 * The community surfaces (feed artwork, member avatars) upload images
 * STRAIGHT from the browser to ImageKit's upload API — no file bytes cross
 * this server, which keeps the Vercel serverless bodies tiny and puts the
 * bandwidth on the CDN's free tier instead of a serverless function.
 *
 * ImageKit's client-side upload contract:
 *   POST <upload endpoint>  multipart with
 *     file, fileName, folder,
 *     publicKey, token, expire, signature
 *   signature = HMAC-SHA1(token + expire).digest(hex) keyed with the
 *   ACCOUNT PRIVATE KEY — which is why this service exists server-side.
 *
 * Security model:
 *   - the private key NEVER leaves the server (env IMAGEKIT_PRIVATE_KEY)
 *   - the client receives only the public key + a per-request signed token
 *   - the FOLDER is server-owned (never accepted from the client) so a
 *     signed token can only drop files into the two community folders
 *   - tokens are single-purpose nonces valid until `expire` (30 min default)
 *   - the endpoint is role-gated (member|manage|admin) upstream — anonymous
 *     and plain-user callers can never mint upload tokens
 *
 * OPTIONAL by design: `isImagekitUploadsEnabled()` reports readiness and
 * the controller degrades to 503 so a deployment without credentials keeps
 * every other feature working (the client keeps its URL inputs).
 */

/** Server-owned upload folders — the ONLY folders a token can ever target. */
export const IMAGEKIT_UPLOAD_FOLDERS = {
  /** Feed post artwork (community posts by members + staff). */
  feed: "/scsszic/feed",
  /** Member public-profile avatars (self-service). */
  avatar: "/scsszic/avatars",
} as const;

export type ImageKitUploadFolder = keyof typeof IMAGEKIT_UPLOAD_FOLDERS;

export function isImagekitUploadFolder(value: string): value is ImageKitUploadFolder {
  return value === "feed" || value === "avatar";
}

/** True when every ImageKit credential is present on the deployment. */
export function isImagekitUploadsEnabled(): boolean {
  return env.imagekitUploadsEnabled;
}

/** The safe, client-publishable half of the ImageKit configuration. */
export interface ImageKitAuthParams {
  /** One-time nonce — unique per sign request (UUID v4). */
  token: string;
  /** HMAC-SHA1(token + expire) keyed with the account private key. */
  signature: string;
  /** Unix SECONDS after which ImageKit rejects the signature. */
  expire: number;
  /** ImageKit public key (public by definition). */
  publicKey: string;
  /** CDN URL endpoint every uploaded file is served under. */
  urlEndpoint: string;
  /** The server-owned folder this token may write into. */
  folder: string;
  /** Upload API base — the real ImageKit endpoint, or the QA mock. */
  uploadUrl: string;
}

class ImageKitNotConfiguredError extends Error {
  constructor() {
    super("ImageKit uploads are not configured");
    this.name = "ImageKitNotConfiguredError";
  }
}

/**
 * Mint upload auth params for one community upload. Throws
 * ImageKitNotConfiguredError when the deployment has no credentials —
 * the controller maps that to the standard 503 "unconfigured" envelope.
 */
export function generateImagekitAuthParams(folder: ImageKitUploadFolder): ImageKitAuthParams {
  if (!isImagekitUploadsEnabled()) throw new ImageKitNotConfiguredError();

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + env.imagekitUploadTtlSeconds;
  const signature = createHmac("sha1", env.imagekitPrivateKey)
    .update(`${token}${expire}`)
    .digest("hex");

  return {
    token,
    signature,
    expire,
    publicKey: env.imagekitPublicKey,
    urlEndpoint: env.imagekitUrlEndpoint,
    folder: IMAGEKIT_UPLOAD_FOLDERS[folder],
    uploadUrl: env.imagekitUploadUrl,
  };
}

/**
 * QA/testing helper — recompute the expected signature for a token+expire
 * pair. Exported so the QA suite can verify the signing math against the
 * exact env private key without duplicating the HMAC construction.
 */
export function expectedImagekitSignature(token: string, expire: number): string {
  return createHmac("sha1", env.imagekitPrivateKey).update(`${token}${expire}`).digest("hex");
}

/** Constant-time comparison of two hex signatures (QA utility). */
export function signaturesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

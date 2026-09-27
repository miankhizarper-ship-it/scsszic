import "dotenv/config";

/**
 * Cloudflare R2 configuration (Phase 10A) — S3-compatible object storage for
 * uploaded media.
 *
 * Rules (mirroring config/env.ts):
 *  - credentials never carry defaults and are never logged
 *  - everything is OPTIONAL at boot: the API starts and serves every existing
 *    endpoint without R2; the upload/delete endpoints answer 503 with a clear
 *    message until all five variables are present. This keeps existing
 *    deployments (and every CMS flow) working unchanged.
 *
 * The five variables (names only in .env.example — never real values):
 *   R2_ACCOUNT_ID        — Cloudflare account id; builds the S3 endpoint
 *   R2_ACCESS_KEY_ID     — R2 API token access key (server-side only)
 *   R2_SECRET_ACCESS_KEY — R2 API token secret  (server-side only)
 *   R2_BUCKET_NAME       — bucket that holds uploaded objects
 *   R2_PUBLIC_URL        — public base URL for stored media (R2 r2.dev URL or
 *                          a custom domain bound to the bucket); stored
 *                          metadata URLs are `${R2_PUBLIC_URL}/${key}`. No
 *                          trailing slash.
 *
 * All five are required together: a half-configured bucket would let uploads
 * succeed while producing URLs the public site cannot load, so the service
 * stays disabled until the configuration is complete.
 */

export interface R2Config {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucketName: string;
  /** Public base URL without trailing slash (r2.dev or custom domain). */
  readonly publicUrl: string;
}

function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucketName = process.env.R2_BUCKET_NAME?.trim() ?? "";
  const publicUrl = (process.env.R2_PUBLIC_URL?.trim() ?? "").replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

export const r2Config: R2Config | null = readR2Config();

/** S3 endpoint for the account — derived, so no R2_ENDPOINT variable exists. */
export function r2Endpoint(config: R2Config): string {
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

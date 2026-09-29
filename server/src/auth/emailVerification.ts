import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Email verification token helpers.
 *
 * A verification token exists in two forms:
 *  - RAW  — 64 hex chars (256 bits of CSPRNG entropy). The raw value appears
 *           ONLY inside the emailed link; it is never stored and never logged.
 *  - HASH — sha256(raw), hex. This is what MongoDB holds, so a database
 *           read cannot be replayed as a verification link.
 *
 * Lookup is therefore: hash the incoming raw token → find the user whose
 * `emailVerification.tokenHash` matches. The constant-time compare in
 * `tokenMatchesHash` guards the (defensive) re-check path.
 */

export interface GeneratedVerificationToken {
  /** Goes into the emailed link, and nowhere else. */
  raw: string;
  /** Goes into the user document. */
  tokenHash: string;
}

export function generateVerificationToken(): GeneratedVerificationToken {
  const raw = randomBytes(32).toString("hex");
  return { raw, tokenHash: sha256Hex(raw) };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time equality for two sha256 hex digests. */
export function tokenMatchesHash(rawToken: string, tokenHash: string): boolean {
  const rawHash = Buffer.from(sha256Hex(rawToken), "hex");
  const storedHash = Buffer.from(tokenHash, "hex");
  if (rawHash.length !== storedHash.length) return false;
  return timingSafeEqual(rawHash, storedHash);
}

/** Defensive sanity check for the token arriving off a link. */
export function isPlausibleVerificationToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

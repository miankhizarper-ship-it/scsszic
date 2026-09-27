import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

/**
 * Password hashing — bcryptjs (pure-JS bcrypt, mature and dependency-safe).
 *
 * Why not Argon2id? The native `argon2`/`@node-rs/argon2` modules require
 * prebuilt binaries or a native toolchain that this project cannot assume;
 * bcryptjs keeps the install portable. The interface below (hashPassword /
 * verifyPassword) is the only call surface — swapping the implementation for
 * Argon2id in a later phase touches this file alone.
 *
 * Cost factor: 12 rounds (~250ms on modern hardware) — OWASP-recommended
 * floor for interactive logins, strong against offline guessing.
 *
 * `verifyPassword` uses bcrypt.compare (constant-time hash comparison).
 * `dummyVerify` equalizes response timing when the account does not exist,
 * so login cannot be timing-probed for valid emails/usernames.
 *
 * NEVER log the plaintext password or the resulting hash.
 */

const BCRYPT_COST = 12;

/**
 * Lazily-computed hash of a random string, used for timing equalization.
 * Generated (not hardcoded) so it is guaranteed to be a well-formed hash
 * for every bcryptjs version, and can never match a real password.
 */
let dummyHash: string | null = null;

function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync(randomBytes(24).toString("base64url"), BCRYPT_COST);
  return dummyHash;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/** Burn ~the same CPU time as a real verify when the user does not exist. */
export async function dummyVerify(plain: string): Promise<void> {
  await bcrypt.compare(plain, getDummyHash()).catch(() => undefined);
}

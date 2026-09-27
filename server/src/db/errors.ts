import type { MongoServerError } from "mongodb";

/**
 * MongoDB error translation (spec §21).
 *
 *   Mongo duplicate key (E11000)  →  domain conflict          →  HTTP 409
 *   connection / timeout / topol. →  service unavailable      →  HTTP 503
 *   everything else               →  unexpected server error  →  HTTP 500
 *
 * Raw Mongo errors NEVER reach clients — controllers map the typed errors
 * from here into the API's existing `{ message, errors? }` convention and
 * the central error handler logs full details server-side only.
 */

export function isDuplicateKeyError(error: unknown): error is MongoServerError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Which unique constraint fired? Reads the duplicate key's `keyPattern`
 * (e.g. `{ normalizedEmail: 1 }`). Returns null when undeterminable —
 * callers then fall back to a generic conflict.
 */
export function duplicateKeyField(error: MongoServerError): string | null {
  const pattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  if (!pattern) return null;
  const keys = Object.keys(pattern);
  if (keys.length === 0) return null;
  // normalizedEmail → email, normalizedUsername → username, slug → slug…
  return keys[0].replace(/^normalized/, "");
}

/** True for network/topology/timeout style failures (mapped to 503). */
export function isConnectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: string }).name;
  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTopologyClosedError" ||
    name === "MongoPoolClearedError"
  );
}

/**
 * One-line, log-safe description of a Mongo error (message only — the
 * central error handler already logs the full stack server-side).
 */
export function describeMongoError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

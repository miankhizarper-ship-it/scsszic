import "dotenv/config";

/**
 * Centralised environment configuration.
 *
 * Phase 8 adds MongoDB, session/cookie, and dev-seed settings. Rules:
 *  - credentials never carry defaults and are never logged
 *  - production fail-safe (spec §3): the server refuses to boot when a
 *    required secret/connection is missing — a misconfigured deployment
 *    must fail loudly at startup, not serve broken sessions
 *  - development provides documented local fallbacks so `bun run dev`
 *    works with zero configuration against the local mongod
 */

function intOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolOr(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

/* ------------------------------ MongoDB ------------------------------ */

/** Local dev default — the repository's bundled/forked mongod. */
const MONGODB_URI_DEFAULT = "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME_DEFAULT = "scs";

const mongodbUri = process.env.MONGODB_URI?.trim() || MONGODB_URI_DEFAULT;
const mongodbDbName = process.env.MONGODB_DB_NAME?.trim() || MONGODB_DB_NAME_DEFAULT;

if (isProduction && !process.env.MONGODB_URI) {
  throw new Error(
    "[env] MONGODB_URI is required in production — refusing to boot with an " +
      "implicit local database. Set it in the environment (never in the repo).",
  );
}

/* --------------------------- Sessions/cookies --------------------------- */

const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";

if (isProduction && sessionSecret.length < 32) {
  throw new Error(
    "[env] SESSION_SECRET must be set to at least 32 characters in production — " +
      "session cookies are HMAC-signed with it.",
  );
}

// Dev fallback keeps local logins working without setup; it is NOT a secret
// in any meaningful sense and production never uses it (guarded above).
const DEV_SESSION_SECRET_FALLBACK = "scs-dev-session-secret-do-not-use-in-production";

const sessionTtlHours = intOr(process.env.SESSION_TTL_HOURS, 24 * 7); // 7 days (spec §7)

/** Secure cookies on https in production; plain http on localhost. */
const cookieSecure = boolOr(process.env.COOKIE_SECURE, isProduction);
const cookieSameSite = (process.env.COOKIE_SAME_SITE?.trim() || "lax") as "lax" | "strict" | "none";

/* ------------------------- Dev seed demo accounts ------------------------- */
/* Documented dev-only defaults (spec §9) — fictional demo accounts, never
   real credentials. Passwords are never logged by the seeder. */

export const env = {
  nodeEnv,
  isProduction,
  port: intOr(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  mongodbUri,
  mongodbDbName,
  mongodbTimeoutMs: intOr(process.env.MONGODB_TIMEOUT_MS, 10_000),

  sessionSecret: sessionSecret || DEV_SESSION_SECRET_FALLBACK,
  sessionTtlHours,
  cookieSecure,
  cookieSameSite,

  devSeedMemberPassword: process.env.DEV_SEED_MEMBER_PASSWORD?.trim() || "scs-demo-2026",
  devSeedHiraPassword: process.env.DEV_SEED_HIRA_PASSWORD?.trim() || "scs-demo-2026",
  devSeedAdminPassword: process.env.DEV_SEED_ADMIN_PASSWORD?.trim() || "scs-admin-2026",
} as const;

export type Env = typeof env;

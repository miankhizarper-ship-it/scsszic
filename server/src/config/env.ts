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

/* --------------------------- Email (Brevo) --------------------------- */
/* Transactional email for the signup verification flow. OPTIONAL by design:
   with no BREVO_API_KEY (or sender) the mailer reports "unconfigured" and
   signup auto-verifies accounts, so the platform keeps working before the
   credentials are added (and local dev needs no email setup at all). */
const brevoApiKey = process.env.BREVO_API_KEY?.trim() ?? "";
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim() ?? "";

/* --------------------------- Google OAuth --------------------------- */
/* "Continue with Google" for login/signup. OPTIONAL by design: with either
   credential missing the auth routes redirect back to the client with an
   "oauth=unconfigured" notice and the password forms keep working. The
   auth/token/userinfo endpoints are env-overridable so QA can point the
   flow at a local mock Google (same seam pattern as BREVO_API_URL). */
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

/* --------------------------- AI assistant (Groq) --------------------------- */
/* Field-fill assistant for the admin panel (Task 28). OPTIONAL by design,
   exactly like Brevo/Google: with no GROQ_API_KEY the endpoint answers 503
   "unconfigured" and the rest of the platform keeps working. The API key is
   server-side ONLY — it never ships to the browser; the client talks to our
   own /api/admin/ai endpoint with its normal session cookie. GROQ_API_URL is
   the same QA seam pattern as BREVO_API_URL: point it at a local mock to
   test the full path without spending tokens. */
const groqApiKey = process.env.GROQ_API_KEY?.trim() ?? "";

/* --------------------------- ImageKit media uploads --------------------------- */
/* Browser-DIRECT image uploads for the community surfaces (feed post artwork,
   member avatars). OPTIONAL by design, exactly like Brevo/Google/Groq: with
   any credential missing the sign endpoint answers 503 "unconfigured" and the
   forms fall back to their plain URL inputs.

   Flow (no file bytes ever cross this server — Vercel serverless bodies are
   tiny and the CDN absorbs the upload bandwidth):
     1. client  GET /api/media/imagekit-auth  → { token, signature, expire,
        publicKey, urlEndpoint, folder, uploadUrl }
     2. client  POST multipart → uploadUrl (ImageKit's upload API) — the
        signature is HMAC-SHA1(token + expire) keyed with the PRIVATE key,
        so the private key stays server-side only.
   IMAGEKIT_UPLOAD_URL is the QA seam (mock ImageKit) in the same spirit as
   BREVO_API_URL / GROQ_API_URL. The public key + URL endpoint are public by
   definition (they appear in every served <img> URL); only the private key
   is a secret. */
const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
const imagekitPublicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
const imagekitUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "";

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

  // --- Email verification (Brevo) ---
  brevoApiKey,
  brevoSenderEmail,
  brevoSenderName: process.env.BREVO_SENDER_NAME?.trim() || "Society of Computer Science",
  /** API base override — QA can point the mailer at a local mock Brevo. */
  brevoApiUrl: process.env.BREVO_API_URL?.trim() || "https://api.brevo.com",
  /** Public client base URL — the verify-email link points here. */
  clientUrl: process.env.CLIENT_URL?.trim() || "http://localhost:3000",
  /** Verification links expire after this many minutes (user spec: 15). */
  emailVerificationTtlMinutes: intOr(process.env.EMAIL_VERIFICATION_TTL_MINUTES, 15),
  /** Verification flow activates only when Brevo is fully configured. */
  emailVerificationEnabled: Boolean(brevoApiKey && brevoSenderEmail),
  /** Where contact-form messages are delivered. Defaults to the Brevo
   *  sender itself (the society inbox) so one address serves both roles. */
  contactToEmail:
    process.env.CONTACT_TO_EMAIL?.trim() || brevoSenderEmail || "scs@szic.edu.pk",

  // --- Google OAuth (login / signup) ---
  googleClientId,
  googleClientSecret,
  /** Explicit override for the registered callback URL; derived from the
   *  request when unset (works on Vercel with trust-proxy and locally). */
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() || "",
  googleAuthUrl: process.env.GOOGLE_AUTH_URL?.trim() || "https://accounts.google.com/o/oauth2/v2/auth",
  googleTokenUrl: process.env.GOOGLE_TOKEN_URL?.trim() || "https://oauth2.googleapis.com/token",
  googleUserInfoUrl:
    process.env.GOOGLE_USERINFO_URL?.trim() || "https://www.googleapis.com/oauth2/v3/userinfo",
  /** OAuth flow activates only when BOTH credentials are present. */
  googleOAuthEnabled: Boolean(googleClientId && googleClientSecret),

  // --- Admin AI assistant (Groq) ---
  groqApiKey,
  /** Default model: fast, high-quality general purpose chat on Groq's free tier. */
  groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
  /** API base override — QA can point the assistant at a local mock Groq. */
  groqApiUrl: process.env.GROQ_API_URL?.trim() || "https://api.groq.com/openai/v1",
  /** AI field generation activates only when the API key is present. */
  aiFieldEnabled: Boolean(groqApiKey),
  /** Per-user sliding-window rate limit (soft guard for the shared key). */
  aiFieldRateLimitMax: intOr(process.env.AI_FIELD_RATE_LIMIT_MAX, 20),
  aiFieldRateWindowSeconds: intOr(process.env.AI_FIELD_RATE_WINDOW_SECONDS, 300),
  /** Upstream call budget — deliberately UNDER Vercel's shortest serverless
   *  function timeout (10s on the Hobby plan's non-fluid default) so the
   *  endpoint can return its own graceful 504 JSON instead of Vercel killing
   *  the function mid-call with an opaque infrastructure 502. The vercel.json
   *  maxDuration raises the ceiling where the plan allows it. */
  aiFieldTimeoutMs: intOr(process.env.AI_FIELD_TIMEOUT_MS, 9_000),

  // --- ImageKit (browser-direct image uploads) ---
  imagekitPrivateKey,
  imagekitPublicKey,
  imagekitUrlEndpoint,
  /** Upload API base override — QA can point uploads at a local mock. */
  imagekitUploadUrl:
    process.env.IMAGEKIT_UPLOAD_URL?.trim() || "https://upload.imagekit.io/api/v1/files/upload",
  /** Upload auth params activate only when ALL THREE credentials are set. */
  imagekitUploadsEnabled: Boolean(imagekitPrivateKey && imagekitPublicKey && imagekitUrlEndpoint),
  /** Signed auth params stay valid for this long (default 30 minutes). */
  imagekitUploadTtlSeconds: intOr(process.env.IMAGEKIT_UPLOAD_TTL_SECONDS, 1_800),
} as const;

export type Env = typeof env;

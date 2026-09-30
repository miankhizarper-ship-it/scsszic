import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Google OAuth 2.0 — authorization-code flow, written against Google's
 * token/userinfo REST endpoints with plain fetch (NO SDK, NO new dependency
 * — the same discipline as the Brevo mailer).
 *
 * Flow owned by the routes:
 *   GET /api/auth/google          → 302 to Google's consent screen (state)
 *   GET /api/auth/google/callback → code+state → token → userinfo → session
 *
 * Security posture:
 *  - state: random nonce in an HTTP-only cookie (see the controller) — the
 *    callback refuses any code that does not arrive with a state value the
 *    server itself issued to THAT browser.
 *  - the client secret never leaves the server; only token EXCHANGE uses it.
 *  - profile email must be Google-verified (email_verified) — that proof of
 *    control is what lets the flow mark SCS accounts verified / create them
 *    without our own verification loop.
 *  - never throws: every failure is a typed result the controller maps to a
 *    redirect with a short `oauth=<reason>` code the login page explains.
 *  - endpoints are env-overridable (GOOGLE_AUTH_URL / GOOGLE_TOKEN_URL /
 *    GOOGLE_USERINFO_URL) — the QA seam that lets the full flow run against
 *    a local mock Google.
 *  - logs carry outcomes only — never codes, tokens, or the client secret.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export interface GoogleProfile {
  /** Stable Google account id (the `sub` claim) — never shown publicly. */
  sub: string;
  email: string;
  /** Google's own verification of the address. REQUIRED to proceed. */
  emailVerified: boolean;
  /** Display name Google reports (may be empty). */
  name: string;
}

type AuthUrlResult = { ok: true; url: string } | { ok: false; reason: "unconfigured" };

type CodeExchangeResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "exchange_failed"; detail: string };

type ProfileResult =
  | { ok: true; profile: GoogleProfile }
  | { ok: false; reason: "profile_failed" | "email_unverified"; detail: string };

/** Build the consent-screen URL. Fails when OAuth is not configured. */
export function buildGoogleAuthUrl(redirectUri: string, state: string): AuthUrlResult {
  if (!env.googleOAuthEnabled) return { ok: false, reason: "unconfigured" };

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    // Let a visitor with several Google accounts pick deliberately instead
    // of silently reusing the last choice.
    prompt: "select_account",
    include_granted_scopes: "true",
  });
  return { ok: true, url: `${env.googleAuthUrl}?${params.toString()}` };
}

/** Exchange the authorization code for an access token. Never throws. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<CodeExchangeResult> {
  try {
    const response = await fetch(env.googleTokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Google's error body (error / error_description) is short and
      // credential-free — safe to surface in the sanitized detail.
      const detail = (await response.text()).slice(0, 200);
      logger.error(`[oauth] token exchange failed: http_${response.status}`);
      return { ok: false, reason: "exchange_failed", detail: `google_http_${response.status}: ${detail}` };
    }

    const data = (await response.json()) as { access_token?: string } | null;
    if (!data?.access_token) {
      logger.error("[oauth] token exchange returned no access token");
      return { ok: false, reason: "exchange_failed", detail: "google_response_missing_token" };
    }
    return { ok: true, accessToken: data.access_token };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`[oauth] token exchange request error: ${detail}`);
    return { ok: false, reason: "exchange_failed", detail };
  }
}

/** Fetch the Google profile for an access token. Never throws. */
export async function fetchGoogleProfile(accessToken: string): Promise<ProfileResult> {
  try {
    const response = await fetch(env.googleUserInfoUrl, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      logger.error(`[oauth] userinfo fetch failed: http_${response.status}`);
      return { ok: false, reason: "profile_failed", detail: `google_http_${response.status}: ${detail}` };
    }

    const data = (await response.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    } | null;

    if (!data?.sub || !data.email) {
      logger.error("[oauth] userinfo response missing sub/email");
      return { ok: false, reason: "profile_failed", detail: "google_profile_incomplete" };
    }
    if (data.email_verified !== true) {
      logger.error("[oauth] google email not verified");
      return {
        ok: false,
        reason: "email_unverified",
        detail: "google_email_unverified",
      };
    }

    return {
      ok: true,
      profile: {
        sub: data.sub,
        email: data.email.trim().toLowerCase(),
        emailVerified: true,
        name: typeof data.name === "string" ? data.name : "",
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`[oauth] userinfo request error: ${detail}`);
    return { ok: false, reason: "profile_failed", detail };
  }
}

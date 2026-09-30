import type { Response } from "express";

import { env } from "../config/env.js";

/**
 * Session cookie configuration — the session token never touches
 * localStorage, sessionStorage, URLs, or React state. The browser holds only
 * this HTTP-only cookie; JavaScript cannot read it.
 *
 * Development/production behaviour:
 *  - httpOnly: always (XSS cannot exfiltrate the session)
 *  - secure:   COOKIE_SECURE — true in production, false on http://localhost
 *  - sameSite: COOKIE_SAME_SITE — "lax" default (CSRF-safe for POSTs while
 *              keeping normal top-level navigation logged-in)
 *  - maxAge:   matches the server-side session TTL
 */

export const SESSION_COOKIE_NAME = "scs_session";

export function sessionCookieMaxAgeMs(): number {
  return env.sessionTtlHours * 60 * 60 * 1000;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
    maxAge: sessionCookieMaxAgeMs(),
  } as const;
}

/** Issue the session cookie (signup / login). */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

/** Clear the session cookie (logout / invalid session). */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
  });
}

/* ------------------------- Google OAuth state ------------------------- */

/**
 * CSRF protection for the OAuth dance: the "Continue with Google" handler
 * issues a random state bound to THIS browser via an HTTP-only cookie; the
 * callback refuses any code that does not arrive with the matching state.
 * Lax same-site + short TTL (10 minutes) + host-scoped path — the cookie
 * dies the moment the flow resolves either way.
 */
export const OAUTH_STATE_COOKIE_NAME = "scs_oauth_state";

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_MS,
  } as const;
}

export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, oauthStateCookieOptions());
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}

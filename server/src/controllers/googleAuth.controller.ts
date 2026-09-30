import { randomBytes, timingSafeEqual } from "node:crypto";

import type { Request, RequestHandler, Response } from "express";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  clearOAuthStateCookie,
  OAUTH_STATE_COOKIE_NAME,
  setOAuthStateCookie,
} from "../auth/cookies.js";
import { createSessionToken } from "../auth/session.js";
import { sessionStore, userRepository } from "../auth/store.js";
import { setSessionCookie } from "../auth/cookies.js";
import { DuplicateUserError } from "../auth/userRepository.js";
import {
  DISPLAY_NAME_MAX,
  USERNAME_MAX,
  USERNAME_MIN,
} from "../auth/validation.js";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleProfile,
  type GoogleProfile,
} from "../services/auth/googleOAuth.js";

/**
 * "Continue with Google" — authorization-code flow over /api/auth/google.
 *
 * Account rules (the email is the join key, Google-verified by the profile):
 *  - existing account  → linked login; an unverified SCS account becomes
 *    verified (Google owns the mailbox — stronger proof than our own link)
 *  - unknown account   → created WITHOUT a password (password login is then
 *    refused generically), username auto-derived + de-duplicated
 *  - every success starts a real session and lands on the client HOME
 *
 * Every failure is a 302 back to /login?oauth=<reason> — the login page
 * translates the reason into human copy. Nothing about tokens, codes, or
 * the client secret ever reaches a redirect target or a log line.
 */

/** Redirect target for an oauth failure reason. */
function redirectToLogin(res: Response, reason: string): void {
  clearOAuthStateCookie(res);
  res.redirect(302, `${env.clientUrl.replace(/\/+$/, "")}/login?oauth=${reason}`);
}

/**
 * The redirect_uri sent to Google must be byte-identical in the consent link
 * and the token exchange, and must match a URI registered in Google Cloud.
 * Explicit env override wins (GOOGLE_REDIRECT_URI); otherwise it is derived
 * from the incoming request — behind `trust proxy` that is the public host
 * the browser actually visited (the Vercel server project, or the client
 * host when the API is proxied under the same origin in dev).
 */
function resolveGoogleRedirectUri(req: Request): string {
  if (env.googleRedirectUri) return env.googleRedirectUri;
  const proto = req.protocol;
  const host = req.get("host") ?? `localhost:${env.port}`;
  return `${proto}://${host}/api/auth/google/callback`;
}

/** GET /api/auth/google — issue the state cookie and bounce to Google. */
export const getGoogleAuthStart: RequestHandler = (req, res) => {
  if (!env.googleOAuthEnabled) {
    redirectToLogin(res, "unconfigured");
    return;
  }

  const state = randomBytes(24).toString("base64url");
  setOAuthStateCookie(res, state);

  const auth = buildGoogleAuthUrl(resolveGoogleRedirectUri(req), state);
  if (!auth.ok) {
    redirectToLogin(res, "unconfigured");
    return;
  }

  res.redirect(302, auth.url);
};

/**
 * Turn a Google profile into a legal, unused username: sanitize to the
 * platform's [a-z0-9_-]{3,24} handle rules, derive from the email's local
 * part, then de-duplicate with numeric suffixes (checked against the live
 * repository, not assumptions).
 */
async function uniqueUsernameFor(profile: GoogleProfile): Promise<string> {
  const local = profile.email.split("@")[0] ?? "";
  let base =
    local
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, USERNAME_MAX - 5) ?? "";
  if (base.length < USERNAME_MIN) base = `user-${base}`;

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (candidate.length > USERNAME_MAX) continue;
    if (!(await userRepository.findByUsername(candidate))) return candidate;
  }

  // 50 collisions is statistically impossible — the random tail is a
  // belt-and-braces guarantee that creation always gets a free handle.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base.slice(0, USERNAME_MAX - 6)}-${randomBytes(3).toString("hex")}`;
    if (!(await userRepository.findByUsername(candidate))) return candidate;
  }
  return `${base.slice(0, USERNAME_MAX - 6)}-${Date.now().toString(36)}`;
}

function displayNameFor(profile: GoogleProfile): string {
  const name = profile.name.trim();
  if (name.length >= 2) return name.slice(0, DISPLAY_NAME_MAX);
  const local = profile.email.split("@")[0] ?? "";
  return local.length >= 2 ? local.slice(0, DISPLAY_NAME_MAX) : "SCS Member";
}

async function startSessionFor(res: Response, userId: string): Promise<void> {
  const session = await sessionStore.create(userId);
  setSessionCookie(res, createSessionToken(session.sessionId));
}

/** GET /api/auth/google/callback — the browser lands here from Google. */
export const getGoogleCallback: RequestHandler = async (req, res) => {
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];
  const queryState = typeof req.query.state === "string" ? req.query.state : "";
  const queryError = typeof req.query.error === "string" ? req.query.error : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";

  // Google refused / the visitor cancelled on the consent screen.
  if (queryError) {
    redirectToLogin(res, "denied");
    return;
  }

  // The state must exist AND match the one this browser was issued —
  // constant-time compare, then the cookie is dead either way.
  if (
    !cookieState ||
    !queryState ||
    cookieState.length !== queryState.length ||
    !timingSafeEqual(Buffer.from(cookieState), Buffer.from(queryState))
  ) {
    redirectToLogin(res, "state");
    return;
  }
  clearOAuthStateCookie(res);

  if (!code) {
    redirectToLogin(res, "state");
    return;
  }

  const redirectUri = resolveGoogleRedirectUri(req);
  const exchange = await exchangeGoogleCode(code, redirectUri);
  if (!exchange.ok) {
    redirectToLogin(res, "exchange");
    return;
  }

  const profileResult = await fetchGoogleProfile(exchange.accessToken);
  if (!profileResult.ok) {
    redirectToLogin(res, profileResult.reason === "email_unverified" ? "email_unverified" : "profile");
    return;
  }
  const profile = profileResult.profile;

  try {
    const existing = await userRepository.findByEmail(profile.email);

    if (existing) {
      // Google just proved control of this mailbox — if our verification
      // loop never completed, complete it now (idempotent when already true).
      if (!existing.isVerified) {
        await userRepository.markEmailVerified(existing.id);
        logger.info(`[oauth] linked login verified previously-unverified account ${existing.username}`);
      }
      // Keep the stored avatar in step with what Google currently reports
      // (people change their picture). https-validity was checked upstream.
      if (profile.pictureUrl && profile.pictureUrl !== existing.picture) {
        await userRepository.updateGooglePicture(existing.id, profile.pictureUrl);
      }
      await startSessionFor(res, existing.id);
      logger.info(`[oauth] google login ok: ${existing.username}`);
      res.redirect(302, `${env.clientUrl.replace(/\/+$/, "")}/`);
      return;
    }

    // Fresh member — passwordless, verified through Google's mailbox proof.
    const username = await uniqueUsernameFor(profile);
    const user = await userRepository.createUser({
      username,
      email: profile.email,
      displayName: displayNameFor(profile),
      googleId: profile.sub,
      ...(profile.pictureUrl ? { picture: profile.pictureUrl } : {}),
      isVerified: true,
    });

    await startSessionFor(res, user.id);
    logger.info(`[oauth] google signup ok: ${user.username}`);
    res.redirect(302, `${env.clientUrl.replace(/\/+$/, "")}/`);
  } catch (error) {
    if (error instanceof DuplicateUserError) {
      // Race: the same email signed up with a password mid-flight — link
      // the (now existing) account instead of failing the login.
      const raced = await userRepository.findByEmail(profile.email);
      if (raced) {
        await startSessionFor(res, raced.id);
        logger.info(`[oauth] google login ok after signup race: ${raced.username}`);
        res.redirect(302, `${env.clientUrl.replace(/\/+$/, "")}/`);
        return;
      }
    }
    logger.error("[oauth] callback account resolution failed — redirecting to login");
    redirectToLogin(res, "busy");
  }
};

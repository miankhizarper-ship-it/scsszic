import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "../auth/cookies.js";
import {
  generateVerificationToken,
  isPlausibleVerificationToken,
  sha256Hex,
} from "../auth/emailVerification.js";
import { dummyVerify, hashPassword, verifyPassword } from "../auth/password.js";
import { createSessionToken, verifySessionToken } from "../auth/session.js";
import { sessionStore, userRepository } from "../auth/store.js";
import { toPublicUser } from "../auth/types.js";
import type { PublicAuthUser } from "../auth/types.js";
import {
  DuplicateUserError,
} from "../auth/userRepository.js";
import { validateLogin, validateSignup } from "../auth/validation.js";
import { sendVerificationEmail } from "../services/email/brevoMailer.js";

/**
 * Auth controller — request/response boundary for /api/auth/*.
 *
 * Security behaviours implemented here:
 *  - responses NEVER include password hashes or session internals
 *  - login failures share one generic message (no user enumeration) and burn
 *    a bcrypt compare even when the account does not exist (timing)
 *  - duplicate signups map to 409 with field-level errors
 *  - logout invalidates the SERVER-side session, not just the cookie
 *  - logs carry usernames/event names only — never passwords, hashes,
 *    cookies, or tokens
 */

/** Client-safe summary of what happened to the verification email on signup. */
interface SignupVerificationInfo {
  /** Whether the platform's verification flow is configured (Brevo creds). */
  enabled: boolean;
  /** Whether the email was actually dispatched (false → resend from /account). */
  sent: boolean;
}

/**
 * Issue a verification token for a fresh account and email the link.
 * Returns the summary embedded in the signup response; never throws —
 * an email outage degrades to `sent: false`, never a failed signup.
 */
async function issueVerificationEmail(userId: string, email: string, displayName: string): Promise<SignupVerificationInfo> {
  const { raw, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + env.emailVerificationTtlMinutes * 60_000);
  await userRepository.setEmailVerification(userId, tokenHash, expiresAt);

  const verifyUrl = `${env.clientUrl.replace(/\/+$/, "")}/verify-email?token=${raw}`;
  const outcome = await sendVerificationEmail({
    to: email,
    displayName,
    verifyUrl,
    expiryMinutes: env.emailVerificationTtlMinutes,
  });

  return { enabled: true, sent: outcome.sent };
}

/** POST /api/auth/signup — create an account and start a session. */
export async function postSignup(req: Request, res: Response): Promise<void> {
  const result = validateSignup(req.body);
  if (!result.valid) {
    res.status(400).json({ message: "Please fix the highlighted fields.", errors: result.errors });
    return;
  }

  const { displayName, username, email, password } = result.values;

  const emailTaken = await userRepository.findByEmail(email);
  if (emailTaken) {
    res.status(409).json({
      message: "Please fix the highlighted fields.",
      errors: { email: "An account with this email already exists." },
    });
    return;
  }

  const usernameTaken = await userRepository.findByUsername(username);
  if (usernameTaken) {
    res.status(409).json({
      message: "Please fix the highlighted fields.",
      errors: { username: "This username is already taken." },
    });
    return;
  }

  try {
    // When the Brevo verification flow is configured, fresh accounts start
    // UNVERIFIED and receive a 15-minute email link. Without credentials the
    // platform must keep working: accounts auto-verify (documented fallback).
    const verificationRequired = env.emailVerificationEnabled;
    const user = await userRepository.createUser({
      displayName,
      username,
      email,
      passwordHash: await hashPassword(password),
      isVerified: !verificationRequired,
    });

    let verification: SignupVerificationInfo = { enabled: false, sent: false };
    if (verificationRequired) {
      verification = await issueVerificationEmail(user.id, user.email, user.displayName);
    }

    const session = await sessionStore.create(user.id);
    setSessionCookie(res, createSessionToken(session.sessionId));

    logger.info(
      `[auth] signup ok: ${user.username} (verified=${String(user.isVerified)}, emailSent=${String(verification.sent)})`,
    );
    res.status(201).json({ user: toPublicUser(user), verification });
  } catch (error) {
    if (error instanceof DuplicateUserError) {
      // Race between the pre-checks and insert — still a clean 409.
      res.status(409).json({
        message: "Please fix the highlighted fields.",
        errors: {
          [error.field]: `An account with this ${error.field} already exists.`,
        },
      });
      return;
    }
    throw error;
  }
}

/** POST /api/auth/login — email OR username + password → session cookie. */
export async function postLogin(req: Request, res: Response): Promise<void> {
  const result = validateLogin(req.body);
  if (!result.valid) {
    res.status(400).json({ message: "Enter your details to sign in.", errors: result.errors });
    return;
  }

  const { identifier, password } = result.values;

  const user =
    (await userRepository.findByEmail(identifier)) ??
    (await userRepository.findByUsername(identifier));

  if (!user) {
    await dummyVerify(password);
    logger.info("[auth] login failed: unknown identifier");
    res.status(401).json({ message: "Invalid email/username or password." });
    return;
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    logger.info(`[auth] login failed: bad password for ${user.username}`);
    res.status(401).json({ message: "Invalid email/username or password." });
    return;
  }

  const session = await sessionStore.create(user.id);
  setSessionCookie(res, createSessionToken(session.sessionId));

  logger.info(`[auth] login ok: ${user.username}`);
  res.status(200).json({ user: toPublicUser(user) });
}

/**
 * GET /api/auth/me — current session probe used by AuthProvider on startup.
 * 200 { user } when authenticated; 401 for anonymous visitors.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Not signed in." });
    return;
  }
  res.status(200).json({ user: req.user });
}

/**
 * POST /api/auth/logout — invalidate the server-side session and clear the
 * cookie. Idempotent: signing out without a session still succeeds.
 */
export async function postLogout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const sessionId = verifySessionToken(token);

  if (sessionId) {
    await sessionStore.invalidate(sessionId);
    logger.info("[auth] logout ok: session invalidated");
  } else if (req.user) {
    logger.info("[auth] logout ok: anonymous request, cookie cleared");
  }

  clearSessionCookie(res);
  res.status(200).json({ message: "Signed out." });
}

/**
 * GET /api/auth/verify-email?token=… — the link the verification email points
 * at. Looks the user up by the sha256 hash of the raw token, rejects expired
 * links (410), flips isVerified to true, and deletes the token (single use).
 * Public by design — the token itself is the credential.
 */
export async function getVerifyEmail(req: Request, res: Response): Promise<void> {
  const raw = req.query.token;
  if (!isPlausibleVerificationToken(raw)) {
    res.status(400).json({ message: "This verification link is invalid." });
    return;
  }

  const target = await userRepository.findByVerificationTokenHash(sha256Hex(raw));
  if (!target) {
    // Unknown token = already used, already cleaned up, or fabricated —
    // one generic message for all three (no account enumeration).
    res.status(400).json({ message: "This verification link is invalid or has already been used." });
    return;
  }
  const { user, expiresAt } = target;

  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    // Clean the stale token so the record cannot be resurrected later.
    await userRepository.clearEmailVerification(user.id);
    res.status(410).json({
      message: "This verification link has expired. Sign in and request a new email from your account page.",
    });
    return;
  }

  await userRepository.markEmailVerified(user.id);
  logger.info(`[auth] email verified: ${user.username}`);
  res.status(200).json({ message: "Email verified — your account is now active." });
}

/**
 * POST /api/auth/resend-verification — signed-in, unverified users can ask
 * for a fresh link (new token, new 15-minute window; the old token dies).
 */
export async function postResendVerification(req: Request, res: Response): Promise<void> {
  const user = req.user as PublicAuthUser | undefined;
  if (!user) {
    res.status(401).json({ message: "Sign in first." });
    return;
  }

  if (!env.emailVerificationEnabled) {
    res.status(400).json({ message: "Email verification is not configured on the server." });
    return;
  }

  // Re-read the record: req.user may predate a verify that happened elsewhere.
  const current = await userRepository.findById(user.id);
  if (!current) {
    res.status(401).json({ message: "Sign in first." });
    return;
  }
  if (current.isVerified) {
    res.status(400).json({ message: "Your email is already verified." });
    return;
  }

  const outcome = await issueVerificationEmail(current.id, current.email, current.displayName);
  if (!outcome.sent) {
    logger.error(`[auth] resend verification failed for ${current.username} (mail service unavailable)`);
    res.status(502).json({
      message: "We couldn't send the email right now — please try again in a moment.",
    });
    return;
  }

  res.status(200).json({ message: `Verification email sent to ${current.email}.` });
}

/**
 * GET /api/auth/admin/ping — tiny authorization smoke test (spec §26).
 * requireAuth + requireRole("admin") prove the middleware chain; the Admin
 * CMS itself is NOT part of this phase.
 */
export async function getAdminPing(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    message: "Admin access verified.",
    user: req.user as PublicAuthUser,
  });
}

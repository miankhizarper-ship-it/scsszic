import type { Request, Response } from "express";

import { logger } from "../utils/logger.js";
import {
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "../auth/cookies.js";
import { dummyVerify, hashPassword, verifyPassword } from "../auth/password.js";
import { createSessionToken, verifySessionToken } from "../auth/session.js";
import { sessionStore, userRepository } from "../auth/store.js";
import { toPublicUser } from "../auth/types.js";
import type { PublicAuthUser } from "../auth/types.js";
import {
  DuplicateUserError,
} from "../auth/userRepository.js";
import { validateLogin, validateSignup } from "../auth/validation.js";

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
    const user = await userRepository.createUser({
      displayName,
      username,
      email,
      passwordHash: await hashPassword(password),
    });

    const session = await sessionStore.create(user.id);
    setSessionCookie(res, createSessionToken(session.sessionId));

    logger.info(`[auth] signup ok: ${user.username}`);
    res.status(201).json({ user: toPublicUser(user) });
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

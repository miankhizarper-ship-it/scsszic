import type { NextFunction, Request, Response } from "express";

import { sessionStore, userRepository } from "./store.js";
import { getUserFromToken } from "./session.js";
import { SESSION_COOKIE_NAME } from "./cookies.js";
import { clearSessionCookie } from "./cookies.js";
import { toPublicUser } from "./types.js";

/**
 * Authentication middleware.
 *
 * requireAuth  — 401 when there is no valid session; otherwise attaches the
 *                safe PublicAuthUser to req.user. Password hashes and raw
 *                records NEVER reach the request context.
 * optionalAuth — attaches req.user when a valid session exists, but never
 *                rejects anonymous visitors.
 * requireRole  — authorization gate layered AFTER requireAuth; 403 when the
 *                authenticated user lacks the role.
 *
 * A stale/garbage cookie seen by requireAuth is cleared so the client does
 * not keep presenting a dead session.
 */

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromToken(
    sessionStore,
    userRepository,
    req.cookies?.[SESSION_COOKIE_NAME],
  );

  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  req.user = toPublicUser(user);
  next();
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromToken(
    sessionStore,
    userRepository,
    req.cookies?.[SESSION_COOKIE_NAME],
  );

  if (user) {
    req.user = toPublicUser(user);
  } else if (req.cookies?.[SESSION_COOKIE_NAME]) {
    // Cookie exists but resolves to nothing (expired/revoked/unknown) —
    // clean it up so /me stays truthful and clients stop sending it.
    clearSessionCookie(res);
  }

  next();
}

/** Authorization foundation (spec §26). Usage: requireRole("admin"). */
export function requireRole(role: "member" | "admin") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }
    next();
  };
}

/**
 * requireAdmin — the single authorization gate for every /api/admin/* route
 * (Phase 9). Builds directly on the existing Phase 7 chain: it delegates to
 * requireAuth for session resolution (which answers 401 and clears a stale
 * cookie on failure), then enforces the admin role (403 for authenticated
 * non-admins).
 *
 * There is deliberately NO second authentication mechanism and no separate
 * admin session — admin authorization is server-side role checking over the
 * same signed HTTP-only session cookie.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, () => {
    // Reached only when requireAuth verified the session and set req.user.
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }
    next();
  });
}

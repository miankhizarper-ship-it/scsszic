import type { NextFunction, Request, Response } from "express";

import { sessionStore, userRepository } from "./store.js";
import { getUserFromToken } from "./session.js";
import { SESSION_COOKIE_NAME } from "./cookies.js";
import { clearSessionCookie } from "./cookies.js";
import { toAdminPermissions, toPublicUser } from "./types.js";
import type { AdminPermission, AuthUserRole } from "./types.js";

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
export function requireRole(role: AuthUserRole) {
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

/* ------------------------------------------------------------------------
 * Phase 10B — granular admin-panel authorization.
 *
 * The admin namespace is now layered:
 *
 *   requirePanelAccess                     the /admin namespace gate —
 *                                          requireAuth + role ∈ {admin,
 *                                          manage}; members stay 403.
 *   requireAdminSection                    role-only "admin-only" gate for
 *                                          the sections manage users must
 *                                          NEVER reach (users, audit,
 *                                          uploads, dashboard, ping). Runs
 *                                          after the panel gate, so the
 *                                          session is already resolved —
 *                                          exactly one DB lookup/request.
 *   requireAdminOrPermission(perm)         the per-CMS-section gate — admin
 *                                          always allowed; manage allowed
 *                                          only when the USER'S OWN
 *                                          permissions include `perm`;
 *                                          members/anon rejected.
 *
 * req.user is re-read from the session store + users collection on EVERY
 * request (requireAuth), so role/permission changes made by an admin take
 * effect on the affected account's very next request — no session
 * invalidation step, nothing cached client-side is trusted.
 * ------------------------------------------------------------------------ */

/** Admin-panel namespace gate (Phase 10B): authentication + admin|manage. */
export function requirePanelAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== "admin" && role !== "manage") {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }
    next();
  });
}

/**
 * Admin-only section gate (Phase 10B) — layered AFTER requirePanelAccess on
 * the /admin sections manage users must never reach (users, audit, uploads,
 * dashboard, ping). Same 403 envelope as requireAdmin; the generic message
 * never reveals whether the resource exists.
 */
export function requireAdminSection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "You do not have access to this resource." });
    return;
  }
  next();
}

/**
 * Per-CMS-section authorization gate (Phase 10B) — the Phase 10B spec's
 * requireAdminOrPermission("events") primitive.
 *
 *   admin                       → always allowed (permissions irrelevant)
 *   manage + user permission    → allowed
 *   manage without / member /   → 403, generic envelope, no existence leak
 *   anonymous                   → 401 when the session never resolved
 *
 * Runs after requirePanelAccess (which has already authenticated the
 * request), but stays self-sufficient so it can guard any route stack.
 */
export function requireAdminOrPermission(
  permission: AdminPermission,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    if (req.user.role === "admin") {
      next();
      return;
    }
    if (
      req.user.role === "manage" &&
      toAdminPermissions(req.user.permissions).includes(permission)
    ) {
      next();
      return;
    }
    res.status(403).json({ message: "You do not have access to this resource." });
  };
}

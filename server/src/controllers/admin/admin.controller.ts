import type { Request, Response } from "express";

import type { PublicAuthUser } from "../../auth/types.js";

/**
 * Admin API controllers (Phase 9A) — request/response boundary for
 * /api/admin/*.
 *
 * Every route mounted in admin.routes.ts is already behind requireAdmin, so
 * `req.user` is always the verified caller's PublicAuthUser. Password hashes,
 * session ids, and cookie internals never reach this layer — the same
 * guarantee as the rest of the API (Phase 7/8 conventions).
 */

/** GET /api/admin/ping — admin authorization smoke test (401/403/200). */
export function getAdminPing(req: Request, res: Response): void {
  res.status(200).json({
    message: "Admin access verified.",
    user: req.user as PublicAuthUser,
  });
}

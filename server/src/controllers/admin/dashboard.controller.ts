import type { Request, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { getAdminDashboardSnapshot } from "../../repositories/content/dashboardRepository.js";

/**
 * Admin dashboard controller (Phase 9B) — request/response boundary for
 * GET /api/admin/dashboard.
 *
 * The route layer has already enforced requireAdmin, so every request here
 * carries a verified admin session over the existing HTTP-only cookie. The
 * payload is assembled by repositories/content/dashboardRepository.ts from
 * real MongoDB counts and records — nothing is cached, faked, or padded.
 * If the database is unreachable the Phase 8 error convention applies:
 * 503 with a safe, user-presentable message (no internals leaked).
 */
export const getAdminDashboard = withErrorBoundary(
  async (_req: Request, res: Response) => {
    const data = await getAdminDashboardSnapshot();
    res.status(200).json({ data });
  },
  "admin",
);

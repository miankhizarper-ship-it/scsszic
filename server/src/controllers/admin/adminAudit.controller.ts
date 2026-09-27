import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminAuditRepository } from "../../repositories/adminAuditRepository.js";
import { adminAuditListQuerySchema, auditFieldErrors } from "../../http/auditSchemas.js";

/**
 * Admin Audit controller (Phase 9H) — read-only boundary for
 * GET /api/admin/audit. The route layer has already enforced requireAdmin,
 * so every request carries a verified admin session.
 *
 * The audit trail is WRITE-ONLY from the API's perspective: records are
 * created exclusively by the server's centralized audit logger (actor from
 * the verified session), and this controller can only LIST them — there is
 * no client path to create, edit, or delete audit records.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   errors  → 400 { message, errors } (validation)
 *             503 when the database is unreachable
 * Ordering is fixed newest-first; there is deliberately no sort parameter.
 */

/** GET /api/admin/audit — newest-first, filtered, paginated audit trail. */
export const listAdminAudit: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminAuditListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: auditFieldErrors(parsed.error) });
      return;
    }
    const result = await adminAuditRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-audit",
);

import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { slugCheckQuerySchema } from "../../http/categorySchemas.js";
import { checkSlugAvailability } from "../../repositories/content/slugAvailabilityRepository.js";

/**
 * Admin slug availability controller (Phase 10C) — GET /api/admin/slug-check.
 *
 * Read-only "check before write" helper for the CMS forms: the generated
 * slug is searched against the live collection first and, when taken, the
 * next free numbered variant is suggested. Authorization (per-section CMS
 * permission) is enforced by an inline guard in admin.routes.ts that reads
 * `?section=` — the same requireAdminOrPermission used by every CMS route.
 *
 * This endpoint NEVER creates anything; uniqueness is still guaranteed by
 * the per-collection unique indexes plus the 409 handling in each write
 * controller, so a stale check cannot produce a duplicate slug.
 */
export const getAdminSlugCheck: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = slugCheckQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid query parameters.",
        errors: Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "query", issue.message]),
        ),
      });
      return;
    }

    const { section, slug, excludeId } = parsed.data;
    const result = await checkSlugAvailability(section, slug, excludeId);
    res.status(200).json({ data: { section, ...result } });
  },
  "admin-slug-check",
);

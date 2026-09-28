import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { siteSettingsRepository } from "../../repositories/content/siteSettingsRepository.js";
import {
  settingsFieldErrors,
  siteSettingsUpdateSchema,
} from "../../http/settingsSchemas.js";
import { recordAudit } from "../../audit/auditLogger.js";

/**
 * Admin Site-settings controllers (Task 15) — request/response boundary for
 * /api/admin/settings. The route layer has already enforced
 * requireAdminSection (admin role ONLY — manage users never see or touch
 * site configuration), so every request here carries an admin session.
 *
 * Response contracts (existing API convention preserved):
 *   GET  → 200 { data: { socials, updatedAt } }
 *   PUT  → 200 { data: { socials, updatedAt } }   (replace-all semantics)
 *   400  → { message, errors } (validation)
 *   503  → database unreachable
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

/** GET /api/admin/settings — current site settings for the editor. */
export const getAdminSettings: RequestHandler = withErrorBoundary(
  async (_req: Request, res: Response) => {
    const settings = await siteSettingsRepository.get();
    res.status(200).json({ data: settings });
  },
  "admin-settings",
);

/** PUT /api/admin/settings — replace the settings payload (all links). */
export const updateAdminSettings: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = siteSettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: settingsFieldErrors(parsed.error),
      });
      return;
    }

    const settings = await siteSettingsRepository.update(parsed.data.socials);
    await recordAudit(req, {
      action: "settings.updated",
      resourceType: "settings",
      resourceId: "site",
      resourceLabel: "Site settings",
      metadata: { socialCount: settings.socials.length },
    });
    res.status(200).json({ data: settings });
  },
  "admin-settings",
);

import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminTeamRepository } from "../../repositories/content/adminTeamRepository.js";
import {
  adminTeamCreateSchema,
  adminTeamListQuerySchema,
  adminTeamUpdateSchema,
  sanitizeTeamId,
  teamFieldErrors,
} from "../../http/teamSchemas.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";

/**
 * Admin Team controllers (Phase 12) — request/response boundary for
 * /api/admin/team. The route layer has already enforced
 * requireAdminOrPermission("team"), so every request here carries a session
 * entitled to manage the team cards.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   create  → 201 { data: {...} }
 *   update  → 200 { data: {...} }
 *   delete  → 200 { data: { id, deleted: true } }
 *   errors  → 400 { message, errors } (validation)
 *             404 { message } (unknown/malformed id)
 *             503 when the database is unreachable
 *
 * Archiving a card hides it from every public surface (the public
 * repository's published-only gate) while the admin list keeps showing it.
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Team card not found.";

/** GET /api/admin/team — search/filter/sort/paginate the management table. */
export const listAdminTeam: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminTeamListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: teamFieldErrors(parsed.error) });
      return;
    }
    const result = await adminTeamRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-team",
);

/** GET /api/admin/team/:id — single card (any status), 404 when unknown. */
export const getAdminTeamCard: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeTeamId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const card = await adminTeamRepository.getById(id);
    if (!card) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: card });
  },
  "admin-team",
);

/** POST /api/admin/team — create a card (published cards go live immediately). */
export const createAdminTeamCard: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminTeamCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: teamFieldErrors(parsed.error) });
      return;
    }

    const card = await adminTeamRepository.create(parsed.data);
    await recordAudit(req, {
      action: "team.created",
      resourceType: "team",
      resourceId: card.id,
      resourceLabel: card.name,
      metadata: { group: card.group, status: card.status },
    });
    res.status(201).json({ data: card });
  },
  "admin-team",
);

/** PATCH /api/admin/team/:id — partial update with the same guarantees. */
export const updateAdminTeamCard: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeTeamId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminTeamUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: teamFieldErrors(parsed.error) });
      return;
    }

    const card = await adminTeamRepository.update(id, parsed.data);
    if (!card) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "team.updated",
      resourceType: "team",
      resourceId: card.id,
      resourceLabel: card.name,
      metadata: { fields: changedFields(parsed.data) },
    });
    res.status(200).json({ data: card });
  },
  "admin-team",
);

/** DELETE /api/admin/team/:id — explicit single-record deletion. */
export const deleteAdminTeamCard: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeTeamId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminTeamRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminTeamRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "team.deleted",
      resourceType: "team",
      resourceId: id,
      resourceLabel: existing.name,
      metadata: { group: existing.group },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-team",
);

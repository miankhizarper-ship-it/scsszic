import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminAlumniRepository } from "../../repositories/content/adminAlumniRepository.js";
import {
  adminAlumniCreateSchema,
  adminAlumniListQuerySchema,
  adminAlumniUpdateSchema,
  alumniFieldErrors,
  sanitizeAlumniId,
} from "../../http/alumniSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";

/**
 * Admin Alumni controllers (Phase 9E) — request/response boundary for
 * /api/admin/alumni. The route layer has already enforced requireAdmin, so
 * every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate username)
 *             503 when the database is unreachable
 *
 * There is deliberately NO status endpoint: the alumni model has no
 * status/lifecycle field (every alumnus is public — Phase 2 behavior).
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Alumni profile not found.";
const DUPLICATE =
  "An alumni profile with this username already exists.";
const DUPLICATE_FIELD = "This username is already taken — choose another.";

/** GET /api/admin/alumni — search/filter/sort/paginate the management table. */
export const listAdminAlumni: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminAlumniListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: alumniFieldErrors(parsed.error) });
      return;
    }
    const result = await adminAlumniRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-alumni",
);

/** GET /api/admin/alumni/:id — single profile, 404 when unknown. */
export const getAdminAlumnus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAlumniId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const alumnus = await adminAlumniRepository.getById(id);
    if (!alumnus) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: alumnus });
  },
  "admin-alumni",
);

/** POST /api/admin/alumni — create; duplicate usernames → 409 with field error. */
export const createAdminAlumnus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminAlumniCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: alumniFieldErrors(parsed.error) });
      return;
    }

    // Task 16 — the admin forms no longer send a username: the backend
    // derives a unique handle from the name (collisions become -2 variants).
    const username =
      parsed.data.username ?? (await generateUniqueHandle("alumni", parsed.data.name));

    if (await adminAlumniRepository.usernameExists(username)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { username: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const alumnus = await adminAlumniRepository.create({ ...parsed.data, username });
      await recordAudit(req, {
        action: "alumni.created",
        resourceType: "alumnus",
        resourceId: alumnus.id,
        resourceLabel: alumnus.name,
        metadata: { username: alumnus.username },
      });
      res.status(201).json({ data: alumnus });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { username: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-alumni",
);

/** PATCH /api/admin/alumni/:id — partial update with the same guarantees. */
export const updateAdminAlumnus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAlumniId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminAlumniUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: alumniFieldErrors(parsed.error) });
      return;
    }

    if (parsed.data.username && (await adminAlumniRepository.usernameExists(parsed.data.username, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { username: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const alumnus = await adminAlumniRepository.update(id, parsed.data);
      if (!alumnus) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "alumni.updated",
        resourceType: "alumnus",
        resourceId: alumnus.id,
        resourceLabel: alumnus.name,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: alumnus });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { username: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-alumni",
);

/** DELETE /api/admin/alumni/:id — explicit single-record deletion. */
export const deleteAdminAlumnus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAlumniId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminAlumniRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminAlumniRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "alumni.deleted",
      resourceType: "alumnus",
      resourceId: id,
      resourceLabel: existing.name,
      metadata: { username: existing.username },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-alumni",
);

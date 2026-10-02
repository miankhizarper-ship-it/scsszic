import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminEventsRepository } from "../../repositories/content/adminEventsRepository.js";
import {
  adminEventCreateSchema,
  adminEventListQuerySchema,
  adminEventStatusSchema,
  adminEventUpdateSchema,
  eventFieldErrors,
  sanitizeEventId,
} from "../../http/eventSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";
import {
  removeEventMedia,
  syncEventMedia,
  type EventMediaSyncResult,
} from "../../repositories/content/eventMediaSync.js";

/** Scalar-only audit metadata for one event media sync pass (Task 33). */
function mediaSyncMetadata(media: EventMediaSyncResult): Record<string, string | number> {
  return {
    mediaAlbum: media.album,
    mediaVideosAdded: media.videosCreated,
    mediaVideosUpdated: media.videosUpdated,
    mediaVideosRemoved: media.videosRemoved,
  };
}

/**
 * Admin Events controllers (Phase 9C) — request/response boundary for
 * /api/admin/events. The route layer has already enforced requireAdmin, so
 * every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate slug)
 *             503 when the database is unreachable
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Event not found.";

/** GET /api/admin/events — search/filter/sort/paginate the management table. */
export const listAdminEvents: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminEventListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: eventFieldErrors(parsed.error) });
      return;
    }
    const result = await adminEventsRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-events",
);

/** GET /api/admin/events/:id — single event (any status), 404 when unknown. */
export const getAdminEvent: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeEventId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const event = await adminEventsRepository.getById(id);
    if (!event) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: event });
  },
  "admin-events",
);

/** POST /api/admin/events — create; duplicate slugs → 409 with field error. */
export const createAdminEvent: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminEventCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: eventFieldErrors(parsed.error) });
      return;
    }

    // Task 16 — the admin forms no longer send a slug: the backend derives
    // a unique handle from the title (collisions become clean -2 variants).
    const slug = parsed.data.slug ?? (await generateUniqueHandle("events", parsed.data.title));

    if (await adminEventsRepository.slugExists(slug)) {
      res.status(409).json({
        message: "An event with this slug already exists.",
        errors: { slug: "This slug is already taken — choose another." },
      });
      return;
    }

    try {
      const event = await adminEventsRepository.create({ ...parsed.data, slug });
      // Task 33 — keep the derived gallery album + watch recordings in step
      // with the event's media (never fails the save; failures are logged
      // and show up as mediaAlbum: "failed" in the audit trail).
      const media = await syncEventMedia(event);
      await recordAudit(req, {
        action: "event.created",
        resourceType: "event",
        resourceId: event.id,
        resourceLabel: event.title,
        metadata: { slug: event.slug, status: event.status, ...mediaSyncMetadata(media) },
      });
      res.status(201).json({ data: event });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: "An event with this slug already exists.",
          errors: { slug: "This slug is already taken — choose another." },
        });
        return;
      }
      throw error;
    }
  },
  "admin-events",
);

/** PATCH /api/admin/events/:id — partial update with the same guarantees. */
export const updateAdminEvent: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeEventId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminEventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: eventFieldErrors(parsed.error) });
      return;
    }

    if (parsed.data.slug && (await adminEventsRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: "An event with this slug already exists.",
        errors: { slug: "This slug is already taken — choose another." },
      });
      return;
    }

    try {
      const existing = await adminEventsRepository.getById(id);
      if (!existing) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      const event = await adminEventsRepository.update(id, parsed.data);
      if (!event) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      // Task 33 — media sync after every save; a changed slug re-points the
      // derived album/videos first so they update instead of duplicating.
      const media = await syncEventMedia(event, { previousSlug: existing.slug });
      await recordAudit(req, {
        action: "event.updated",
        resourceType: "event",
        resourceId: event.id,
        resourceLabel: event.title,
        metadata: {
          fields: changedFields(parsed.data),
          ...mediaSyncMetadata(media),
        },
      });
      res.status(200).json({ data: event });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: "An event with this slug already exists.",
          errors: { slug: "This slug is already taken — choose another." },
        });
        return;
      }
      throw error;
    }
  },
  "admin-events",
);

/** PATCH /api/admin/events/:id/status — safe lifecycle transition. */
export const updateAdminEventStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeEventId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminEventStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: eventFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminEventsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const event = await adminEventsRepository.updateStatus(id, parsed.data.status);
    if (!event) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "event.status.updated",
      resourceType: "event",
      resourceId: event.id,
      resourceLabel: event.title,
      metadata: { from: existing.status, to: event.status },
    });
    res.status(200).json({ data: event });
  },
  "admin-events",
);

/** DELETE /api/admin/events/:id — explicit single-record deletion. */
export const deleteAdminEvent: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeEventId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminEventsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminEventsRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    // Task 33 — the event's DERIVED album/recordings go with it; admin-made
    // albums/videos that merely link the event are never touched.
    const media = await removeEventMedia(existing.slug);
    await recordAudit(req, {
      action: "event.deleted",
      resourceType: "event",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: {
        slug: existing.slug,
        mediaAlbumRemoved: media.albumRemoved,
        mediaVideosRemoved: media.videosRemoved,
      },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-events",
);

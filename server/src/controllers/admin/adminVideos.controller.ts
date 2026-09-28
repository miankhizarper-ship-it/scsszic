import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminVideosRepository } from "../../repositories/content/adminVideosRepository.js";
import {
  adminVideoCreateSchema,
  adminVideoListQuerySchema,
  adminVideoStatusSchema,
  adminVideoUpdateSchema,
  sanitizeVideoId,
  videoFieldErrors,
} from "../../http/videoSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";
import { collections } from "../../db/collections.js";

/**
 * Admin Videos (Watch) controllers (Phase 9G) — request/response boundary
 * for /api/admin/videos. The route layer has already enforced requireAdmin,
 * so every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation / unknown references)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate slug)
 *             503 when the database is unreachable
 *
 * Reference integrity (no dangling references): video eventSlug is checked
 * against the events collection before persistence. Existence (any status)
 * is the rule — visibility filtering stays the public repositories' read-
 * time concern. Referenced events are never modified.
 *
 * Media/source fields are existing references (no upload/transcoding
 * infrastructure exists — spec §7/§9): thumbnail/videoUrl/embedUrl are
 * format-validated by the schema; the internal numeric durationMinutes is
 * derived server-side from the editorial duration string and never
 * accepted from clients.
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Video not found.";
const DUPLICATE = "A video with this slug already exists.";
const DUPLICATE_FIELD = "This slug is already taken — choose another.";

/** Event slugs that do not exist. */
async function unknownEventSlugs(slugs: string[]): Promise<string[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await collections
    .events()
    .find({ slug: { $in: unique } }, { projection: { slug: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.slug));
  return unique.filter((slug) => !known.has(slug));
}

/** Builds the 400 body when video references don't resolve. */
async function videoReferenceErrors(input: {
  eventSlug?: string;
}): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};

  if (input.eventSlug) {
    const missingEvents = await unknownEventSlugs([input.eventSlug]);
    if (missingEvents.length > 0) {
      errors.eventSlug = `Unknown event reference: ${input.eventSlug}.`;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** GET /api/admin/videos — search/filter/sort/paginate the management table. */
export const listAdminVideos: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminVideoListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: videoFieldErrors(parsed.error) });
      return;
    }
    const result = await adminVideosRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-videos",
);

/** GET /api/admin/videos/:id — single video (any status), 404 when unknown. */
export const getAdminVideo: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeVideoId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const video = await adminVideosRepository.getById(id);
    if (!video) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: video });
  },
  "admin-videos",
);

/** POST /api/admin/videos — create; dangling refs → 400, duplicate slug → 409. */
export const createAdminVideo: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminVideoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: videoFieldErrors(parsed.error) });
      return;
    }

    // Field-level reference validation runs BEFORE the slug conflict check
    // so a payload with both problems reports the validation error (400).
    const refErrors = await videoReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    // Task 16 — the admin forms no longer send a slug: the backend derives
    // a unique handle from the title (collisions become clean -2 variants).
    const slug = parsed.data.slug ?? (await generateUniqueHandle("videos", parsed.data.title));

    if (await adminVideosRepository.slugExists(slug)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const video = await adminVideosRepository.create({ ...parsed.data, slug });
      await recordAudit(req, {
        action: "video.created",
        resourceType: "video",
        resourceId: video.id,
        resourceLabel: video.title,
        metadata: { slug: video.slug, status: video.status },
      });
      res.status(201).json({ data: video });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { slug: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-videos",
);

/** PATCH /api/admin/videos/:id — partial update with the same guarantees. */
export const updateAdminVideo: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeVideoId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminVideoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: videoFieldErrors(parsed.error) });
      return;
    }

    const refErrors = await videoReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (parsed.data.slug && (await adminVideosRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const video = await adminVideosRepository.update(id, parsed.data);
      if (!video) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "video.updated",
        resourceType: "video",
        resourceId: video.id,
        resourceLabel: video.title,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: video });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { slug: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-videos",
);

/** PATCH /api/admin/videos/:id/status — safe lifecycle transition. */
export const updateAdminVideoStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeVideoId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminVideoStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: videoFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminVideosRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const video = await adminVideosRepository.updateStatus(id, parsed.data.status);
    if (!video) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "video.status.updated",
      resourceType: "video",
      resourceId: video.id,
      resourceLabel: video.title,
      metadata: { from: existing.status, to: video.status },
    });
    res.status(200).json({ data: video });
  },
  "admin-videos",
);

/** DELETE /api/admin/videos/:id — explicit single-record deletion. */
export const deleteAdminVideo: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeVideoId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminVideosRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminVideosRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "video.deleted",
      resourceType: "video",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: { slug: existing.slug },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-videos",
);

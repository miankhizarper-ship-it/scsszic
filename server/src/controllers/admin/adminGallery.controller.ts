import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminGalleryRepository } from "../../repositories/content/adminGalleryRepository.js";
import {
  adminGalleryCreateSchema,
  adminGalleryListQuerySchema,
  adminGalleryStatusSchema,
  adminGalleryUpdateSchema,
  galleryFieldErrors,
  sanitizeGalleryId,
} from "../../http/gallerySchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { collections } from "../../db/collections.js";

/**
 * Admin Gallery controllers (Phase 9G) — request/response boundary for
 * /api/admin/gallery. The route layer has already enforced requireAdmin,
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
 * Reference integrity (no dangling references): album eventSlug is checked
 * against the events collection before persistence. Existence (any status)
 * is the rule — visibility filtering stays the public repositories' read-
 * time concern. Referenced events are never modified. Embedded photos are
 * part of the album document itself; their media references are format-
 * validated by the schema (no upload infrastructure exists — the CMS
 * manages references to media that already exists).
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Album not found.";
const DUPLICATE = "An album with this slug already exists.";
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

/** Builds the 400 body when album references don't resolve. */
async function albumReferenceErrors(input: {
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

/** GET /api/admin/gallery — search/filter/sort/paginate the management table. */
export const listAdminGallery: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminGalleryListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: galleryFieldErrors(parsed.error) });
      return;
    }
    const result = await adminGalleryRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-gallery",
);

/** GET /api/admin/gallery/:id — single album (any status), 404 when unknown. */
export const getAdminAlbum: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeGalleryId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const album = await adminGalleryRepository.getById(id);
    if (!album) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: album });
  },
  "admin-gallery",
);

/** POST /api/admin/gallery — create; dangling refs → 400, duplicate slug → 409. */
export const createAdminAlbum: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminGalleryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: galleryFieldErrors(parsed.error) });
      return;
    }

    // Field-level reference validation runs BEFORE the slug conflict check
    // so a payload with both problems reports the validation error (400).
    const refErrors = await albumReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (await adminGalleryRepository.slugExists(parsed.data.slug)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const album = await adminGalleryRepository.create(parsed.data);
      await recordAudit(req, {
        action: "gallery.created",
        resourceType: "album",
        resourceId: album.id,
        resourceLabel: album.title,
        metadata: { slug: album.slug, status: album.status },
      });
      res.status(201).json({ data: album });
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
  "admin-gallery",
);

/** PATCH /api/admin/gallery/:id — partial update with the same guarantees. */
export const updateAdminAlbum: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeGalleryId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminGalleryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: galleryFieldErrors(parsed.error) });
      return;
    }

    const refErrors = await albumReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (parsed.data.slug && (await adminGalleryRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const album = await adminGalleryRepository.update(id, parsed.data);
      if (!album) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "gallery.updated",
        resourceType: "album",
        resourceId: album.id,
        resourceLabel: album.title,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: album });
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
  "admin-gallery",
);

/** PATCH /api/admin/gallery/:id/status — safe lifecycle transition. */
export const updateAdminAlbumStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeGalleryId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminGalleryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: galleryFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminGalleryRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const album = await adminGalleryRepository.updateStatus(id, parsed.data.status);
    if (!album) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "gallery.status.updated",
      resourceType: "album",
      resourceId: album.id,
      resourceLabel: album.title,
      metadata: { from: existing.status, to: album.status },
    });
    res.status(200).json({ data: album });
  },
  "admin-gallery",
);

/** DELETE /api/admin/gallery/:id — explicit single-record deletion. */
export const deleteAdminAlbum: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeGalleryId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminGalleryRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminGalleryRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "gallery.deleted",
      resourceType: "album",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: { slug: existing.slug },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-gallery",
);

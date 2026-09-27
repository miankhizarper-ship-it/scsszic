import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminFeedRepository } from "../../repositories/content/adminFeedRepository.js";
import {
  adminFeedCreateSchema,
  adminFeedListQuerySchema,
  adminFeedStatusSchema,
  adminFeedUpdateSchema,
  feedFieldErrors,
  sanitizeFeedId,
  type AdminFeedCreateInput,
} from "../../http/feedSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { collections } from "../../db/collections.js";
import type { Collection } from "mongodb";

/**
 * Admin Feed controllers (Phase 9F) — request/response boundary for
 * /api/admin/feed. The route layer has already enforced requireAdmin, so
 * every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation / unknown references)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate slug)
 *             503 when the database is unreachable
 *
 * The five existing post types are preserved exactly, including their
 * type-specific reference conventions (project posts → projectSlug, event
 * posts → eventSlug, article posts → blogSlug — enforced by the create
 * schema's superRefine and re-validated on the MERGED record at update).
 *
 * Reference integrity (no dangling references): authorUsername,
 * projectSlug, eventSlug, and blogSlug are checked against the members,
 * projects, events, and blogs collections before persistence. Existence
 * (any lifecycle state) is the rule — visibility filtering stays the
 * public repositories' read-time concern, exactly as the existing
 * enrichment architecture already treats it (unknown/hidden refs are
 * simply omitted from public cards). Referenced records are never
 * modified.
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Feed post not found.";
const DUPLICATE = "A feed post with this slug already exists.";
const DUPLICATE_FIELD = "This slug is already taken — choose another.";

/** Member usernames that do not exist (any status counts as existing). */
async function unknownMemberUsernames(usernames: string[]): Promise<string[]> {
  const unique = [...new Set(usernames.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await collections
    .members()
    .find({ username: { $in: unique } }, { projection: { username: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.username));
  return unique.filter((username) => !known.has(username));
}

/** Slugs that do not exist in the given collection. */
async function unknownSlugs<T extends { slug: string }>(
  getCollection: () => Collection<T>,
  slugs: string[],
): Promise<string[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await getCollection()
    .find({ slug: { $in: unique } } as never, { projection: { slug: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.slug));
  return unique.filter((slug) => !known.has(slug));
}

/** Builds the 400 body when feed references don't resolve. */
async function feedReferenceErrors(input: {
  authorUsername?: string;
  projectSlug?: string;
  eventSlug?: string;
  blogSlug?: string;
}): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};

  if (input.authorUsername) {
    const missing = await unknownMemberUsernames([input.authorUsername]);
    if (missing.length > 0) {
      errors.authorUsername = `Unknown member reference: ${input.authorUsername}.`;
    }
  }
  if (input.projectSlug) {
    const missing = await unknownSlugs(collections.projects, [input.projectSlug]);
    if (missing.length > 0) {
      errors.projectSlug = `Unknown project reference: ${input.projectSlug}.`;
    }
  }
  if (input.eventSlug) {
    const missing = await unknownSlugs(collections.events, [input.eventSlug]);
    if (missing.length > 0) {
      errors.eventSlug = `Unknown event reference: ${input.eventSlug}.`;
    }
  }
  if (input.blogSlug) {
    const missing = await unknownSlugs(collections.blogs, [input.blogSlug]);
    if (missing.length > 0) {
      errors.blogSlug = `Unknown blog reference: ${input.blogSlug}.`;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** GET /api/admin/feed — search/filter/sort/paginate the management table. */
export const listAdminFeed: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminFeedListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: feedFieldErrors(parsed.error) });
      return;
    }
    const result = await adminFeedRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-feed",
);

/** GET /api/admin/feed/:id — single post (any status), 404 when unknown. */
export const getAdminFeedPost: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeFeedId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const post = await adminFeedRepository.getById(id);
    if (!post) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: post });
  },
  "admin-feed",
);

/** POST /api/admin/feed — create; dangling refs → 400, duplicate slug → 409. */
export const createAdminFeedPost: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminFeedCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: feedFieldErrors(parsed.error) });
      return;
    }

    // Field-level reference validation runs BEFORE the slug conflict check
    // so a payload with both problems reports the validation error (400).
    const refErrors = await feedReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (await adminFeedRepository.slugExists(parsed.data.slug)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const post = await adminFeedRepository.create(parsed.data);
      await recordAudit(req, {
        action: "feed.created",
        resourceType: "post",
        resourceId: post.id,
        resourceLabel: post.title,
        metadata: { slug: post.slug, status: post.status },
      });
      res.status(201).json({ data: post });
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
  "admin-feed",
);

/** PATCH /api/admin/feed/:id — partial update with the same guarantees. */
export const updateAdminFeedPost: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeFeedId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminFeedUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: feedFieldErrors(parsed.error) });
      return;
    }

    // Type-specific invariants on the MERGED record — a post can never end
    // up as a project/event/article type without its required reference.
    const existing = await adminFeedRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const merged = { ...existing, ...parsed.data };
    const mergedType = merged.type as AdminFeedCreateInput["type"];
    if (
      (mergedType === "project" && !merged.projectSlug) ||
      (mergedType === "event" && !merged.eventSlug) ||
      (mergedType === "article" && !merged.blogSlug)
    ) {
      const field = mergedType === "project" ? "projectSlug" : mergedType === "event" ? "eventSlug" : "blogSlug";
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: { [field]: `${mergedType[0].toUpperCase()}${mergedType.slice(1)} posts must reference a ${mergedType === "article" ? "blog article" : mergedType}.` },
      });
      return;
    }

    const refErrors = await feedReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (parsed.data.slug && (await adminFeedRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const post = await adminFeedRepository.update(id, parsed.data);
      if (!post) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "feed.updated",
        resourceType: "post",
        resourceId: post.id,
        resourceLabel: post.title,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: post });
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
  "admin-feed",
);

/** PATCH /api/admin/feed/:id/status — safe published/archived transition. */
export const updateAdminFeedPostStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeFeedId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminFeedStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: feedFieldErrors(parsed.error) });
      return;
    }

    const existingStatus = await adminFeedRepository.getById(id);
    if (!existingStatus) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const post = await adminFeedRepository.updateStatus(id, parsed.data.status);
    if (!post) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "feed.status.updated",
      resourceType: "post",
      resourceId: post.id,
      resourceLabel: post.title,
      metadata: { from: existingStatus.status, to: post.status },
    });
    res.status(200).json({ data: post });
  },
  "admin-feed",
);

/** DELETE /api/admin/feed/:id — explicit single-record deletion. */
export const deleteAdminFeedPost: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeFeedId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminFeedRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminFeedRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "feed.deleted",
      resourceType: "post",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: { slug: existing.slug },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-feed",
);

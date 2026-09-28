import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminBlogsRepository } from "../../repositories/content/adminBlogsRepository.js";
import {
  adminBlogCreateSchema,
  adminBlogListQuerySchema,
  adminBlogStatusSchema,
  adminBlogUpdateSchema,
  blogFieldErrors,
  sanitizeBlogId,
} from "../../http/blogSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";

/**
 * Admin Blogs controllers (Phase 9D) — request/response boundary for
 * /api/admin/blogs. The route layer has already enforced requireAdmin, so
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
 * Raw Mongo errors and stack traces NEVER reach clients. The publication
 * lifecycle semantics (draft/published/archived) are validated here and
 * persisted as-is — no silent conversion of existing content.
 */

const NOT_FOUND = "Blog not found.";

/** GET /api/admin/blogs — search/filter/sort/paginate the management table. */
export const listAdminBlogs: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminBlogListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: blogFieldErrors(parsed.error) });
      return;
    }
    const result = await adminBlogsRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-blogs",
);

/** GET /api/admin/blogs/:id — single blog (any status), 404 when unknown. */
export const getAdminBlog: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeBlogId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const blog = await adminBlogsRepository.getById(id);
    if (!blog) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: blog });
  },
  "admin-blogs",
);

/** POST /api/admin/blogs — create; duplicate slugs → 409 with field error. */
export const createAdminBlog: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminBlogCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: blogFieldErrors(parsed.error) });
      return;
    }

    // Task 16 — the admin forms no longer send a slug: the backend derives
    // a unique handle from the title (collisions become clean -2 variants).
    const slug = parsed.data.slug ?? (await generateUniqueHandle("blogs", parsed.data.title));

    if (await adminBlogsRepository.slugExists(slug)) {
      res.status(409).json({
        message: "A blog with this slug already exists.",
        errors: { slug: "This slug is already taken — choose another." },
      });
      return;
    }

    try {
      const blog = await adminBlogsRepository.create({ ...parsed.data, slug });
      await recordAudit(req, {
        action: "blog.created",
        resourceType: "blog",
        resourceId: blog.id,
        resourceLabel: blog.title,
        metadata: { slug: blog.slug, status: blog.status },
      });
      res.status(201).json({ data: blog });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: "A blog with this slug already exists.",
          errors: { slug: "This slug is already taken — choose another." },
        });
        return;
      }
      throw error;
    }
  },
  "admin-blogs",
);

/** PATCH /api/admin/blogs/:id — partial update with the same guarantees. */
export const updateAdminBlog: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeBlogId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminBlogUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: blogFieldErrors(parsed.error) });
      return;
    }

    if (parsed.data.slug && (await adminBlogsRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: "A blog with this slug already exists.",
        errors: { slug: "This slug is already taken — choose another." },
      });
      return;
    }

    try {
      const blog = await adminBlogsRepository.update(id, parsed.data);
      if (!blog) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "blog.updated",
        resourceType: "blog",
        resourceId: blog.id,
        resourceLabel: blog.title,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: blog });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: "A blog with this slug already exists.",
          errors: { slug: "This slug is already taken — choose another." },
        });
        return;
      }
      throw error;
    }
  },
  "admin-blogs",
);

/** PATCH /api/admin/blogs/:id/status — draft/published/archived transition. */
export const updateAdminBlogStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeBlogId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminBlogStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: blogFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminBlogsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const blog = await adminBlogsRepository.updateStatus(id, parsed.data.status);
    if (!blog) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "blog.status.updated",
      resourceType: "blog",
      resourceId: blog.id,
      resourceLabel: blog.title,
      metadata: { from: existing.status, to: blog.status },
    });
    res.status(200).json({ data: blog });
  },
  "admin-blogs",
);

/** DELETE /api/admin/blogs/:id — explicit single-record deletion. */
export const deleteAdminBlog: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeBlogId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminBlogsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminBlogsRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "blog.deleted",
      resourceType: "blog",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: { slug: existing.slug },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-blogs",
);

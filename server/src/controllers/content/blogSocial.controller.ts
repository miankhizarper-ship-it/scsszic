import type { RequestHandler } from "express";

import {
  blogCommentCreateSchema,
  blogSocialFieldErrors,
} from "../../http/blogSocialSchemas.js";
import {
  BlogNotFoundError,
  blogSocialRepository,
} from "../../repositories/content/blogSocialRepository.js";
import { withErrorBoundary } from "./content.controller.js";

/**
 * Blog social controllers — the comment thread on published articles (Task 30).
 *
 * Response contracts follow the API convention:
 *   200/201 { data } · 400 { message, errors } · 401 · 404 { message }
 *
 * Authorization (wired in routes):
 *   GET  /api/blogs/:slug/comments   public — anyone can read the thread
 *   POST /api/blogs/:slug/comments   requireAuth — any signed-in account
 *                                    (user, member, manage, admin) may join
 *
 * The repository already emits the SAFE comment projection (id, author,
 * body, createdAt) — no account internals cross this boundary.
 */

/** GET /api/blogs/:slug/comments — the full thread, oldest first. */
export const listBlogComments: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const raw = req.params.slug;
    const slug = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().toLowerCase();
    if (!slug) {
      res.status(404).json({ message: "Article not found" });
      return;
    }

    try {
      const comments = await blogSocialRepository.listComments(slug);
      res.status(200).json({ data: comments, meta: { count: comments.length } });
    } catch (error) {
      if (error instanceof BlogNotFoundError) {
        res.status(404).json({ message: "Article not found" });
        return;
      }
      throw error;
    }
  },
  "blog-comments-list",
);

/** POST /api/blogs/:slug/comments — add a comment as the signed-in viewer. */
export const addBlogComment: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const raw = req.params.slug;
    const slug = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().toLowerCase();
    if (!slug) {
      res.status(404).json({ message: "Article not found" });
      return;
    }

    const parsed = blogCommentCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid comment.", errors: blogSocialFieldErrors(parsed.error) });
      return;
    }

    try {
      const comment = await blogSocialRepository.addComment(
        slug,
        req.user!,
        parsed.data.body,
      );
      res.status(201).json({ data: comment });
    } catch (error) {
      if (error instanceof BlogNotFoundError) {
        res.status(404).json({ message: "Article not found" });
        return;
      }
      throw error;
    }
  },
  "blog-comments-add",
);

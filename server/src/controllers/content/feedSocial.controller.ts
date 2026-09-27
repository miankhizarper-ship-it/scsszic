import type { RequestHandler } from "express";

import {
  feedCommentCreateSchema,
  feedSocialFieldErrors,
  parseViewerStateIds,
} from "../../http/feedSocialSchemas.js";
import { sanitizeFeedId } from "../../http/feedSchemas.js";
import {
  FeedPostNotFoundError,
  feedSocialRepository,
} from "../../repositories/content/feedSocialRepository.js";
import { withErrorBoundary } from "./content.controller.js";

/**
 * Feed social controllers — like toggling + comments on published posts.
 *
 * Response contracts follow the API convention:
 *   200/201 { data } · 400 { message, errors } · 401 · 404 { message }
 *
 * Authorization:
 *   GET  viewer-state  optionalAuth (anonymous → empty likedIds)
 *   POST like          requireAuth (wired in routes)
 *   GET  comments      public
 *   POST comments      requireAuth (wired in routes)
 *
 * The repository already emits the SAFE comment projection (id, author,
 * body, createdAt) — no account internals cross this boundary.
 */

/**
 * GET /api/feed/viewer-state?ids=a,b,c — batched per-viewer like state for
 * a page of posts (ONE request per page, never per card). Anonymous
 * visitors receive an empty likedIds list.
 */
export const getFeedViewerState: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const ids = parseViewerStateIds(typeof req.query.ids === "string" ? req.query.ids : "");
    if (!ids) {
      res.status(400).json({ message: "Invalid post ids." });
      return;
    }

    const user = req.user;
    const likedIds = user ? await feedSocialRepository.likedIdsFor(ids, user.id) : [];
    res.status(200).json({ data: { likedIds } });
  },
  "feed-viewer-state",
);

/** POST /api/feed/:id/like — toggle the signed-in viewer's like. */
export const toggleFeedLike: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const postId = sanitizeFeedId(req.params.id);
    if (!postId) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    try {
      const result = await feedSocialRepository.toggleLike(postId, req.user!.id);
      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof FeedPostNotFoundError) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      throw error;
    }
  },
  "feed-like",
);

/** GET /api/feed/:id/comments — the full thread, oldest first. */
export const listFeedComments: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const postId = sanitizeFeedId(req.params.id);
    if (!postId) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    try {
      const comments = await feedSocialRepository.listComments(postId);
      res.status(200).json({ data: comments, meta: { count: comments.length } });
    } catch (error) {
      if (error instanceof FeedPostNotFoundError) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      throw error;
    }
  },
  "feed-comments-list",
);

/** POST /api/feed/:id/comments — add a comment as the signed-in viewer. */
export const addFeedComment: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const postId = sanitizeFeedId(req.params.id);
    if (!postId) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const parsed = feedCommentCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid comment.", errors: feedSocialFieldErrors(parsed.error) });
      return;
    }

    try {
      const comment = await feedSocialRepository.addComment(
        postId,
        req.user!,
        parsed.data.body,
      );
      res.status(201).json({ data: comment });
    } catch (error) {
      if (error instanceof FeedPostNotFoundError) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      throw error;
    }
  },
  "feed-comments-add",
);

import type { Filter } from "mongodb";

import { randomUUID } from "node:crypto";

import { collections, type BlogCommentDoc, type BlogDoc } from "../../db/collections.js";
import { isConnectionError } from "../../db/errors.js";
import type { PublicAuthUser } from "../../auth/types.js";

/**
 * Blog social repository — real comments on published articles (Task 30).
 *
 * Mirrors the feed social model: seeded article data is never mutated, real
 * conversation lives in its own `blog_comments` collection keyed by the
 * article's URL slug. The publication gate is enforced in the query layer —
 * comments can only be listed on or attached to `status: "published"`
 * articles, so drafts/archived posts accept no engagement (spec §13), and
 * deactivating an article instantly freezes its thread.
 */

export class BlogNotFoundError extends Error {
  constructor() {
    super("Article not found");
    this.name = "BlogNotFoundError";
  }
}

export class BlogSocialError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "BlogSocialError";
    this.code = code;
  }
}

/** Domain shape of an article comment as the API emits it (safe projection). */
export interface BlogComment {
  /** Stable comment id — the client uses it as the React list key. */
  id: string;
  blogSlug: string;
  /** Account username at posting time (may resolve to a profile link). */
  authorUsername: string;
  /** Display-name snapshot — stays readable even if the account changes. */
  authorName: string;
  body: string;
  createdAt: string;
}

function toComment(doc: BlogCommentDoc): BlogComment {
  return {
    id: doc._id,
    blogSlug: doc.blogSlug,
    authorUsername: doc.authorUsername,
    authorName: doc.authorName,
    body: doc.body,
    createdAt: doc.createdAt,
  };
}

/** Published-article visibility gate — drafts/archives accept no comments. */
function publishedFilter(blogSlug: string): Filter<BlogDoc> {
  return { slug: blogSlug, status: "published" };
}

class BlogSocialRepository {
  /** Comment thread for one article — oldest first (conversation order). */
  async listComments(blogSlug: string): Promise<BlogComment[]> {
    const exists = await collections
      .blogs()
      .countDocuments(publishedFilter(blogSlug), { limit: 1 });
    if (exists === 0) {
      throw new BlogNotFoundError();
    }
    const docs = await collections
      .blogComments()
      .find({ blogSlug })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return docs.map(toComment);
  }

  /**
   * Append a comment to a published article. Author identity comes from the
   * verified session — NEVER from the request body. Any signed-in account
   * (user / member / manage / admin) may join; the route layer gates that.
   */
  async addComment(
    blogSlug: string,
    user: PublicAuthUser,
    body: string,
  ): Promise<BlogComment> {
    const exists = await collections
      .blogs()
      .countDocuments(publishedFilter(blogSlug), { limit: 1 });
    if (exists === 0) {
      throw new BlogNotFoundError();
    }

    const now = new Date();
    const doc: BlogCommentDoc = {
      _id: randomUUID(),
      blogSlug,
      userId: user.id,
      authorUsername: user.username,
      authorName: user.displayName,
      body,
      createdAt: now.toISOString(),
    };
    try {
      await collections.blogComments().insertOne(doc);
    } catch (error) {
      if (isConnectionError(error)) throw error;
      throw new BlogSocialError(
        "STORE_FAILED",
        "The comment could not be saved. Please try again.",
      );
    }
    return toComment(doc);
  }
}

export const blogSocialRepository = new BlogSocialRepository();

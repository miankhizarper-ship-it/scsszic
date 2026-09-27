import type { Filter } from "mongodb";

import { randomUUID } from "node:crypto";

import { collections, type FeedCommentDoc, type FeedPostDoc } from "../../db/collections.js";
import { isConnectionError } from "../../db/errors.js";
import type { PublicAuthUser } from "../../auth/types.js";

/**
 * Feed social repository — real engagement on top of the archived demo data.
 *
 * The seeded posts carry DEMO counts (`likes`/`comments` numbers on the
 * document, part of the original dataset). Those numbers are never mutated:
 * real likes live in `feed_posts.likedBy` (array of account ids) and real
 * comments in the `feed_comments` collection. The API layer ADDS the real
 * activity on top of the demo baseline, so
 *
 *   displayed likes    = post.likes + likedBy.length
 *   displayed comments = post.comments + real comment count
 *
 * and un-liking/deleting can never drain the seeded baseline below what the
 * dataset originally showed. This keeps seed integrity guarantees (Phase 9I
 * counts) intact while making engagement genuinely persistent.
 */

export class FeedPostNotFoundError extends Error {
  constructor() {
    super("Feed post not found");
    this.name = "FeedPostNotFoundError";
  }
}

export class FeedSocialError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "FeedSocialError";
    this.code = code;
  }
}

/** Domain shape of a comment as the API emits it (safe projection). */
export interface FeedComment {
  /** Stable comment id — the client uses it as the React list key. */
  id: string;
  postId: string;
  /** Account username at posting time (may resolve to a profile link). */
  authorUsername: string;
  /** Display-name snapshot — stays readable even if the account changes. */
  authorName: string;
  body: string;
  createdAt: string;
}

function toComment(doc: FeedCommentDoc): FeedComment {
  return {
    id: doc._id,
    postId: doc.postId,
    authorUsername: doc.authorUsername,
    authorName: doc.authorName,
    body: doc.body,
    createdAt: doc.createdAt,
  };
}

/** Published-post visibility gate — archived posts accept no engagement. */
function publishedFilter(postId: string): Filter<FeedPostDoc> {
  return { _id: postId, status: "published" };
}

class FeedSocialRepository {
  /**
   * Toggle a like for one user on one post. Returns the viewer's resulting
   * state and the NEW displayed total (baseline + real likes).
   */
  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likes: number }> {
    const posts = collections.feedPosts();
    const exists = await posts.countDocuments(publishedFilter(postId), { limit: 1 });
    if (exists === 0) {
      throw new FeedPostNotFoundError();
    }

    const current = await posts.findOne(
      { _id: postId },
      { projection: { likedBy: 1 } },
    );
    const likedBy = new Set(current?.likedBy ?? []);
    const shouldLike = !likedBy.has(userId);

    const update = shouldLike
      ? { $addToSet: { likedBy: userId } }
      : { $pull: { likedBy: userId } };
    const result = await posts.findOneAndUpdate(
      { _id: postId },
      update,
      { projection: { likes: 1, likedBy: 1 }, returnDocument: "after" },
    );
    if (!result) {
      // Raced with an archive/delete between probe and update.
      throw new FeedPostNotFoundError();
    }

    return {
      liked: shouldLike,
      likes: (result.likes ?? 0) + (result.likedBy?.length ?? 0),
    };
  }

  /** Account ids the given user liked, within the supplied page of posts. */
  async likedIdsFor(postIds: string[], userId: string): Promise<string[]> {
    if (postIds.length === 0) return [];
    const docs = await collections
      .feedPosts()
      .find({ _id: { $in: postIds }, likedBy: userId } as Filter<FeedPostDoc>)
      .project<{ _id: string }>({ _id: 1 })
      .toArray();
    return docs.map((d) => d._id);
  }

  /** Real comment counts per post id (one grouped query for a whole page). */
  async commentCountsFor(postIds: string[]): Promise<Map<string, number>> {
    if (postIds.length === 0) return new Map();
    const rows = await collections
      .feedComments()
      .aggregate<{ _id: string; n: number }>([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: "$postId", n: { $sum: 1 } } },
      ])
      .toArray();
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  /** Comment thread for one post — oldest first (conversation order). */
  async listComments(postId: string): Promise<FeedComment[]> {
    const exists = await collections
      .feedPosts()
      .countDocuments(publishedFilter(postId), { limit: 1 });
    if (exists === 0) {
      throw new FeedPostNotFoundError();
    }
    const docs = await collections
      .feedComments()
      .find({ postId })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return docs.map(toComment);
  }

  /**
   * Append a comment. Author identity comes from the verified session —
   * NEVER from the request body.
   */
  async addComment(
    postId: string,
    user: PublicAuthUser,
    body: string,
  ): Promise<FeedComment> {
    const exists = await collections
      .feedPosts()
      .countDocuments(publishedFilter(postId), { limit: 1 });
    if (exists === 0) {
      throw new FeedPostNotFoundError();
    }

    const now = new Date();
    const doc: FeedCommentDoc = {
      _id: randomUUID(),
      postId,
      userId: user.id,
      authorUsername: user.username,
      authorName: user.displayName,
      body,
      createdAt: now.toISOString(),
    };
    try {
      await collections.feedComments().insertOne(doc);
    } catch (error) {
      if (isConnectionError(error)) throw error;
      throw new FeedSocialError(
        "STORE_FAILED",
        "The comment could not be saved. Please try again.",
      );
    }
    return toComment(doc);
  }
}

export const feedSocialRepository = new FeedSocialRepository();

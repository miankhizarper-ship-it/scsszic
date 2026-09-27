import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type FeedPostDoc } from "../../db/collections.js";
import type { FeedPost } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminFeedCreateInput,
  AdminFeedListQuery,
  AdminFeedUpdateInput,
} from "../../http/feedSchemas.js";
import { FEED_STATUSES } from "../../http/feedSchemas.js";

/**
 * Admin Feed repository (Phase 9F) — CRUD over the SAME `feed_posts`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * The publication lifecycle is the model's own (published/archived). The
 * PUBLIC repository gates queries to `status: "published"` — that gate is
 * untouched, so archived posts stay private exactly as before (spec §13).
 * The admin surface intentionally sees archived posts too and owns safe
 * transitions between the model's own statuses.
 *
 * Documents are stored and returned FLAT (projectSlug/eventSlug/blogSlug on
 * the record) — the public API's `refs` enrichment stays a read-time
 * concern of feedRepository and is deliberately NOT duplicated here. The
 * five existing post types and their reference conventions are preserved
 * exactly; existence of references is enforced at the controller layer.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.feed_posts — title, excerpt, content,
 * authorName, authorUsername, tags).
 */

/** Newest first — the public feed's canonical order. */
const SORTS: Record<AdminFeedListQuery["sort"], Sort> = {
  published_desc: { publishedAt: -1, title: 1 },
  published_asc: { publishedAt: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

export interface AdminFeedFacetEntry {
  value: string;
  n: number;
}

export interface AdminFeedAuthorFacet {
  username: string;
  name: string;
  n: number;
}

export interface AdminFeedListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: {
    types: AdminFeedFacetEntry[];
    statuses: AdminFeedFacetEntry[];
    authors: AdminFeedAuthorFacet[];
    projects: AdminFeedFacetEntry[];
  };
}

export interface AdminFeedListResult {
  items: FeedPost[];
  meta: AdminFeedListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.feed_posts exactly:
 * title, excerpt, content, authorName, authorUsername, tags — joined with
 * spaces, lowercased.
 */
function buildFeedSearchText(post: {
  title?: string;
  excerpt?: string;
  content?: string;
  authorName?: string;
  authorUsername?: string;
  tags?: string[];
}): string {
  return [post.title, post.excerpt, post.content, post.authorName, post.authorUsername, post.tags]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "feed-*" family. */
function generateFeedId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `feed-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<FeedPostDoc>): FeedPost {
  return stripInternals(doc) as unknown as FeedPost;
}

/* ------------------------------- repository ------------------------------ */

class AdminFeedRepository {
  private coll() {
    return collections.feedPosts();
  }

  /**
   * Management listing — search (same haystack as the public site),
   * type/status/author/project/event filters, dynamic sort, real
   * pagination, plus unfiltered facet distributions (types, statuses, and
   * real author snapshots for the author filter). Total reflects the
   * filters. Admins see archived posts — no public visibility gate here.
   */
  async list(query: AdminFeedListQuery): Promise<AdminFeedListResult> {
    const filter: Filter<FeedPostDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.authorUsername) {
      filter.authorUsername = query.authorUsername;
    }
    if (query.projectSlug) {
      filter.projectSlug = query.projectSlug;
    }
    if (query.event) {
      filter.eventSlug = query.event;
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, typeRows, statusRows, authorRows, projectRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$type", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$status", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; name: string | null; n: number }>([
          {
            $group: {
              _id: "$authorUsername",
              name: { $first: "$authorName" },
              n: { $sum: 1 },
            },
          },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $match: { projectSlug: { $exists: true, $ne: null } } },
          { $group: { _id: "$projectSlug", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
    ]);

    return {
      items: docs.map(toDomain),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        facets: {
          types: typeRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          statuses: statusRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          authors: authorRows
            .filter((row): row is { _id: string; name: string; n: number } => Boolean(row._id))
            .map((row) => ({ username: row._id, name: row.name ?? row._id, n: row.n })),
          projects: projectRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }

  /** Single post by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<FeedPost | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<FeedPostDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<FeedPostDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<FeedPostDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real post document — canonical id, searchText, social defaults. */
  async create(input: AdminFeedCreateInput): Promise<FeedPost> {
    const _id = generateFeedId();
    const doc: FeedPostDoc & Document = {
      ...input,
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      id: _id,
      searchText: buildFeedSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<FeedPostDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminFeedUpdateInput): Promise<FeedPost | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<FeedPostDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as FeedPostDoc;
    const set: Record<string, unknown> = { ...input, searchText: buildFeedSearchText(merged) };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<FeedPostDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(
    id: string,
    status: (typeof FEED_STATUSES)[number],
  ): Promise<FeedPost | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<FeedPostDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one post by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<FeedPostDoc>);
    return result.deletedCount === 1;
  }
}

export const adminFeedRepository = new AdminFeedRepository();

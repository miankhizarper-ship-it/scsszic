import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type VideoDoc } from "../../db/collections.js";
import type { WatchVideo } from "../../content/types.js";
import { durationBucketRange, escapeRegExp, parseDurationMinutes } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminVideoCreateInput,
  AdminVideoListQuery,
  AdminVideoUpdateInput,
} from "../../http/videoSchemas.js";

/**
 * Admin Videos repository (Phase 9G) — CRUD over the SAME `videos`
 * collection the public Phase 8 Watch repository reads, with the SAME
 * document conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * The internal numeric `durationMinutes` is the seed's own derivation of
 * the editorial `duration` display string (server parseDurationMinutes —
 * identical formula, no unit conversions). It is recomputed SERVER-side on
 * every write and never accepted from the client; the API keeps exposing
 * the editorial string only. Duration-bucket filters run on the numeric
 * field with the exact public bucket boundaries.
 *
 * The publication lifecycle is the model's own (published/archived). The
 * PUBLIC repository gates queries to `status: "published"` — that gate is
 * untouched, so archived videos stay private exactly as before (spec §13).
 * The admin surface intentionally sees archived videos too.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.videos — title, excerpt, description,
 * category, speaker, tags).
 */

/** Newest releases first — the public Watch listing's canonical order. */
const SORTS: Record<AdminVideoListQuery["sort"], Sort> = {
  published_desc: { publishedAt: -1, title: 1 },
  published_asc: { publishedAt: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  duration_desc: { durationMinutes: -1, title: 1 },
};

export interface AdminVideoFacetEntry {
  value: string;
  n: number;
}

export interface AdminVideoListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (filter chips with real counts). */
  facets: {
    statuses: AdminVideoFacetEntry[];
    categories: AdminVideoFacetEntry[];
    events: AdminVideoFacetEntry[];
  };
}

export interface AdminVideoListResult {
  items: WatchVideo[];
  meta: AdminVideoListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.videos exactly:
 * title, excerpt, description, category, speaker, tags — joined with
 * spaces, lowercased.
 */
function buildVideoSearchText(video: {
  title?: string;
  excerpt?: string;
  description?: string;
  category?: string;
  speaker?: string;
  tags?: string[];
}): string {
  return [video.title, video.excerpt, video.description, video.category, video.speaker, video.tags]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "vid-*" family. */
function generateVideoId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `vid-${Date.now().toString(36)}${random}`.toLowerCase();
}

/**
 * Optional text/reference/source fields that mean "absent" when empty —
 * stored docs simply omit the key when unset (the seed's convention).
 */
const OPTIONAL_EMPTY_KEYS = ["eventSlug", "speaker", "videoUrl", "embedUrl"] as const;

/** Splits a write payload into $set + $unset, honoring the empty-means-absent keys. */
function buildWriteSets(payload: Record<string, unknown>): {
  set: Record<string, unknown>;
  unset: Record<string, 1>;
} {
  const set: Record<string, unknown> = { ...payload };
  const unset: Record<string, 1> = {};
  for (const key of OPTIONAL_EMPTY_KEYS) {
    if (set[key] === "") {
      delete set[key];
      unset[key] = 1;
    }
  }
  return { set, unset };
}

function toDomain(doc: WithId<VideoDoc>): WatchVideo {
  return stripInternals(doc) as unknown as WatchVideo;
}

/* ------------------------------- repository ------------------------------ */

class AdminVideosRepository {
  private coll() {
    return collections.videos();
  }

  /**
   * Management listing — search (same haystack as the public site),
   * status/category/event/featured/duration-bucket filters, dynamic sort,
   * real pagination, plus unfiltered facet distributions. Total reflects
   * the filters. Admins see archived videos — no public visibility gate.
   */
  async list(query: AdminVideoListQuery): Promise<AdminVideoListResult> {
    const filter: Filter<VideoDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.event) {
      filter.eventSlug = query.event;
    }
    if (query.featured !== undefined) {
      // Seed docs omit `featured` entirely when false — "$ne: true" is the
      // honest "not featured" matcher for this collection.
      filter.featured = query.featured === "true" ? true : { $ne: true };
    }
    if (query.duration) {
      // Exact public bucket boundaries over the numeric durationMinutes.
      const { min, max } = durationBucketRange(query.duration);
      const range: Record<string, number> = {};
      if (min !== undefined) range.$gte = min;
      if (max !== undefined) range.$lt = max;
      if (Object.keys(range).length > 0) {
        filter.durationMinutes = range as Filter<VideoDoc>["durationMinutes"];
      }
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, statusRows, categoryRows, eventRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$status", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$category", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $match: { eventSlug: { $exists: true, $nin: [null, ""] } } },
          { $group: { _id: "$eventSlug", n: { $sum: 1 } } },
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
          statuses: statusRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          categories: categoryRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          events: eventRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }

  /** Single video by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<WatchVideo | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<VideoDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<VideoDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<VideoDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real video document — canonical id, server-derived durationMinutes, searchText. */
  async create(input: Omit<AdminVideoCreateInput, "slug"> & { slug: string }): Promise<WatchVideo> {
    const _id = generateVideoId();
    const { set } = buildWriteSets({ ...input });

    const doc: VideoDoc & Document = {
      ...(set as unknown as Omit<AdminVideoCreateInput, "slug"> & { slug: string }),
      featured: input.featured ?? false,
      // The seed's own derivation of the editorial duration string.
      durationMinutes: parseDurationMinutes(input.duration),
      id: _id,
      searchText: buildVideoSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<VideoDoc>);
  }

  /**
   * Partial update — merges onto the existing doc, recomputes searchText
   * and durationMinutes (from the merged editorial duration string).
   */
  async update(id: string, input: AdminVideoUpdateInput): Promise<WatchVideo | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<VideoDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as VideoDoc;
    const { set, unset } = buildWriteSets({
      ...input,
      searchText: buildVideoSearchText(merged),
    });
    // durationMinutes always recomputed from the merged duration string.
    set.durationMinutes = parseDurationMinutes(merged.duration);

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<VideoDoc>,
      (Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set }) as never,
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(
    id: string,
    status: "published" | "archived",
  ): Promise<WatchVideo | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<VideoDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one video by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<VideoDoc>);
    return result.deletedCount === 1;
  }
}

export const adminVideosRepository = new AdminVideosRepository();

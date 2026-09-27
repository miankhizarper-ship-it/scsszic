import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type EventDoc } from "../../db/collections.js";
import type { SerializedEvent } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type { AdminEventCreateInput, AdminEventListQuery, AdminEventUpdateInput } from "../../http/eventSchemas.js";
import { EVENT_STATUSES } from "../../http/eventSchemas.js";

/**
 * Admin Events repository (Phase 9C) — CRUD over the SAME `events`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * There is deliberately NO second collection, no visibility gate change and
 * no parallel data model: events are always public (status is the lifecycle:
 * upcoming/ongoing/completed/cancelled), so the admin surface differs from
 * the public one only in that it can write, see everything (identical here),
 * and controls sorting/pagination for the management table.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.events), so admin-created/edited events
 * remain fully searchable through the same haystack the public listing uses.
 */

/** Newest event dates first — the default management-table ordering. */
const SORTS: Record<AdminEventListQuery["sort"], Sort> = {
  date_desc: { date: -1, title: 1 },
  date_asc: { date: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  created_desc: { createdAt: -1, title: 1 },
};

export interface FacetEntry {
  value: string;
  n: number;
}

export interface AdminEventListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: { statuses: FacetEntry[]; categories: FacetEntry[] };
}

export interface AdminEventListResult {
  items: SerializedEvent[];
  meta: AdminEventListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.events exactly:
 * title, excerpt, description, category, location, organizer, tags —
 * joined with spaces, lowercased.
 */
function buildEventSearchText(event: Partial<SerializedEvent>): string {
  return [event.title, event.excerpt, event.description, event.category, event.location, event.organizer, event.tags]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "evt-*" family. */
function generateEventId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `evt-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<EventDoc>): SerializedEvent {
  return stripInternals(doc) as unknown as SerializedEvent;
}

/* ------------------------------- repository ------------------------------ */

class AdminEventsRepository {
  private coll() {
    return collections.events();
  }

  /**
   * Management listing — search (same haystack as the public site), exact
   * category/status filters, dynamic sort, real pagination, plus unfiltered
   * facet distributions for the filter UI. Total reflects the filters.
   */
  async list(query: AdminEventListQuery): Promise<AdminEventListResult> {
    const filter: Filter<EventDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, statusRows, categoryRows] = await Promise.all([
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
        },
      },
    };
  }

  /** Single event by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<SerializedEvent | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<EventDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<EventDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<EventDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real event document — canonical id, createdAt, searchText set. */
  async create(input: AdminEventCreateInput): Promise<SerializedEvent> {
    const _id = generateEventId();
    const now = new Date().toISOString();
    const doc: EventDoc & Document = {
      ...input,
      featured: input.featured ?? false,
      id: _id,
      createdAt: now,
      searchText: buildEventSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<EventDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminEventUpdateInput): Promise<SerializedEvent | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<EventDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as EventDoc;
    const set: Record<string, unknown> = { ...input, searchText: buildEventSearchText(merged) };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<EventDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(id: string, status: (typeof EVENT_STATUSES)[number]): Promise<SerializedEvent | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<EventDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one event by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<EventDoc>);
    return result.deletedCount === 1;
  }
}

export const adminEventsRepository = new AdminEventsRepository();

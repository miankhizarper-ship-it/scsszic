import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type ProjectDoc } from "../../db/collections.js";
import type { Project } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminProjectCreateInput,
  AdminProjectListQuery,
  AdminProjectUpdateInput,
} from "../../http/projectSchemas.js";
import { PROJECT_STATUSES } from "../../http/projectSchemas.js";

/**
 * Admin Projects repository (Phase 9F) — CRUD over the SAME `projects`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * The publication lifecycle is the model's own (active/completed/archived).
 * The PUBLIC repository gates queries to `status in [active, completed]` —
 * that gate is untouched, so archived projects stay private exactly as
 * before (spec §13). The admin surface intentionally sees archived records
 * too and owns safe transitions between the model's own statuses.
 *
 * Team roster (ownerUsername/memberUsernames) and eventSlug references are
 * stored exactly as the model carries them; existence is enforced at the
 * controller layer before persistence.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.projects — title, tagline, description,
 * category, technologies, tags).
 */

/** Most recently updated first — the public showcase's canonical order. */
const SORTS: Record<AdminProjectListQuery["sort"], Sort> = {
  updated_desc: { updatedAt: -1, title: 1 },
  started_desc: { startedAt: -1, title: 1 },
  started_asc: { startedAt: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

export interface AdminProjectFacetEntry {
  value: string;
  n: number;
}

export interface AdminProjectListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: {
    statuses: AdminProjectFacetEntry[];
    categories: AdminProjectFacetEntry[];
    events: AdminProjectFacetEntry[];
  };
}

export interface AdminProjectListResult {
  items: Project[];
  meta: AdminProjectListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.projects exactly:
 * title, tagline, description, category, technologies, tags — joined with
 * spaces, lowercased.
 */
function buildProjectSearchText(project: {
  title?: string;
  tagline?: string;
  description?: string;
  category?: string;
  technologies?: string[];
  tags?: string[];
}): string {
  return [project.title, project.tagline, project.description, project.category, project.technologies, project.tags]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "proj-*" family. */
function generateProjectId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `proj-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<ProjectDoc>): Project {
  return stripInternals(doc) as unknown as Project;
}

/* ------------------------------- repository ------------------------------ */

class AdminProjectsRepository {
  private coll() {
    return collections.projects();
  }

  /**
   * Management listing — search (same haystack as the public site), status/
   * category/event/technology filters, dynamic sort, real pagination, plus
   * unfiltered facet distributions. Total reflects the filters. Admins see
   * archived projects — no public visibility gate here.
   */
  async list(query: AdminProjectListQuery): Promise<AdminProjectListResult> {
    const filter: Filter<ProjectDoc> = {};

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
    if (query.technology) {
      // Case-insensitive exact membership — mirrors the public repository's
      // technology comparator exactly.
      filter.technologies = {
        $elemMatch: {
          $regex: `^${query.technology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      };
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
          { $match: { eventSlug: { $exists: true, $ne: null } } },
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

  /** Single project by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<Project | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<ProjectDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<ProjectDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<ProjectDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real project document — canonical id, searchText, updatedAt default. */
  async create(input: Omit<AdminProjectCreateInput, "slug"> & { slug: string }): Promise<Project> {
    const _id = generateProjectId();
    const doc: ProjectDoc & Document = {
      ...input,
      featured: input.featured ?? false,
      // The model's editorial revision date — defaults to the start date.
      updatedAt: input.updatedAt ?? input.startedAt,
      id: _id,
      searchText: buildProjectSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<ProjectDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminProjectUpdateInput): Promise<Project | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<ProjectDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as ProjectDoc;
    const set: Record<string, unknown> = {
      ...input,
      // Every save is a revision — bump the editorial updatedAt unless the
      // payload explicitly sets it.
      updatedAt: input.updatedAt ?? new Date().toISOString().slice(0, 10),
      searchText: buildProjectSearchText(merged),
    };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<ProjectDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(
    id: string,
    status: (typeof PROJECT_STATUSES)[number],
  ): Promise<Project | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<ProjectDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one project by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<ProjectDoc>);
    return result.deletedCount === 1;
  }
}

export const adminProjectsRepository = new AdminProjectsRepository();

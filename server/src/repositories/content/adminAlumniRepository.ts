import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type AlumnusDoc } from "../../db/collections.js";
import type { SerializedAlumnus } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminAlumniCreateInput,
  AdminAlumniListQuery,
  AdminAlumniUpdateInput,
} from "../../http/alumniSchemas.js";

/**
 * Admin Alumni repository (Phase 9E) — CRUD over the SAME `alumni`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * The alumni dataset has NO draft/archived lifecycle — every alumnus is
 * public (Phase 2 behavior preserved by the public repository's empty
 * visibility gate, which is untouched). The admin surface differs only in
 * that it can write and controls sorting/pagination for the management
 * table. Consequently there is deliberately NO status endpoint here.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.alumni — name, role, company, field,
 * achievement, skills), so admin-created/edited profiles remain fully
 * searchable through the same haystack the public directory uses.
 */

/** Newest batch first, alphabetical within a batch — the public listing's canonical order. */
const SORTS: Record<AdminAlumniListQuery["sort"], Sort> = {
  batch_desc: { batchYear: -1, name: 1 },
  batch_asc: { batchYear: 1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

export interface AdminAlumniFacetEntry {
  value: string;
  n: number;
}

export interface AdminAlumniListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: { fields: AdminAlumniFacetEntry[]; batches: AdminAlumniFacetEntry[] };
}

export interface AdminAlumniListResult {
  items: SerializedAlumnus[];
  meta: AdminAlumniListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.alumni exactly:
 * name, role, company, field, achievement, skills — joined with spaces,
 * lowercased.
 */
function buildAlumniSearchText(alumnus: {
  name?: string;
  role?: string;
  company?: string;
  field?: string;
  achievement?: string;
  skills?: string[];
}): string {
  return [alumnus.name, alumnus.role, alumnus.company, alumnus.field, alumnus.achievement, alumnus.skills]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "al-*" family. */
function generateAlumniId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `al-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<AlumnusDoc>): SerializedAlumnus {
  return stripInternals(doc) as unknown as SerializedAlumnus;
}

/* ------------------------------- repository ------------------------------ */

class AdminAlumniRepository {
  private coll() {
    return collections.alumni();
  }

  /**
   * Management listing — search (same haystack as the public site), field/
   * batch filters, dynamic sort, real pagination, plus unfiltered facet
   * distributions. Total reflects the filters.
   */
  async list(query: AdminAlumniListQuery): Promise<AdminAlumniListResult> {
    const filter: Filter<AlumnusDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.field) {
      filter.field = query.field;
    }
    if (query.batch) {
      filter.batchYear = Number.parseInt(query.batch, 10);
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, fieldRows, batchRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$field", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: number | null; n: number }>([
          { $group: { _id: "$batchYear", n: { $sum: 1 } } },
          { $sort: { _id: -1 } },
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
          fields: fieldRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          batches: batchRows
            .filter((row): row is { _id: number; n: number } => row._id !== null)
            .map((row) => ({ value: String(row._id), n: row.n })),
        },
      },
    };
  }

  /** Single alumnus by canonical id. */
  async getById(id: string): Promise<SerializedAlumnus | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<AlumnusDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Username availability check (create/update pre-check; DB index is the guard). */
  async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<AlumnusDoc> = { username };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<AlumnusDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real alumnus document — canonical id + searchText set. */
  async create(input: Omit<AdminAlumniCreateInput, "username"> & { username: string }): Promise<SerializedAlumnus> {
    const _id = generateAlumniId();
    const doc: AlumnusDoc & Document = {
      ...input,
      id: _id,
      searchText: buildAlumniSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<AlumnusDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminAlumniUpdateInput): Promise<SerializedAlumnus | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<AlumnusDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as AlumnusDoc;
    const set: Record<string, unknown> = { ...input, searchText: buildAlumniSearchText(merged) };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<AlumnusDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Delete exactly one alumnus by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<AlumnusDoc>);
    return result.deletedCount === 1;
  }
}

export const adminAlumniRepository = new AdminAlumniRepository();

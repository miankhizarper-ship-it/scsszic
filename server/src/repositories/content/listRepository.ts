import type { Collection, Document, Filter, Sort, WithId } from "mongodb";

import { collections } from "../../db/collections.js";
import { escapeRegExp } from "./text.js";

/**
 * Generic MongoDB list engine for the SCS content collections (Phase 8).
 *
 * Every domain repository plugs in three pieces:
 *   visibility  — the publication gate (archived/draft NEVER public, spec
 *                 §13). Enforced HERE so no route can accidentally leak it.
 *   buildFilter — validated query params → Mongo filter (search, category…)
 *   toDomain    — document → API domain shape (strips _id + internal fields)
 *
 * The engine provides listing with server-side filtering + pagination +
 * facets (spec §11/§12), slug/username detail lookups, and id-batch fetches.
 *
 * Search strategy: each document carries a seed-computed `searchText` field
 * — the EXACT same haystack the Phase 4–6 client-side filters used — so a
 * case-insensitive substring match reproduces the previous behavior 1:1.
 * It is an internal field, stripped from every API response.
 */

/** Maximum page size — the UI renders full listings; keep responses sane. */
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 200;

/** Validated, normalized query parameters (built by http/querySchemas.ts). */
export interface ContentQuery {
  page: number;
  pageSize: number;
  search: string;
  /** Free-form extra filters per domain (already validated). */
  filters: Record<string, string | number | boolean | string[]>;
  /** Optional limit override for "featured"-style small lists. */
  limit?: number;
}

export interface ListFacets {
  /** Count over the visibility gate only (ignores filters) — hero stats. */
  total: number;
  /** Domain facet entries (category counts, years, tags, statuses…). */
  [key: string]: unknown;
}

export interface ListResult<Domain> {
  items: Domain[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    facets: ListFacets;
  };
}

export interface ListConfig<Doc extends Document, Domain> {
  collection: () => Collection<Doc>;
  /** Publication gate — merged into EVERY query. */
  visibility: Filter<Doc>;
  /** Validated query → domain Mongo filter. */
  buildFilter: (query: ContentQuery) => Filter<Doc>;
  /** Default ordering for listings. */
  sort: Sort;
  /** Document → API domain shape (strip _id and internal fields). */
  toDomain: (doc: WithId<Doc>) => Domain;
  /** Facet pipelines computed over the visibility gate (ignores filters). */
  buildFacets?: () => Record<string, Document[]>;
}

/** Case-insensitive substring search against the seed-computed haystack. */
export function searchFilter(search: string): Filter<Document> {
  const trimmed = search.trim();
  if (!trimmed) return {};
  return { searchText: { $regex: escapeRegExp(trimmed), $options: "i" } };
}

export class ListRepository<Doc extends Document, Domain> {
  constructor(protected readonly config: ListConfig<Doc, Domain>) {}

  get visibility(): Filter<Doc> {
    return this.config.visibility;
  }

  get sort(): Sort {
    return this.config.sort;
  }

  /**
   * Filtered, paginated listing with facets.
   * Facets (including the unfiltered `total`) are computed over the
   * visibility gate only — pages can render global stats and filtered
   * results from a single request.
   */
  async list(query: ContentQuery): Promise<ListResult<Domain>> {
    const domainFilter = this.config.buildFilter(query);
    const filter = {
      $and: [this.config.visibility, domainFilter],
    } as unknown as Filter<Doc>;

    const pageSize = Math.min(query.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = Math.max(query.page || 1, 1);
    const limit = query.limit ?? pageSize;
    const skip = (page - 1) * pageSize;

    const [total, docs] = await Promise.all([
      this.config.collection().countDocuments(filter),
      this.config
        .collection()
        .find(filter)
        .sort(this.config.sort)
        .skip(query.limit ? 0 : skip)
        .limit(limit)
        .toArray(),
    ]);

    const facets = await this.facets();

    return {
      items: docs.map(this.config.toDomain),
      meta: { total, page, pageSize: limit, facets },
    };
  }

  /** Facets over the visibility gate (always includes the unfiltered total). */
  async facets(): Promise<ListFacets> {
    const facetStages = this.config.buildFacets?.() ?? {};
    const [aggregateResult] = await this.config
      .collection()
      .aggregate<Record<string, unknown>>(
        [
          { $match: this.config.visibility },
          { $facet: { total: [{ $count: "n" }], ...facetStages } },
        ],
      )
      .toArray();

    const totalArray = (aggregateResult?.total ?? []) as Array<{ n: number }>;
    const { total: _rawTotal, ...domainFacets } = aggregateResult ?? {};
    return { total: totalArray[0]?.n ?? 0, ...domainFacets };
  }

  /** Single visible document by slug — null when unknown/hidden. */
  async getBySlug(slug: string): Promise<Domain | null> {
    const doc = await this.config
      .collection()
      .findOne({ ...(this.config.visibility as Record<string, unknown>), slug } as unknown as Filter<Doc>);
    return doc ? this.config.toDomain(doc) : null;
  }

  /** Single visible document by username (members/alumni) — null when unknown/hidden. */
  async getByUsername(username: string): Promise<Domain | null> {
    const doc = await this.config
      .collection()
      .findOne({
        ...(this.config.visibility as Record<string, unknown>),
        username,
      } as unknown as Filter<Doc>);
    return doc ? this.config.toDomain(doc) : null;
  }

  /** All visible documents (small collections; used by related scoring). */
  async allVisible(): Promise<Domain[]> {
    const docs = await this.config
      .collection()
      .find(this.config.visibility)
      .sort(this.config.sort)
      .toArray();
    return docs.map(this.config.toDomain);
  }

  /** Visible documents whose `id` is in the list (batch cross-ref lookups). */
  async manyByIds(ids: string[]): Promise<Domain[]> {
    if (ids.length === 0) return [];
    const filter = {
      $and: [this.config.visibility, { id: { $in: ids } }],
    } as unknown as Filter<Doc>;
    const docs = await this.config.collection().find(filter).toArray();
    return docs.map(this.config.toDomain);
  }

  /** Raw collection access for domain-specific extensions. */
  get coll(): Collection<Doc> {
    return this.config.collection();
  }
}

/** Shared facet helper: distinct values with counts (small datasets). */
export function distinctFacet(field: string, limit = 50): Document[] {
  return [
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
    { $sort: { n: -1, _id: 1 } },
    { $limit: limit },
    { $project: { _id: 0, value: "$_id", n: 1 } },
  ];
}

/** Shared facet helper: sorted distinct values (e.g. years, newest first). */
export function distinctSortedFacet(
  field: string,
  direction: 1 | -1 = -1,
  limit = 50,
): Document[] {
  return [
    { $group: { _id: `$${field}` } },
    { $sort: { _id: direction } },
    { $limit: limit },
    { $project: { _id: 0, value: "$_id" } },
  ];
}

/* Re-exported so domain repositories build filters consistently. */
export { collections };

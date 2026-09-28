import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type TeamDoc } from "../../db/collections.js";
import type { TeamCard } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import type {
  AdminTeamCreateInput,
  AdminTeamListQuery,
  AdminTeamUpdateInput,
} from "../../http/teamSchemas.js";
/**
 * Admin Team repository (Phase 12) — CRUD over the SAME `team` collection
 * the public Phase 12 repository reads, with the SAME document conventions
 * (canonical `id` mirrored into `_id`, repository-computed `searchText`
 * haystack, internals + timestamps stripped from every response).
 *
 * The visibility lifecycle is the model's own two-state status
 * (published/archived). The PUBLIC repository gates queries to
 * `status: "published"` — that gate is untouched, so archived cards stay
 * private exactly as designed. The admin surface sees archived records too
 * (that is what a card CMS needs).
 */

/** Management order: manual order first, then name; newest for recency audits. */
const SORTS: Record<AdminTeamListQuery["sort"], Sort> = {
  order_asc: { order: 1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  newest: { createdAt: -1 },
};

export interface AdminTeamFacetEntry {
  value: string;
  n: number;
}

export interface AdminTeamListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (filter chips with real counts). */
  facets: { groups: AdminTeamFacetEntry[]; statuses: AdminTeamFacetEntry[] };
}

export interface AdminTeamListResult {
  items: TeamCard[];
  meta: AdminTeamListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/** name + position + description — joined with spaces, lowercased. */
function buildTeamSearchText(card: {
  name?: string;
  position?: string;
  description?: string;
}): string {
  return [card.name, card.position, card.description]
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the "team-" family. */
function generateTeamId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `team-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<TeamDoc>): TeamCard {
  const { _id, searchText, createdAt: _c, updatedAt: _u, ...domain } = doc;
  void _id;
  void searchText;
  void _c;
  void _u;
  /* Doc socials carry icon KEYS; the domain shape expects the same keys —
     the public team SERVICE resolves them to components (alumni contract). */
  return domain as unknown as TeamCard;
}

/* ------------------------------- repository ------------------------------ */

class AdminTeamRepository {
  private coll() {
    return collections.team();
  }

  /**
   * Management listing — search (name/position/description haystack), group/
   * status filters, dynamic sort, real pagination, plus unfiltered facet
   * distributions. Total reflects the filters. Admins see archived records.
   */
  async list(query: AdminTeamListQuery): Promise<AdminTeamListResult> {
    const filter: Filter<TeamDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.group) {
      filter.group = query.group;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, groupRows, statusRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$group", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$status", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
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
          groups: groupRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          statuses: statusRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }

  /** Single card by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<TeamCard | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<TeamDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Insert a real team card — canonical id + searchText + timestamps set. */
  async create(input: AdminTeamCreateInput): Promise<TeamCard> {
    const now = new Date().toISOString();
    const _id = generateTeamId();
    const doc: TeamDoc & Document = {
      ...input,
      description: input.description ?? "",
      order: input.order ?? 0,
      id: _id,
      searchText: buildTeamSearchText(input),
      createdAt: now,
      updatedAt: now,
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<TeamDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminTeamUpdateInput): Promise<TeamCard | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<TeamDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as TeamDoc;
    const set: Record<string, unknown> = {
      ...input,
      searchText: buildTeamSearchText(merged),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<TeamDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Delete exactly one card by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<TeamDoc>);
    return result.deletedCount === 1;
  }
}

export const adminTeamRepository = new AdminTeamRepository();

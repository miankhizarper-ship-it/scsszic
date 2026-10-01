import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type MemberDoc } from "../../db/collections.js";
import type { Member } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminMemberCreateInput,
  AdminMemberListQuery,
  AdminMemberUpdateInput,
} from "../../http/memberSchemas.js";
import { MEMBER_STATUSES } from "../../http/memberSchemas.js";

/**
 * Admin Members repository (Phase 9E) — CRUD over the SAME `members`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * The publication lifecycle is the model's own directory status
 * (active/alumni/archived). The PUBLIC repository gates queries to
 * `status in [active, alumni]` — that gate is untouched, so archived
 * members stay private exactly as before (spec §13). The admin surface
 * intentionally sees archived records too (that is what a directory CMS
 * needs) and owns safe transitions between the model's own statuses.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.members — name, username, role,
 * company, batch, department, domain, bio, location, skills, interests).
 */

/**
 * Directory order: featured first, newest batch, alphabetical — mirrors
 * the public listing's canonical sort.
 */
const SORTS: Record<AdminMemberListQuery["sort"], Sort> = {
  batch_desc: { featured: -1, batchYear: -1, name: 1 },
  batch_asc: { featured: -1, batchYear: 1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  featured_desc: { featured: -1, name: 1 },
};

export interface AdminMemberFacetEntry {
  value: string;
  n: number;
}

export interface AdminMemberListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: { statuses: AdminMemberFacetEntry[]; domains: AdminMemberFacetEntry[]; batches: AdminMemberFacetEntry[] };
}

export interface AdminMemberListResult {
  items: AdminMemberPayload[];
  meta: AdminMemberListMeta;
}

/**
 * Task 29 — the ADMIN surface re-attaches the stripped account linkage:
 * `userId` is the owning auth account's id (an opaque uuid, safe for the
 * admin CMS; still stripped from every PUBLIC payload by strip.ts).
 */
export interface AdminMemberPayload extends Member {
  userId?: string;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.members exactly:
 * name, username, role, company, batch, department, domain, bio, location,
 * skills, interests — joined with spaces, lowercased.
 */
function buildMemberSearchText(member: {
  name?: string;
  username?: string;
  role?: string;
  company?: string;
  batch?: string;
  department?: string;
  domain?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
}): string {
  return [
    member.name,
    member.username,
    member.role,
    member.company,
    member.batch,
    member.department,
    member.domain,
    member.bio,
    member.location,
    member.skills,
    member.interests,
  ]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "mem-*" family. */
function generateMemberId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `mem-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<MemberDoc>): Member {
  return stripInternals(doc) as unknown as Member;
}

/** Admin mapping — the domain member PLUS the account linkage (userId). */
function toAdminDomain(doc: WithId<MemberDoc>): AdminMemberPayload {
  const member = toDomain(doc);
  return doc.userId ? { ...member, userId: doc.userId } : member;
}

/* ------------------------------- repository ------------------------------ */

class AdminMembersRepository {
  private coll() {
    return collections.members();
  }

  /**
   * Management listing — search (same haystack as the public site), status/
   * domain/batch/featured filters, dynamic sort, real pagination, plus
   * unfiltered facet distributions. Total reflects the filters. Admins see
   * archived records — no public visibility gate here.
   */
  async list(query: AdminMemberListQuery): Promise<AdminMemberListResult> {
    const filter: Filter<MemberDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.domain) {
      filter.domain = query.domain;
    }
    if (query.batch) {
      filter.batchYear = Number.parseInt(query.batch, 10);
    }
    if (query.featured !== undefined) {
      filter.featured = query.featured === "true";
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, statusRows, domainRows, batchRows] = await Promise.all([
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
          { $group: { _id: "$domain", n: { $sum: 1 } } },
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
      items: docs.map(toAdminDomain),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        facets: {
          statuses: statusRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          domains: domainRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          batches: batchRows
            .filter((row): row is { _id: number; n: number } => row._id !== null)
            .map((row) => ({ value: String(row._id), n: row.n })),
        },
      },
    };
  }

  /** Single member by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<AdminMemberPayload | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<MemberDoc>);
    return doc ? toAdminDomain(doc) : null;
  }

  /**
   * Task 29 — the owning account of a member record (raw read; the public
   * projection strips the linkage). Used by the delete flow to demote the
   * account's role back to "user" and by the self-service surface.
   */
  async getLinkById(id: string): Promise<{ id: string; name: string; userId?: string } | null> {
    const doc = await this.coll().findOne(
      { _id: id } as Filter<MemberDoc>,
      { projection: { _id: 1, name: 1, userId: 1 } },
    );
    return doc ? { id: doc._id, name: doc.name, ...(doc.userId ? { userId: doc.userId } : {}) } : null;
  }

  /** Task 29 — the member record owned by the given account, if any. */
  async findByUserId(userId: string): Promise<AdminMemberPayload | null> {
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return null;
    const doc = await this.coll().findOne({ userId } as Filter<MemberDoc>);
    return doc ? toAdminDomain(doc) : null;
  }

  /** Username availability check (create/update pre-check; DB index is the guard). */
  async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<MemberDoc> = { username };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<MemberDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real member document — canonical id + searchText set. */
  async create(
    input: Omit<AdminMemberCreateInput, "username"> & { username: string },
  ): Promise<AdminMemberPayload> {
    const _id = generateMemberId();
    const doc: MemberDoc & Document = {
      ...input,
      featured: input.featured ?? false,
      id: _id,
      searchText: buildMemberSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toAdminDomain(doc as WithId<MemberDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminMemberUpdateInput): Promise<AdminMemberPayload | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<MemberDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as MemberDoc;
    const set: Record<string, unknown> = { ...input, searchText: buildMemberSearchText(merged) };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<MemberDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toAdminDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(
    id: string,
    status: (typeof MEMBER_STATUSES)[number],
  ): Promise<AdminMemberPayload | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<MemberDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toAdminDomain(result) : null;
  }

  /** Delete exactly one member by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<MemberDoc>);
    return result.deletedCount === 1;
  }
}

export const adminMembersRepository = new AdminMembersRepository();

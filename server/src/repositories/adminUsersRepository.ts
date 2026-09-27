import type { Filter, Sort, WithId } from "mongodb";

import { collections, type UserDoc } from "../db/collections.js";
import { toAdminPermissions } from "../auth/types.js";
import type { AdminPermission, AuthUserRole } from "../auth/types.js";
import { escapeRegExp } from "./content/text.js";
import type { AdminUserListQuery, AdminUserUpdateInput } from "../http/userSchemas.js";

/**
 * Admin Users repository (Phase 9H) — management reads/writes over the SAME
 * `users` collection the Phase 7/8 auth layer owns. This module NEVER
 * invents user state: the model has `displayName` and `role` only, so that
 * is exactly what can be updated, and there is no status dimension to
 * filter on.
 *
 * The safe projection below is the ONLY shape that may leave this module —
 * passwordHash, normalizedEmail and normalizedUsername are internal
 * (bcrypt hash + uniqueness helpers) and can never reach a response.
 *
 * Final-admin safeguards live in the controller (which knows the acting
 * user); the repository provides the admin-count primitives they need.
 */

/** Safe admin/user DTO — everything EXCEPT secrets and normalized helpers. */
export interface SafeAdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: AuthUserRole;
  /** Phase 10B — per-user CMS grants (normalized; [] when absent/invalid). */
  permissions: AdminPermission[];
  memberProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Document → safe user. Mirrors the auth layer's toPublicUser contract and
 * adds updatedAt (non-sensitive account metadata the management table shows).
 */
function toSafeAdminUser(doc: WithId<UserDoc>): SafeAdminUser {
  return {
    id: doc.id || doc._id,
    username: doc.username,
    email: doc.email,
    displayName: doc.displayName,
    role: doc.role,
    permissions: toAdminPermissions(doc.permissions),
    ...(doc.memberProfileId ? { memberProfileId: doc.memberProfileId } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const SORTS: Record<AdminUserListQuery["sort"], Sort> = {
  created_desc: { createdAt: -1, username: 1 },
  created_asc: { createdAt: 1, username: 1 },
  username_asc: { normalizedUsername: 1 },
  username_desc: { normalizedUsername: -1 },
  name_asc: { displayName: 1 },
  name_desc: { displayName: -1 },
};

export interface AdminUserFacetEntry {
  value: string;
  n: number;
}

export interface AdminUserListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered role distribution (filter chips with real counts). */
  facets: { roles: AdminUserFacetEntry[] };
}

export interface AdminUserListResult {
  items: SafeAdminUser[];
  meta: AdminUserListMeta;
}

class AdminUsersRepository {
  private coll() {
    return collections.users();
  }

  /**
   * Management listing — case-insensitive search over username/email/
   * display name (the model carries no searchText haystack; $or over the
   * three real fields is the honest equivalent), role filter, dynamic sort,
   * real pagination, plus the unfiltered role facet.
   */
  async list(query: AdminUserListQuery): Promise<AdminUserListResult> {
    const filter: Filter<UserDoc> = {};

    const search = query.search.trim();
    if (search) {
      const pattern = escapeRegExp(search);
      filter.$or = [
        { username: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
        { displayName: { $regex: pattern, $options: "i" } },
      ];
    }
    if (query.role) {
      filter.role = query.role;
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, roleRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$role", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    return {
      items: docs.map(toSafeAdminUser),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        facets: {
          roles: roleRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }

  /** Single user by canonical id — safe projection only. */
  async getById(id: string): Promise<SafeAdminUser | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<UserDoc>);
    return doc ? toSafeAdminUser(doc) : null;
  }

  /**
   * How many administrators exist EXCLUDING the given account? The
   * controller's final-admin safeguard compares this against zero before
   * any demote/delete of an admin.
   */
  async countOtherAdmins(excludeId?: string): Promise<number> {
    const filter: Filter<UserDoc> = { role: "admin" };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<UserDoc>["_id"];
    return this.coll().countDocuments(filter);
  }

  /**
   * Partial update (displayName/role/permissions — validated + normalized
   * upstream), bumps updatedAt. Keys absent from the input are left as-is;
   * permissions: [] explicitly clears the grants.
   */
  async update(id: string, input: AdminUserUpdateInput): Promise<SafeAdminUser | null> {
    const set: Record<string, unknown> = { ...input, updatedAt: new Date().toISOString() };
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<UserDoc>,
      { $set: set },
      { returnDocument: "after" },
    );
    return result ? toSafeAdminUser(result) : null;
  }

  /** Delete exactly one user by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<UserDoc>);
    return result.deletedCount === 1;
  }
}

export const adminUsersRepository = new AdminUsersRepository();

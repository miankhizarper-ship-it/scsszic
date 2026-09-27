import type { Filter, WithId } from "mongodb";

import { collections, type AuditLogDoc } from "../db/collections.js";
import { escapeRegExp } from "./content/text.js";
import type { AdminAuditListQuery } from "../http/auditSchemas.js";

/**
 * Admin Audit repository (Phase 9H) — read-only listing over the
 * server-generated `audit_logs` collection. Newest-first is FIXED (spec §8):
 * the primary index { createdAt: -1 } backs the default page and every
 * filtered variant sorts the same way, so ordering is deterministic.
 *
 * The repository returns the SAFE projection of each record — actor
 * snapshots, action, resource and concise metadata only. There are no
 * secrets in audit documents by construction; the projection still pins the
 * exact response shape so nothing internal can ever leak if the doc grows.
 */

/** Safe audit DTO — exactly what GET /api/admin/audit may return. */
export interface SafeAuditEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  outcome: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

function toSafeAuditEntry(doc: WithId<AuditLogDoc>): SafeAuditEntry {
  return {
    id: doc._id,
    actorId: doc.actorId,
    actorUsername: doc.actorUsername,
    actorRole: doc.actorRole,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    ...(doc.resourceLabel ? { resourceLabel: doc.resourceLabel } : {}),
    outcome: doc.outcome,
    ...(doc.metadata ? { metadata: doc.metadata } : {}),
    createdAt: doc.createdAt,
  };
}

export interface AdminAuditFacetEntry {
  value: string;
  n: number;
}

export interface AdminAuditListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered actor/action/resource distributions (filter chips). */
  facets: {
    actors: AdminAuditFacetEntry[];
    actions: AdminAuditFacetEntry[];
    resourceTypes: AdminAuditFacetEntry[];
  };
}

export interface AdminAuditListResult {
  items: SafeAuditEntry[];
  meta: AdminAuditListMeta;
}

/** Midnight AFTER the given UTC day (exclusive upper bound). */
function dayAfter(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

class AdminAuditRepository {
  private coll() {
    return collections.auditLogs();
  }

  /**
   * Newest-first audit listing with actor/action/resource filters,
   * inclusive UTC day range, free-text search over actor/resource fields,
   * real pagination, and unfiltered facet distributions.
   */
  async list(query: AdminAuditListQuery): Promise<AdminAuditListResult> {
    const filter: Filter<AuditLogDoc> = {};

    if (query.actor) {
      filter.actorUsername = query.actor;
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.resourceType) {
      filter.resourceType = query.resourceType;
    }
    if (query.from) {
      filter.createdAt = { ...(filter.createdAt as object), $gte: query.from } as Filter<AuditLogDoc>["createdAt"];
    }
    if (query.to) {
      // Inclusive day end: everything before midnight after `to` (UTC).
      filter.createdAt = { ...(filter.createdAt as object), $lt: dayAfter(query.to) } as Filter<AuditLogDoc>["createdAt"];
    }

    const search = query.search.trim();
    if (search) {
      const pattern = escapeRegExp(search);
      filter.$or = [
        { actorUsername: { $regex: pattern, $options: "i" } },
        { action: { $regex: pattern, $options: "i" } },
        { resourceType: { $regex: pattern, $options: "i" } },
        { resourceId: { $regex: pattern, $options: "i" } },
        { resourceLabel: { $regex: pattern, $options: "i" } },
      ];
    }

    const pageSize = query.pageSize;
    const page = query.page;

    const [total, docs, actorRows, actionRows, resourceRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$actorUsername", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$action", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$resourceType", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    return {
      items: docs.map(toSafeAuditEntry),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        facets: {
          actors: actorRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          actions: actionRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          resourceTypes: resourceRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }
}

export const adminAuditRepository = new AdminAuditRepository();

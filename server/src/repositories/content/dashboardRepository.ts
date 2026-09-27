import type { Collection, Document, Sort, WithId } from "mongodb";

import { collections } from "../../db/collections.js";
import type {
  AdminContentSection,
  AdminDashboardData,
  AdminRecentItem,
  AdminSectionCount,
} from "../../../../client/src/types/index.js";

/**
 * Admin dashboard repository (Phase 9B) — real MongoDB-backed data for
 * GET /api/admin/dashboard.
 *
 * Read-only. The route layer has already enforced requireAdmin; this module
 * only assembles what the dashboard renders:
 *
 *  - counts  one group-by-status aggregation per content collection over the
 *            SAME status field the public repositories gate visibility with,
 *            so the breakdown always matches what the CMS will manage
 *            (blogs: draft/published/archived, members: active/alumni/
 *            archived, events: upcoming/…/cancelled). Alumni documents carry
 *            no status dimension, so that section reports the total only.
 *            Nothing is hard-coded or derived elsewhere — no fabricated
 *            statistics, ever.
 *  - recent  the newest couple of documents per collection, merged and
 *            trimmed, mapped through a strict allow-list projection
 *            (id/title/date/status/slug). Internal fields (searchText,
 *            bodies, emails, hashes) are never read, so they can never leak
 *            into the response.
 *
 * Admin-facing data intentionally ignores the public visibility gates —
 * drafts and archived records are exactly what an admin needs to see.
 */

/** How many documents each collection contributes to the recent feed. */
const RECENT_PER_SECTION = 2;
/** Final cap for the merged recent list (8 sections × 2 → newest 8 overall). */
const RECENT_TOTAL = 8;

/* --------------------------------- counts --------------------------------- */

/**
 * Count one section: total documents plus the real status breakdown.
 * `statusField: null` marks a collection without a status dimension —
 * the total comes from a plain countDocuments and statuses stays empty.
 */
async function countSection<T extends Document>(
  coll: Collection<T>,
  statusField: string | null,
): Promise<AdminSectionCount> {
  if (!statusField) {
    const total = await coll.countDocuments({});
    return { total, statuses: {} };
  }

  const rows = await coll
    .aggregate<{ _id: string | null; n: number }>([
      { $group: { _id: `$${statusField}`, n: { $sum: 1 } } },
    ])
    .toArray();

  const statuses: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    statuses[row._id ?? "unknown"] = row.n;
    total += row.n;
  }
  return { total, statuses };
}

/** Group-by-status totals for every dashboard section, in parallel. */
async function collectCounts(): Promise<Record<AdminContentSection, AdminSectionCount>> {
  const [events, blogs, alumni, gallery, videos, members, projects, feed] =
    await Promise.all([
      countSection(collections.events(), "status"),
      countSection(collections.blogs(), "status"),
      // Alumni documents have no publication/lifecycle state — total only.
      countSection(collections.alumni(), null),
      countSection(collections.galleryAlbums(), "status"),
      countSection(collections.videos(), "status"),
      countSection(collections.members(), "status"),
      countSection(collections.projects(), "status"),
      countSection(collections.feedPosts(), "status"),
    ]);

  return { events, blogs, alumni, gallery, videos, members, projects, feed };
}

/* --------------------------------- recent --------------------------------- */

/**
 * Newest documents of one collection, mapped through an allow-list
 * projection. Deliberately ignores the public visibility gate: the admin
 * dashboard must reflect drafts/archived content too.
 */
async function recentFrom<T extends Document>(
  coll: Collection<T>,
  sort: Sort,
  projection: Document,
  toItem: (doc: WithId<T>) => AdminRecentItem,
): Promise<AdminRecentItem[]> {
  const docs = await coll
    .find({}, { projection, sort })
    .limit(RECENT_PER_SECTION)
    .toArray();
  return docs.map(toItem);
}

/** Newest-first; dateless records (alumni) sink to the end, then A→Z. */
function compareRecent(a: AdminRecentItem, b: AdminRecentItem): number {
  if (a.date && b.date) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title);
  }
  if (a.date) return -1;
  if (b.date) return 1;
  return a.title.localeCompare(b.title);
}

/**
 * Recent records across every content collection — each mapped to the same
 * AdminRecentItem shape with only dashboard-safe fields.
 */
async function collectRecent(): Promise<AdminRecentItem[]> {
  const groups = await Promise.all([
    recentFrom(
      collections.events(),
      { date: -1 },
      { id: 1, title: 1, date: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "event",
        title: doc.title,
        date: doc.date,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
    recentFrom(
      collections.blogs(),
      { publishedAt: -1 },
      { id: 1, title: 1, publishedAt: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "blog",
        title: doc.title,
        date: doc.publishedAt,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
    // Alumni carry neither a date nor a status — batch is their only marker.
    recentFrom(
      collections.alumni(),
      { batchYear: -1, name: 1 },
      { id: 1, name: 1, username: 1 },
      (doc) => ({
        id: doc.id,
        type: "alumnus",
        title: doc.name,
        date: null,
        status: null,
        slug: doc.username,
      }),
    ),
    recentFrom(
      collections.galleryAlbums(),
      { date: -1 },
      { id: 1, title: 1, date: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "album",
        title: doc.title,
        date: doc.date,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
    recentFrom(
      collections.videos(),
      { publishedAt: -1 },
      { id: 1, title: 1, publishedAt: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "video",
        title: doc.title,
        date: doc.publishedAt,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
    recentFrom(
      collections.members(),
      { joinedAt: -1, batchYear: -1 },
      { id: 1, name: 1, joinedAt: 1, status: 1, username: 1 },
      (doc) => ({
        id: doc.id,
        type: "member",
        title: doc.name,
        date: doc.joinedAt ?? null,
        status: doc.status,
        slug: doc.username,
      }),
    ),
    recentFrom(
      collections.projects(),
      { updatedAt: -1 },
      { id: 1, title: 1, updatedAt: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "project",
        title: doc.title,
        date: doc.updatedAt,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
    recentFrom(
      collections.feedPosts(),
      { publishedAt: -1 },
      { id: 1, title: 1, publishedAt: 1, status: 1, slug: 1 },
      (doc) => ({
        id: doc.id,
        type: "post",
        title: doc.title,
        date: doc.publishedAt,
        status: doc.status,
        slug: doc.slug,
      }),
    ),
  ]);

  return groups.flat().sort(compareRecent).slice(0, RECENT_TOTAL);
}

/* -------------------------------- snapshot -------------------------------- */

/** Assemble the full dashboard payload — two parallel read phases. */
export async function getAdminDashboardSnapshot(): Promise<AdminDashboardData> {
  const [counts, recent] = await Promise.all([collectCounts(), collectRecent()]);
  return {
    counts,
    recent,
    // Server-clock snapshot time — the client renders it as "as of".
    generatedAt: new Date().toISOString(),
  };
}

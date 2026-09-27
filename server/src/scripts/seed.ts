import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnyBulkWriteOperation, Document, Filter } from "mongodb";
import { createServer as createViteServer, type ViteDevServer } from "vite";

import { seedDevelopmentUsers } from "../auth/seed.js";
import { closeDatabase, connectDatabase, getDatabase } from "../db/client.js";
import { ensureDatabaseIndexes } from "../db/indexes.js";
import { parseDurationMinutes } from "../repositories/content/text.js";
import { logger } from "../utils/logger.js";

/**
 * SCS data import / seeding (Phase 8, spec §8).
 *
 * Converts the CANONICAL client datasets (client/src/data/*.ts) into
 * MongoDB documents — no data is retyped. The modules are loaded through a
 * headless Vite instance (`ssrLoadModule`) so asset imports resolve to the
 * exact URLs the dev server serves, and the Lucide icon components used in
 * profile social links are serialized to registry KEYS (the client service
 * layer resolves them back to components — UI code unchanged).
 *
 * Determinism & safety:
 *   - documents are keyed by the canonical `id` (used as _id) and UPSERTED,
 *     so re-running never duplicates
 *   - content collections are fully owned by the seed: stale documents that
 *     no longer exist in the source are pruned
 *   - users/sessions are NEVER touched by the content seed; demo accounts
 *     are created-if-missing only (never overwritten) via seedDevelopmentUsers
 *   - passwords/hashes are never printed
 *
 * Usage (from server/):  npm run db:seed [content|users|all]
 */

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../client");

/* ------------------------- icon serialization ------------------------- */

/** Fallback key when an icon cannot be identified (client renders a link icon). */
const FALLBACK_ICON_KEY = "link";

function iconKeyOf(value: unknown): string {
  if (typeof value === "function") {
    const name = (value as { displayName?: string }).displayName ?? value.name;
    if (name) return name.toLowerCase();
  }
  if (typeof value === "object" && value !== null) {
    const displayName = (value as { displayName?: string }).displayName;
    if (typeof displayName === "string" && displayName) return displayName.toLowerCase();
  }
  return FALLBACK_ICON_KEY;
}

/** Is this object a React component (Lucide icons are forwardRef objects)? */
function isComponent(value: object): boolean {
  return "$$typeof" in value || "render" in value;
}

/** Deep JSON-safe serialization: components → icon keys, drop undefineds. */
function deepSerialize(value: unknown): unknown {
  if (value === null) return null;

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return value;
  if (type === "undefined") return undefined;
  if (type === "function") return iconKeyOf(value);

  const obj = value as object;
  if (isComponent(obj)) return iconKeyOf(obj);
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((entry) => deepSerialize(entry) ?? null);
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const serialized = deepSerialize(entry);
    if (serialized !== undefined) out[key] = serialized;
  }
  return out;
}

/* ------------------------- searchText (mirrors lib/*Search) ------------------------- */

/** Flatten blog content blocks to searchable text — port of blockText(). */
function blogBlockText(block: {
  type: string;
  text?: string;
  items?: string[];
  caption?: string;
  code?: string;
}): string {
  switch (block.type) {
    case "paragraph":
    case "quote":
    case "callout":
    case "heading":
      return block.text ?? "";
    case "list":
      return (block.items ?? []).join(" ");
    case "code":
      return `${block.caption ?? ""} ${block.code ?? ""}`;
    default:
      return "";
  }
}

const haystack = (parts: unknown[]) =>
  parts
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();

type Searchable = Record<string, unknown> & { id?: string };

const SEARCH_FIELDS: Record<string, (record: Searchable) => string> = {
  events: (e) => haystack([e.title, e.excerpt, e.description, e.category, e.location, e.organizer, e.tags]),
  blogs: (b) =>
    haystack([
      b.title,
      b.excerpt,
      b.category,
      (b.author as { name?: string })?.name,
      b.tags,
      ((b.content ?? []) as Array<{ type: string; text?: string; items?: string[]; caption?: string; code?: string }>).map(blogBlockText),
    ]),
  gallery_albums: (a) => haystack([a.title, a.description, a.category, a.location, a.tags]),
  videos: (v) => haystack([v.title, v.excerpt, v.description, v.category, v.speaker, v.tags]),
  members: (m) =>
    haystack([m.name, m.username, m.role, m.company, m.batch, m.department, m.domain, m.bio, m.location, m.skills, m.interests]),
  projects: (p) => haystack([p.title, p.tagline, p.description, p.category, p.technologies, p.tags]),
  feed_posts: (f) => haystack([f.title, f.excerpt, f.content, f.authorName, f.authorUsername, f.tags]),
  alumni: (a) => haystack([a.name, a.role, a.company, a.field, a.achievement, a.skills]),
};

/* ------------------------------ data loading ------------------------------ */

interface SeedSource {
  events: Searchable[];
  blogs: Searchable[];
  albums: Searchable[];
  videos: Searchable[];
  members: Searchable[];
  projects: Searchable[];
  posts: Searchable[];
  alumni: Searchable[];
}

async function loadCanonicalData(vite: ViteDevServer): Promise<SeedSource> {
  const load = async (modulePath: string) => {
    const mod = (await vite.ssrLoadModule(modulePath)) as Record<string, unknown>;
    return mod;
  };

  const [events, blogs, gallery, watch, members, projects, feed, alumni] = await Promise.all([
    load("/src/data/events.ts"),
    load("/src/data/blogs.ts"),
    load("/src/data/gallery.ts"),
    load("/src/data/watch.ts"),
    load("/src/data/members.ts"),
    load("/src/data/projects.ts"),
    load("/src/data/feed.ts"),
    load("/src/data/alumni.ts"),
  ]);

  const pick = (mod: Record<string, unknown>, key: string): Searchable[] => {
    const value = mod[key];
    if (!Array.isArray(value)) throw new Error(`Seed source ${key} is missing or not an array`);
    return value as Searchable[];
  };

  return {
    events: pick(events, "EVENTS"),
    blogs: pick(blogs, "BLOGS"),
    albums: pick(gallery, "GALLERY_ALBUMS"),
    videos: pick(watch, "WATCH_VIDEOS"),
    members: pick(members, "MEMBERS"),
    projects: pick(projects, "PROJECTS"),
    posts: pick(feed, "FEED_POSTS"),
    alumni: pick(alumni, "ALUMNI"),
  };
}

/* ------------------------------ doc building ------------------------------ */

interface BuiltDoc {
  collection: string;
  docs: Array<Record<string, unknown> & { _id: string; searchText: string }>;
}

function buildDocs(source: SeedSource): BuiltDoc[] {
  const build = (
    collection: string,
    records: Searchable[],
    extra?: (record: Searchable) => Record<string, unknown>,
  ): BuiltDoc => ({
    collection,
    docs: records.map((record) => {
      const serialized = deepSerialize(record) as Record<string, unknown>;
      const id = String(record.id ?? "");
      if (!id) throw new Error(`[${collection}] record without canonical id: ${JSON.stringify(record).slice(0, 80)}`);
      return {
        ...serialized,
        ...(extra ? extra(record) : {}),
        _id: id,
        searchText: SEARCH_FIELDS[collection](record),
      };
    }),
  });

  return [
    build("events", source.events),
    build("blogs", source.blogs),
    build("gallery_albums", source.albums),
    // Videos carry a numeric duration (minutes) for bucket filtering —
    // exactly the client's parseDurationMinutes, no unit conversions.
    build("videos", source.videos, (record) => ({
      durationMinutes: parseDurationMinutes(String(record.duration ?? "")),
    })),
    build("members", source.members),
    build("projects", source.projects),
    build("feed_posts", source.posts),
    build("alumni", source.alumni),
  ];
}

/* ------------------------------ persistence ------------------------------ */

async function seedContent(source: SeedSource): Promise<ReportEntry[]> {
  const groups = buildDocs(source);
  const report: ReportEntry[] = [];

  for (const { collection, docs } of groups) {
    // String-keyed _id documents — typed locally so bulk filters check.
    const coll = getDatabase().collection<Document>(collection);

    // Deterministic upserts keyed by _id (the canonical id).
    // NOTE: SCS uses string _ids (canonical dataset ids) rather than
    // ObjectIds — the driver's Filter<Document> types model ObjectId, so
    // the ops are narrowed through `unknown` at this single boundary.
    if (docs.length > 0) {
      const ops = docs.map(
        (doc) =>
          ({
            replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
          }) as unknown as AnyBulkWriteOperation,
      );
      await coll.bulkWrite(ops, { ordered: false });
    }

    // Prune documents that no longer exist in the canonical source so
    // re-seeding after data removal stays truthful.
    const keepIds = docs.map((doc) => doc._id);
    const prune = keepIds.length > 0 ? { _id: { $nin: keepIds } } : {};
    const { deletedCount } = await coll.deleteMany(prune as unknown as Filter<Document>);

    report.push({ collection, seeded: docs.length, pruned: deletedCount });
    logger.info(
      `[seed] ${collection}: ${docs.length} documents upserted${deletedCount > 0 ? `, ${deletedCount} pruned` : ""}`,
    );
  }

  return report;
}

interface ReportEntry {
  collection: string;
  seeded: number;
  pruned: number;
}

/** Spec §26 — compare seeded counts against the canonical source. */
async function verifyIntegrity(source: SeedSource, report: ReportEntry[]): Promise<string[]> {
  const expected: Array<[string, number]> = [
    ["events", source.events.length],
    ["blogs", source.blogs.length],
    ["gallery_albums", source.albums.length],
    ["videos", source.videos.length],
    ["members", source.members.length],
    ["projects", source.projects.length],
    ["feed_posts", source.posts.length],
    ["alumni", source.alumni.length],
  ];

  const mismatches: string[] = [];
  for (const [collection, want] of expected) {
    const entry = report.find((r) => r.collection === collection);
    const got = entry?.seeded ?? 0;
    if (got !== want) {
      mismatches.push(`${collection}: expected ${want}, seeded ${got}`);
    }
  }

  // Slug uniqueness is enforced by unique indexes — surface violations as
  // integrity failures rather than silent data loss.
  for (const [collection, slugField] of [
    ["events", "slug"],
    ["blogs", "slug"],
    ["gallery_albums", "slug"],
    ["videos", "slug"],
    ["members", "username"],
    ["projects", "slug"],
    ["feed_posts", "slug"],
    ["alumni", "username"],
  ] as const) {
    const duplicates = await getDatabase()
      .collection(collection)
      .aggregate<{ _id: string; n: number }>([
        { $group: { _id: `$${slugField}`, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
      ])
      .toArray();
    if (duplicates.length > 0) {
      mismatches.push(`${collection}: duplicate ${slugField}: ${duplicates.map((d) => d._id).join(", ")}`);
    }
  }

  return mismatches;
}

/* ---------------------------------- main ---------------------------------- */

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "all"; // all | content | users

  logger.info("[seed] starting — loading canonical datasets via Vite…");
  const vite = await createViteServer({
    root: clientRoot,
    logLevel: "error",
    server: { middlewareMode: true },
    appType: "custom",
    // Headless data loading only — no browser dep optimization/HTML scan.
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const source = await loadCanonicalData(vite);
    const total = Object.values(source).reduce((sum, list) => sum + list.length, 0);
    logger.info(
      `[seed] canonical data loaded: ${total} records across ${Object.keys(source).length} datasets`,
    );

    await connectDatabase();
    await ensureDatabaseIndexes(getDatabase());

    if (mode === "users" || mode === "all") {
      await seedDevelopmentUsers();
    }

    if (mode === "content" || mode === "all") {
      const report = await seedContent(source);
      const mismatches = await verifyIntegrity(source, report);

      logger.info("[seed] integrity check (spec §26):");
      for (const entry of report) {
        logger.info(`  ${entry.collection.padEnd(16)} seeded=${entry.seeded}`);
      }

      if (mismatches.length > 0) {
        logger.error("[seed] INTEGRITY MISMATCH:");
        for (const message of mismatches) logger.error(`  - ${message}`);
        process.exitCode = 1;
      } else {
        logger.info("[seed] integrity OK — no content lost.");
      }
    }

    logger.info("[seed] done.");
  } finally {
    await vite.close().catch(() => undefined);
    await closeDatabase();
  }
}

main().catch((error) => {
  logger.error("[seed] fatal:", error);
  process.exit(1);
});

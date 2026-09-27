import { randomBytes } from "node:crypto";

import { getDatabase } from "../../db/client.js";
import { collections, type CategoryDoc } from "../../db/collections.js";
import { describeMongoError, isDuplicateKeyError } from "../../db/errors.js";
import { CATEGORY_SECTIONS, type CategorySection } from "../../content/types.js";
import { logger } from "../../utils/logger.js";

/**
 * Category vocabulary repository (Phase 10C).
 *
 * The `category` field on events/blogs/gallery/videos/projects has always
 * been a plain string — these documents only ADD a managed vocabulary on
 * top. Content documents remain the source of truth for what is IN USE
 * (removing an in-use name is refused, renaming one rewrites the content
 * collection), so public filters and stored data can never drift apart.
 *
 * Defaults: curated starter lists are ensured lazily — a section with zero
 * vocabulary documents gets its defaults on server startup (and via the
 * seed tooling), so existing databases upgrade with no manual step. Admin
 * deletions are respected: once a section has ANY vocabulary documents,
 * startup never re-inserts anything.
 */

/** Safe projection returned to controllers — never expose internal fields. */
export interface CategoryListItem {
  id: string;
  name: string;
}

/** Hard cap per section — the picker stays usable; 60-char names bounded upstream. */
const MAX_CATEGORIES_PER_SECTION = 40;

/** Curated starter vocabulary — mirrors the original hardcoded UI lists. */
export const DEFAULT_CATEGORIES: Record<CategorySection, readonly string[]> = {
  events: ["Workshops", "Seminars", "Hackathons", "Competitions", "Tech Talks", "Community", "Career"],
  blogs: [
    "Technology",
    "Career Advice",
    "Tutorials",
    "Industry Insights",
    "Student Life",
    "Events",
  ],
  gallery: ["Events", "Workshops", "Ceremonies", "Trips"],
  videos: ["Talks", "Tutorials", "Recaps", "Workshops"],
  projects: ["Web", "AI/ML", "Mobile", "Systems", "Security"],
};

/** Where each section's category values live (collection name + field). */
const SECTION_TARGETS: Record<CategorySection, { collectionName: string; field: string }> = {
  events: { collectionName: "events", field: "category" },
  blogs: { collectionName: "blogs", field: "category" },
  gallery: { collectionName: "gallery_albums", field: "category" },
  videos: { collectionName: "videos", field: "category" },
  projects: { collectionName: "projects", field: "category" },
};

/** Untyped content-collection handle for the generic category rewrite. */
function sectionCollection(section: CategorySection) {
  return getDatabase().collection(SECTION_TARGETS[section].collectionName);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function generateCategoryId(): string {
  return `cat-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

function toListItem(doc: CategoryDoc): CategoryListItem {
  return { id: doc._id, name: doc.name };
}

async function listDocs(section: CategorySection): Promise<CategoryDoc[]> {
  return collections
    .categories()
    .find({ section })
    .sort({ createdAt: 1, name: 1 })
    .maxTimeMS(5000)
    .toArray();
}

/** Ordered vocabulary for one section (insertion order, ties by name). */
export async function listCategories(section: CategorySection): Promise<CategoryListItem[]> {
  const docs = await listDocs(section);
  return docs.map(toListItem);
}

export type CategoryWriteResult =
  | { ok: true; categories: CategoryListItem[]; rewritten?: number }
  | { ok: false; reason: "duplicate" | "limit" | "not_found" | "in_use"; inUse?: number; categories?: CategoryListItem[] };

/** POST — add one name (case-insensitive dedupe). */
export async function addCategory(section: CategorySection, rawName: string): Promise<CategoryWriteResult> {
  const name = rawName.trim();
  const normalizedName = normalizeName(name);

  const existing = await listDocs(section);
  if (existing.some((doc) => doc.normalizedName === normalizedName)) {
    return { ok: false, reason: "duplicate", categories: existing.map(toListItem) };
  }
  if (existing.length >= MAX_CATEGORIES_PER_SECTION) {
    return { ok: false, reason: "limit", categories: existing.map(toListItem) };
  }

  const doc: CategoryDoc = {
    _id: generateCategoryId(),
    section,
    name,
    normalizedName,
    createdAt: new Date().toISOString(),
  };
  try {
    await collections.categories().insertOne(doc);
  } catch (error) {
    // Two concurrent adds of the same name — the unique index wins; report dup.
    if (isDuplicateKeyError(error)) {
      return { ok: false, reason: "duplicate", categories: (await listDocs(section)).map(toListItem) };
    }
    throw error;
  }
  return { ok: true, categories: await listCategories(section) };
}

/** PATCH — rename one entry and rewrite the section's content documents. */
export async function renameCategory(
  section: CategorySection,
  id: string,
  rawName: string,
): Promise<CategoryWriteResult> {
  const name = rawName.trim();
  const normalizedName = normalizeName(name);

  const all = await collections.categories();
  const current = await all.findOne({ _id: id, section });
  if (!current) {
    return { ok: false, reason: "not_found" };
  }

  const collision = await all.findOne({ section, normalizedName, _id: { $ne: id } });
  if (collision) {
    return { ok: false, reason: "duplicate", categories: (await listDocs(section)).map(toListItem) };
  }

  const { field } = SECTION_TARGETS[section];
  const rewritten = await sectionCollection(section).updateMany(
    { [field]: current.name },
    { $set: { [field]: name } },
  );

  await all.updateOne({ _id: id, section }, { $set: { name, normalizedName } });
  return {
    ok: true,
    categories: await listCategories(section),
    rewritten: rewritten.modifiedCount,
  };
}

/** DELETE — refuse while any content document still uses the name. */
export async function deleteCategory(section: CategorySection, id: string): Promise<CategoryWriteResult> {
  const all = collections.categories();
  const current = await all.findOne({ _id: id, section });
  if (!current) {
    return { ok: false, reason: "not_found" };
  }

  const { field } = SECTION_TARGETS[section];
  const inUse = await sectionCollection(section).countDocuments({ [field]: current.name });
  if (inUse > 0) {
    return { ok: false, reason: "in_use", inUse, categories: (await listDocs(section)).map(toListItem) };
  }

  await all.deleteOne({ _id: id, section });
  return { ok: true, categories: await listCategories(section) };
}

/** Distinct in-use category values for one section (public facet helper). */
export async function inUseCategoryNames(section: CategorySection): Promise<string[]> {
  const { field } = SECTION_TARGETS[section];
  const values = await sectionCollection(section).distinct<string>(field, { [field]: { $nin: [null, ""] } });
  return values.filter((value): value is string => typeof value === "string").sort((a, b) => a.localeCompare(b));
}

/**
 * Startup/seed helper — seed each section's defaults ONCE (only when the
 * section has no vocabulary documents at all). Idempotent; never resurrects
 * admin-deleted names once any vocabulary exists for that section.
 */
export async function ensureDefaultCategories(): Promise<void> {
  for (const section of CATEGORY_SECTIONS) {
    try {
      const count = await collections.categories().countDocuments({ section });
      if (count > 0) continue;
      const now = new Date().toISOString();
      const docs: CategoryDoc[] = DEFAULT_CATEGORIES[section].map((name, index) => ({
        _id: generateCategoryId(),
        section,
        name,
        normalizedName: normalizeName(name),
        // Deterministic ordering for the initial insert.
        createdAt: new Date(Date.parse(now) + index).toISOString(),
      }));
      if (docs.length > 0) {
        await collections.categories().insertMany(docs);
        logger.info(`[categories] seeded ${docs.length} default categories for "${section}"`);
      }
    } catch (error) {
      // Never block startup on vocabulary seeding — the API still works with
      // free-string categories; log and continue.
      logger.error(`[categories] failed to seed defaults for "${section}":`, describeMongoError(error));
    }
  }
}

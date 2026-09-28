import { getDatabase } from "../../db/client.js";
import type { AdminPermission } from "../../auth/types.js";

/**
 * Slug availability repository (Phase 10C).
 *
 * One shared implementation for every slug-bearing CMS section so the
 * admin forms can CHECK BEFORE WRITE: the generated slug is searched
 * against the live collection and, when taken, the next free numbered
 * variant (`my-title-2`, `my-title-3`, …) is suggested. The server remains
 * the authority — create/update still reject duplicates with 409 even if
 * a client skips this check (unique indexes backstop everything).
 *
 * Alumni/members key their public pages by `username` (no slug field),
 * so those sections check usernames instead — same uniqueness rule.
 */

/** Section (admin permission) → collection name + unique handle field.
 *
 *  "team" (Phase 12) is deliberately NOT here — team cards render in
 *  listing sections only (no public detail page), so there is no unique
 *  handle to check. The slug-check endpoint rejects the section (400). */
type SlugCheckPermission = Exclude<AdminPermission, "team">;

const SLUG_TARGETS: Record<SlugCheckPermission, { collectionName: string; field: "slug" | "username" }> = {
  events: { collectionName: "events", field: "slug" },
  blogs: { collectionName: "blogs", field: "slug" },
  gallery: { collectionName: "gallery_albums", field: "slug" },
  videos: { collectionName: "videos", field: "slug" },
  projects: { collectionName: "projects", field: "slug" },
  feed: { collectionName: "feed_posts", field: "slug" },
  alumni: { collectionName: "alumni", field: "username" },
  members: { collectionName: "members", field: "username" },
};

export type SlugCheckSection = keyof typeof SLUG_TARGETS;

export function isSlugCheckSection(value: string): value is SlugCheckSection {
  return Object.prototype.hasOwnProperty.call(SLUG_TARGETS, value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface SlugAvailability {
  /** True when the slug can be used right now (or only by `excludeId`). */
  available: boolean;
  /** The requested slug (echoed for client-side confirmation). */
  slug: string;
  /** When taken: the first free `slug-2`-style variant. Otherwise equals slug. */
  suggestion: string;
}

/**
 * Search-first availability check: exact match probe, then a numbered
 * suffix scan over the existing near-collisions to find the first free
 * variant. Cap the scan so a pathological dataset cannot loop forever.
 */
export async function checkSlugAvailability(
  section: SlugCheckSection,
  slug: string,
  excludeId?: string,
): Promise<SlugAvailability> {
  const { collectionName, field } = SLUG_TARGETS[section];
  // String _id documents (canonical ids like "evt-01") — not ObjectIds.
  const collection = getDatabase().collection<{ _id?: string; slug?: string; username?: string }>(collectionName);
  const idFilter = excludeId ? { _id: { $ne: excludeId } } : {};

  const taken = await collection.countDocuments({ [field]: slug, ...idFilter });
  if (taken === 0) {
    return { available: true, slug, suggestion: slug };
  }

  // Collect every `slug` / `slug-<n>` variant in one indexed-prefix query.
  const pattern = new RegExp(`^${escapeRegex(slug)}(-\\d+)?$`);
  const existing = await collection.distinct(field, {
    [field]: pattern,
    ...idFilter,
  });
  const usedSuffixes = new Set<number>(
    existing
      .filter((value): value is string => typeof value === "string")
      .map((value) => (value === slug ? 1 : Number(value.slice(slug.length + 1))))
      .filter((n) => Number.isInteger(n) && n >= 1),
  );

  const MAX_PROBES = 200;
  for (let n = 2; n <= MAX_PROBES + 1; n += 1) {
    if (!usedSuffixes.has(n)) {
      return { available: false, slug, suggestion: `${slug}-${n}` };
    }
  }
  // Absurdly dense collision space — fall back to a time-unique suffix.
  return { available: false, slug, suggestion: `${slug}-${Date.now().toString(36)}` };
}

/**
 * Shared slugify for backend handle generation (Task 16) — the same rules
 * the client form libraries have always used, so a generated handle looks
 * exactly like one an admin would have typed: kebab-case, & → "and",
 * non-alphanumerics collapsed, capped at 80 characters.
 */
export function slugifyHandle(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Auto-generate a unique public handle from a source text (title/name).
 *
 * Task 16 removed the slug/username input from every admin form — the
 * backend is now the sole author of new handles: slugify the source text
 * and run the same search-first availability check the slug-check endpoint
 * uses, so a collision becomes a clean `my-title-2` variant instead of a
 * 409. Non-latin titles slugify to "" and fall back to a time-unique
 * section-prefixed handle so a create never fails for lack of a handle.
 */
export async function generateUniqueHandle(
  section: SlugCheckSection,
  sourceText: string,
): Promise<string> {
  const base = slugifyHandle(sourceText ?? "");
  const seed = base || `${section}-${Date.now().toString(36)}`;
  const availability = await checkSlugAvailability(section, seed);
  return availability.available ? availability.slug : availability.suggestion;
}

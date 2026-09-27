import type { GalleryAlbum } from "@/types";

/**
 * Pure gallery filtering / sorting / selection helpers.
 *
 * Kept completely independent from React so the same contracts can be
 * re-used against the future `GET /api/gallery` endpoint (send the filters
 * as query params) without touching page or component code.
 *
 * Mirrors lib/eventSearch.ts and lib/blogSearch.ts conventions: plain data
 * in, plain data out, no side effects, no framework imports.
 *
 * Future MongoDB/R2 mapping: albums live in MongoDB (metadata + photo URL
 * arrays); photo `src` values point at Cloudflare R2 objects served via CDN.
 * Nothing here needs to change when that swap happens.
 */

export interface GalleryFilters {
  /** Free-text query — matches title, description, category, tags, location. */
  query: string;
  /** Selected category ("" = all). */
  category: string;
  /** Selected capture year as a display string, e.g. "2026" ("" = all). */
  year: string;
}

/* ---------- Status gate ---------------------------------------------------- */

/**
 * The published-only gate. Archived albums never reach public pages; every
 * other helper in this module assumes a published input, so services call
 * this first.
 */
export function getPublishedAlbums(albums: GalleryAlbum[]): GalleryAlbum[] {
  return albums.filter((album) => album.status === "published");
}

/* ---------- Sorting / lookup ------------------------------------------------ */

/** Most recent captures first — the canonical gallery listing order. */
export function sortAlbumsByDateDesc(albums: GalleryAlbum[]): GalleryAlbum[] {
  return [...albums].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Lookup by URL slug for /gallery/:albumSlug. */
export function getAlbumBySlug(
  albums: GalleryAlbum[],
  slug: string | undefined,
): GalleryAlbum | undefined {
  if (!slug) return undefined;
  return albums.find((album) => album.slug === slug);
}

/** The single featured album highlighted on /gallery. */
export function getFeaturedAlbum(albums: GalleryAlbum[]): GalleryAlbum | undefined {
  return albums.find((album) => album.featured);
}

/* ---------- Filtering -------------------------------------------------------- */

/**
 * Filter published albums by query + category + year.
 * Empty string on any filter means "no constraint".
 */
export function filterAlbums(
  albums: GalleryAlbum[],
  filters: GalleryFilters,
): GalleryAlbum[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return albums.filter((album) => {
    if (filters.category && album.category !== filters.category) return false;

    if (filters.year && album.date.slice(0, 4) !== filters.year) return false;

    if (normalizedQuery) {
      const haystack = [
        album.title,
        album.description,
        album.category,
        album.location ?? "",
        album.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/**
 * Distinct capture years across published albums, newest first — feeds the
 * year filter chips. Derived from the data (never hardcoded in pages) so
 * adding an album from a new year automatically extends the filter.
 */
export function getGalleryYears(albums: GalleryAlbum[]): string[] {
  const years = new Set(albums.map((album) => album.date.slice(0, 4)));
  return [...years].sort((a, b) => b.localeCompare(a));
}

/* ---------- Related-album selection ----------------------------------------- */

/**
 * Pick related albums for an album detail page.
 *
 * Scoring: same category weighs most, shared tags add up, and albums from
 * the same event (eventSlug match) get a strong boost since they document
 * the same moment. Equal scores break by recency. Excludes the current
 * album. Pure and extracted from the component so it can move server-side
 * (or into a query hook) without UI changes.
 */
export function getRelatedAlbums(
  albums: GalleryAlbum[],
  current: GalleryAlbum,
  count = 3,
): GalleryAlbum[] {
  const currentTags = new Set(current.tags);

  const scored = albums
    .filter((album) => album.id !== current.id)
    .map((album) => {
      let score = 0;
      if (album.category === current.category) score += 2;
      if (album.eventSlug && album.eventSlug === current.eventSlug) score += 3;
      for (const tag of album.tags) {
        if (currentTags.has(tag)) score += 1;
      }

      return {
        album,
        score,
        time: new Date(album.date).getTime(),
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest captures first
    });

  return scored.slice(0, count).map((entry) => entry.album);
}

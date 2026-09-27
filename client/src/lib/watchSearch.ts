import type { WatchVideo } from "@/types";

/**
 * Pure watch filtering / sorting / selection helpers.
 *
 * Kept completely independent from React so the same contracts can be
 * re-used against the future `GET /api/watch` endpoint (send the filters
 * as query params) without touching page or component code.
 *
 * Mirrors lib/eventSearch.ts / lib/blogSearch.ts / lib/gallerySearch.ts
 * conventions: plain data in, plain data out, no side effects, no framework
 * imports.
 */

export interface WatchFilters {
  /** Free-text query — matches title, excerpt, description, category, tags, speaker. */
  query: string;
  /** Selected category ("" = all). */
  category: string;
  /** Selected duration bucket ("" = all). */
  duration: string;
}

/* ---------- Status gate ---------------------------------------------------- */

/**
 * The published-only gate. Archived videos never reach public pages; every
 * other helper in this module assumes a published input, so services call
 * this first.
 */
export function getPublishedVideos(videos: WatchVideo[]): WatchVideo[] {
  return videos.filter((video) => video.status === "published");
}

/* ---------- Duration helpers ------------------------------------------------- */

/**
 * "52:14" → 52.2 minutes; "1:02:18" → 62.3 minutes.
 * Durations are display strings (editorial data), so this parses rather
 * than trusts a numeric field.
 */
export function parseDurationMinutes(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 60 + m + s / 60;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m + s / 3600;
  }
  return 0;
}

/** True when the video's duration falls inside the display bucket. */
export function matchesDurationBucket(video: WatchVideo, bucket: string): boolean {
  const minutes = parseDurationMinutes(video.duration);

  switch (bucket) {
    case "Under 15 min":
      return minutes < 15;
    case "15–30 min":
      return minutes >= 15 && minutes < 30;
    case "30–60 min":
      return minutes >= 30 && minutes < 60;
    case "Over 1 hour":
      return minutes >= 60;
    default:
      return true;
  }
}

/* ---------- Sorting / lookup ------------------------------------------------ */

/** Newest releases first — the canonical watch listing order. */
export function sortVideosByDateDesc(videos: WatchVideo[]): WatchVideo[] {
  return [...videos].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Lookup by URL slug for /watch/:videoSlug. */
export function getVideoBySlug(
  videos: WatchVideo[],
  slug: string | undefined,
): WatchVideo | undefined {
  if (!slug) return undefined;
  return videos.find((video) => video.slug === slug);
}

/** The single featured video highlighted on /watch. */
export function getFeaturedVideo(videos: WatchVideo[]): WatchVideo | undefined {
  return videos.find((video) => video.featured);
}

/* ---------- Filtering -------------------------------------------------------- */

/**
 * Filter published videos by query + category + duration bucket.
 * Empty string on any filter means "no constraint".
 */
export function filterVideos(
  videos: WatchVideo[],
  filters: WatchFilters,
): WatchVideo[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return videos.filter((video) => {
    if (filters.category && video.category !== filters.category) return false;

    if (filters.duration && !matchesDurationBucket(video, filters.duration)) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = [
        video.title,
        video.excerpt,
        video.description,
        video.category,
        video.speaker ?? "",
        video.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/* ---------- Related-video selection ------------------------------------------ */

/**
 * Pick related videos for a video detail page.
 *
 * Scoring: same category weighs most, shared tags add up, and videos from
 * the same event (eventSlug match) get a strong boost since they cover the
 * same session. Equal scores break by recency. Excludes the current video.
 * Pure and extracted from the component so it can move server-side (or into
 * a query hook) without UI changes.
 */
export function getRelatedVideos(
  videos: WatchVideo[],
  current: WatchVideo,
  count = 3,
): WatchVideo[] {
  const currentTags = new Set(current.tags);

  const scored = videos
    .filter((video) => video.id !== current.id)
    .map((video) => {
      let score = 0;
      if (video.category === current.category) score += 2;
      if (video.eventSlug && video.eventSlug === current.eventSlug) score += 3;
      for (const tag of video.tags) {
        if (currentTags.has(tag)) score += 1;
      }

      return {
        video,
        score,
        time: new Date(video.publishedAt).getTime(),
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest first
    });

  return scored.slice(0, count).map((entry) => entry.video);
}

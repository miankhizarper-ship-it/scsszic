/**
 * Small text helpers shared by the content repositories (server-side mirrors
 * of the client lib search semantics).
 */

/** Escape a user-provided search term for safe embedding in a $regex. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse "h:mm:ss" / "m:ss" duration strings into minutes — the EXACT
 * semantics of the client's lib/watchSearch.parseDurationMinutes (the
 * 2-part branch contributes fractional minutes as m + s/60; both branches
 * agree with the client to within any bucket boundary).
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
    return m + s / 60;
  }
  return 0;
}

/** Watch duration buckets — same labels + boundaries as the UI filters. */
export function durationBucketRange(bucket: string): { min?: number; max?: number } {
  switch (bucket) {
    case "Under 15 min":
      return { max: 15 };
    case "15–30 min":
      return { min: 15, max: 30 };
    case "30–60 min":
      return { min: 30, max: 60 };
    case "Over 1 hour":
      return { min: 60 };
    default:
      return {};
  }
}

/**
 * Reference "now" for event date windows — pinned to the dataset's
 * documented demo window (September 2026) exactly like the client's
 * lib/eventSearch.DEMO_NOW (2026-09-25T00:00:00Z), keeping date filters
 * deterministic during QA. When real event data lands, change this single
 * constant on both sides.
 *
 * The DATE-ONLY form is used for the "Past" upper bound: string comparison
 * against it reproduces the client's `new Date(date) < DEMO_NOW` semantics
 * for both date-only and full-timestamp ISO values at the boundary day.
 */
export const DEMO_NOW_DATE = "2026-09-25";

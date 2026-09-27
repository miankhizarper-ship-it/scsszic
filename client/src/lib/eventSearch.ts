import type { SocietyEvent } from "@/types";

/**
 * Pure event filtering / sorting / selection helpers.
 *
 * Kept completely independent from React so the exact same contracts can be
 * re-used against the future `GET /api/events` endpoint (send the filters as
 * query params) without touching page or component code.
 *
 * Reference time: the mock dataset documents a September 2026 demo window,
 * so `DEMO_NOW` is pinned to it — making date filters deterministic during
 * QA. When real event data lands, replace this single constant with
 * `new Date()` and every filter keeps working.
 */
export const DEMO_NOW: Date = new Date("2026-09-25T00:00:00Z");

export interface EventFilters {
  /** Free-text query — matches title, excerpt, description, category, tags, location, organizer. */
  query: string;
  /** Selected category ("" = all). */
  category: string;
  /** Selected status in display case, e.g. "Upcoming" ("" = all). */
  status: string;
  /** Selected date window ("" = all). */
  date: string;
}

/* ---------- Internal date helpers (UTC-pinned, mirrors lib/format) --------- */

function utcDate(iso: string): Date {
  return new Date(iso);
}

function utcYearMonth(iso: string): string {
  return iso.slice(0, 7); // "2026-09"
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function matchesDateWindow(event: SocietyEvent, window: string): boolean {
  const nowMonth = DEMO_NOW.toISOString().slice(0, 7);

  switch (window) {
    case "This Month":
      return utcYearMonth(event.date) === nowMonth;
    case "Next Month":
      return utcYearMonth(event.date) === shiftMonth(nowMonth, 1);
    case "Past":
      return utcDate(event.date).getTime() < DEMO_NOW.getTime();
    default:
      return true;
  }
}

/* ---------- Filtering / sorting ------------------------------------------- */

/**
 * Filter events by query + category + status + date window.
 * Status accepts the display-case labels used by the filter chips.
 */
export function filterEvents(events: SocietyEvent[], filters: EventFilters): SocietyEvent[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.category && event.category !== filters.category) return false;

    if (filters.status && event.status !== filters.status.toLowerCase()) return false;

    if (filters.date && !matchesDateWindow(event, filters.date)) return false;

    if (normalizedQuery) {
      const haystack = [
        event.title,
        event.excerpt,
        event.description,
        event.category,
        event.location,
        event.organizer ?? "",
        ...(event.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/** Soonest first — chronological order for upcoming/live listings. */
export function sortEventsByDateAsc(events: SocietyEvent[]): SocietyEvent[] {
  return [...events].sort(
    (a, b) => utcDate(a.date).getTime() - utcDate(b.date).getTime(),
  );
}

/** Most recent first — for completed / past listings. */
export function sortEventsByDateDesc(events: SocietyEvent[]): SocietyEvent[] {
  return [...events].sort(
    (a, b) => utcDate(b.date).getTime() - utcDate(a.date).getTime(),
  );
}

/* ---------- Dataset selectors --------------------------------------------- */

/** Upcoming + live events, soonest first (the "Upcoming Events" section). */
export function getUpcomingEvents(events: SocietyEvent[]): SocietyEvent[] {
  return sortEventsByDateAsc(
    events.filter((event) => event.status === "upcoming" || event.status === "ongoing"),
  );
}

/** Completed + cancelled events, most recent first (the past-events section). */
export function getCompletedEvents(events: SocietyEvent[]): SocietyEvent[] {
  return sortEventsByDateDesc(
    events.filter((event) => event.status === "completed" || event.status === "cancelled"),
  );
}

/** Lookup by URL slug for /events/:slug. */
export function getEventBySlug(
  events: SocietyEvent[],
  slug: string | undefined,
): SocietyEvent | undefined {
  if (!slug) return undefined;
  return events.find((event) => event.slug === slug);
}

/** The single featured event highlighted on the events page. */
export function getFeaturedEvent(events: SocietyEvent[]): SocietyEvent | undefined {
  return events.find((event) => event.featured);
}

/* ---------- Related-event selection ---------------------------------------- */

/**
 * Pick related events for a detail page.
 *
 * Scoring: same category weighs most, shared tags add up, and equal scores
 * prefer soonest-upcoming so suggestions stay actionable. Excludes the
 * current event. Extracted from the component so it can move server-side
 * (or into a query hook) without UI changes.
 */
export function getRelatedEvents(
  events: SocietyEvent[],
  current: SocietyEvent,
  count = 3,
): SocietyEvent[] {
  const currentTags = new Set(current.tags ?? []);

  const scored = events
    .filter((event) => event.id !== current.id)
    .map((event) => {
      let score = 0;
      if (event.category === current.category) score += 2;
      for (const tag of event.tags ?? []) {
        if (currentTags.has(tag)) score += 1;
      }

      // Equal scores: prefer soonest upcoming/live event.
      const isLive = event.status === "upcoming" || event.status === "ongoing";
      const time = utcDate(event.date).getTime();

      return { event, score, live: isLive, time };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.live !== b.live) return a.live ? -1 : 1;
      return a.time - b.time;
    });

  return scored.slice(0, count).map((entry) => entry.event);
}

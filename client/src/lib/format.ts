/**
 * Date formatting helpers.
 *
 * Mock/API dates are stored as ISO 8601 strings and formatted with Intl,
 * pinned to UTC so a "October 12, 2026" event renders identically for
 * every visitor regardless of their local timezone.
 */

const fullDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const month = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
});

const cardDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const day = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  day: "numeric",
});

/** "2026-10-12" → "October 12, 2026" */
export function formatDateLong(iso: string): string {
  return fullDate.format(new Date(iso));
}

/** "2026-10-12" → "Oct" */
export function formatMonthShort(iso: string): string {
  return month.format(new Date(iso));
}

/** "2026-10-12" → "Oct 12, 2026" (compact card date). */
export function formatCardDate(iso: string): string {
  return cardDate.format(new Date(iso));
}

/** ISO datetime → "Oct 12, 2026, 14:05" (UTC — audit timestamps). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** "2026-10-12" → "12" */
export function formatDay(iso: string): string {
  return day.format(new Date(iso));
}

/**
 * Duration badge label — recordings synced from events carry no measurable
 * length ("0:00" placeholder), so the badge says what the item IS instead
 * of showing a fake duration.
 */
export function formatDurationLabel(duration: string): string {
  return duration.trim() === "0:00" ? "Recording" : duration;
}

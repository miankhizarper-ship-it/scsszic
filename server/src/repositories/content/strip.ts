/**
 * Document → domain mapping helpers (server-internal).
 *
 * Internal fields are stripped from EVERY API response:
 *   _id             — Mongo's handle; the domain `id` is the public one
 *   searchText      — seed-computed haystack powering server-side search
 *   durationMinutes — numeric watch-duration for filterable buckets
 */
export type InternalFields = "_id" | "searchText" | "durationMinutes";

/** The API-facing domain shape of a document. */
export type OmitInternal<T> = Omit<T, InternalFields>;

/** Strip internal fields — the single mapping every repository uses. */
export function stripInternals<
  T extends { _id: string; searchText?: string; durationMinutes?: number },
>(doc: T): OmitInternal<T> {
  const { _id, searchText, durationMinutes, ...domain } = doc;
  void searchText;
  void durationMinutes;
  return domain;
}

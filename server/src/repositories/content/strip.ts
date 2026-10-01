/**
 * Document → domain mapping helpers (server-internal).
 *
 * Internal fields are stripped from EVERY API response:
 *   _id             — Mongo's handle; the domain `id` is the public one
 *   searchText      — seed-computed haystack powering server-side search
 *   durationMinutes — numeric watch-duration for filterable buckets
 *   likedBy         — account ids behind a post's likes (privacy: never
 *                     crosses the API; the count is folded into `likes`)
 *   userId          — Task 29 member↔account linkage (server-internal;
 *                     the public site links profiles by handle, and the
 *                     ADMIN surface re-attaches it explicitly)
 */
export type InternalFields = "_id" | "searchText" | "durationMinutes" | "likedBy" | "userId";

/** The API-facing domain shape of a document. */
export type OmitInternal<T> = Omit<T, InternalFields>;

/** Strip internal fields — the single mapping every repository uses. */
export function stripInternals<
  T extends {
    _id: string;
    searchText?: string;
    durationMinutes?: number;
    likedBy?: string[];
    userId?: string;
  },
>(doc: T): OmitInternal<T> {
  const { _id, searchText, durationMinutes, likedBy, userId, ...domain } = doc;
  void searchText;
  void durationMinutes;
  void likedBy;
  void userId;
  return domain;
}

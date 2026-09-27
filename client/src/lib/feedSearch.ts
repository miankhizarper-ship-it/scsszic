/**
 * Feed search/filter semantics — mirrored 1:1 by the server's seed-computed
 * searchText and query-schema filters (spec §11/§12). The listing itself now
 * runs server-side; this module documents the contract and keeps the filter
 * shape the UI binds to.
 */
export interface FeedFilters {
  /** Free-text query — matches title, excerpt, content, author, tags. */
  query: string;
  /** Selected post type in lower-case token form ("" = all). */
  type: string;
  /** Selected tag ("" = all). */
  tag: string;
}

export const EMPTY_FEED_FILTERS: FeedFilters = { query: "", type: "", tag: "" };

/** True when any filter dimension is active (drives "Clear filters"). */
export function hasActiveFilters(filters: Partial<FeedFilters>): boolean {
  return Boolean(filters.query || filters.type || filters.tag);
}

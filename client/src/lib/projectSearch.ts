/**
 * Project search/filter semantics — mirrored 1:1 by the server's seed-computed
 * searchText (title, tagline, description, category, technologies, tags) and
 * query-schema filters (category, case-insensitive technology, status,
 * member roster). Listing runs server-side; this module documents the
 * contract and keeps the filter shape the UI binds to.
 */
export interface ProjectFilters {
  /** Free-text query across title, tagline, description, technologies, tags. */
  query: string;
  /** Selected category ("" = all). */
  category: string;
  /** Selected technology (case-insensitive match, "" = all). */
  technology: string;
  /** Lifecycle status — "active" | "completed" ("" = all). */
  status: string;
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  query: "",
  category: "",
  technology: "",
  status: "",
};

/** True when any filter dimension is active (drives "Clear filters"). */
export function hasActiveFilters(filters: Partial<ProjectFilters>): boolean {
  return Boolean(filters.query || filters.category || filters.technology || filters.status);
}

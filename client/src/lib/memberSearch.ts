/**
 * Member search/filter semantics — mirrored 1:1 by the server's seed-computed
 * searchText (name, username, role, company, batch, department, domain, bio,
 * location, skills, interests) and query-schema filters. Listing runs
 * server-side; this module documents the contract and keeps the filter shape
 * the UI binds to.
 */
export interface MemberFilters {
  /** Free-text query across every searchable member field. */
  query: string;
  /** Batch year as a display string, e.g. "2026" ("" = all). */
  batch: string;
  /** Primary domain, e.g. "Cybersecurity" ("" = all). */
  domain: string;
}

export const EMPTY_MEMBER_FILTERS: MemberFilters = { query: "", batch: "", domain: "" };

/** True when any filter dimension is active (drives "Clear filters"). */
export function hasActiveFilters(filters: Partial<MemberFilters>): boolean {
  return Boolean(filters.query || filters.batch || filters.domain);
}

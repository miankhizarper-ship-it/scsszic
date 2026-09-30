import { fetchSingle } from "@/services/contentApi";

/**
 * Site-stats service (Task 26) — the society's REAL headline numbers for
 * the home page. Derived server-side from the collections (archived
 * members and cancelled events never count; "workshops" = events whose
 * category or tags are workshop-flavoured).
 */
export interface SiteStats {
  members: number;
  events: number;
  workshops: number;
  projects: number;
}

export const statsService = {
  /** GET /api/stats — null when the API has no stats route (never blocks). */
  async getSiteStats(): Promise<SiteStats | null> {
    return fetchSingle<SiteStats>("/stats");
  },
};

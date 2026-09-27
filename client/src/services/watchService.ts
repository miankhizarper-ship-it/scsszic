import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import type { WatchFilters } from "@/lib/watchSearch";
import type { FacetEntry, ListEnvelope, WatchVideo } from "@/types";

/**
 * Watch service — API-backed (Phase 8).
 *
 * The Phase 5 method names map one-to-one onto the REST endpoints, exactly
 * as documented then — the swap happened inside this file only:
 *
 *   listVideos()       → GET /api/watch        (server-side filters)
 *   getVideos()        → GET /api/watch
 *   getVideoBySlug()   → GET /api/watch/:videoSlug
 *   getFeaturedVideo() → GET /api/watch?featured=true
 *   getRelatedVideos() → GET /api/watch/:videoSlug/related
 *   getStats()         → meta.facets (minutes + eventLinked hero stats)
 *
 * Duration buckets filter on the seed-normalized numeric `durationMinutes`
 * (identical boundaries to the UI chips); the API exposes the editorial
 * `duration` string only. Archived videos never leave the database.
 */
export const watchService = {
  /** Filtered, server-side listing with facets in meta (newest releases). */
  async listVideos(filters: Partial<WatchFilters> = {}): Promise<ListEnvelope<WatchVideo>> {
    return fetchList<WatchVideo>("/watch", {
      search: filters.query,
      category: filters.category,
      duration: filters.duration,
    });
  },

  /** All published videos, newest releases first. */
  async getVideos(): Promise<WatchVideo[]> {
    return (await this.listVideos()).data;
  },

  /** Published video by URL slug — null when unknown/archived. */
  async getVideoBySlug(slug: string | undefined): Promise<WatchVideo | null> {
    return fetchSingle<WatchVideo>(`/watch/${encodeURIComponent(slug ?? "")}`);
  },

  /** The featured published video — null when none is marked. */
  async getFeaturedVideo(): Promise<WatchVideo | null> {
    const response = await fetchList<WatchVideo>("/watch", { featured: "true", limit: 1 });
    return response.data[0] ?? null;
  },

  /** Related videos for a detail page (category + tags + event boost). */
  async getRelatedVideos(slug: string | undefined, count = 3): Promise<WatchVideo[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: WatchVideo[] }>(
      `/watch/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data;
  },

  /** Total published runtime in minutes — derived server-side. */
  async getTotalMinutes(): Promise<number> {
    const { meta } = await fetchList<WatchVideo>("/watch", { pageSize: 1 });
    const minutes = (meta.facets.minutes ?? []) as Array<{ n?: number }>;
    return minutes[0]?.n ?? 0;
  },

  /** Count of videos linked to a society event — derived server-side. */
  async getEventLinkedCount(): Promise<number> {
    const { meta } = await fetchList<WatchVideo>("/watch", { pageSize: 1 });
    const linked = (meta.facets.eventLinked ?? []) as Array<{ n?: number }>;
    return linked[0]?.n ?? 0;
  },

  /** Facet entries (categories) for derived filter rows. */
  async getCategories(): Promise<string[]> {
    const { meta } = await fetchList<WatchVideo>("/watch", { pageSize: 1 });
    return ((meta.facets.categories ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

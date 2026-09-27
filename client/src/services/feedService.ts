import { fetchList } from "@/services/contentApi";
import type { FeedFilters } from "@/lib/feedSearch";
import type { FeedPost, ListEnvelope } from "@/types";

/**
 * Feed service — API-backed (Phase 8).
 *
 *   listPosts()        → GET /api/feed          (server-side filters)
 *   getPosts()         → GET /api/feed
 *   getPostsByAuthor() → GET /api/feed?authorUsername=…
 *   getPostsByProject()→ GET /api/feed?projectSlug=…
 *   getPopularTags()   → meta.facets.tags (top 8, count-ranked)
 *
 * Cross-references arrive RESOLVED on each post (`post.refs`) — the server
 * batches author/project/event/blog lookups per page (spec §27, no N+1),
 * and the feed card renders directly from them. `likes`/`comments` remain
 * display-only metadata. Archived posts never leave the database.
 */

export const feedService = {
  /** Filtered, server-side listing with facets in meta (newest first). */
  async listPosts(filters: Partial<FeedFilters> = {}): Promise<ListEnvelope<FeedPost>> {
    return fetchList<FeedPost>("/feed", {
      search: filters.query,
      type: filters.type,
      tag: filters.tag,
    });
  },

  /** All published posts, newest first (refs resolved). */
  async getPosts(count?: number): Promise<FeedPost[]> {
    const response = await fetchList<FeedPost>("/feed", {
      ...(count !== undefined ? { limit: count } : {}),
    });
    return response.data;
  },

  /** Published posts authored by a member (profile activity section). */
  async getPostsByAuthor(username: string | undefined): Promise<FeedPost[]> {
    if (!username) return [];
    const response = await fetchList<FeedPost>("/feed", { authorUsername: username });
    return response.data;
  },

  /** Published posts referencing a project (project updates section). */
  async getPostsByProject(slug: string | undefined): Promise<FeedPost[]> {
    if (!slug) return [];
    const response = await fetchList<FeedPost>("/feed", { projectSlug: slug });
    return response.data;
  },

  /** Distinct popular tags (top 8) — derived server-side. */
  async getPopularTags(): Promise<string[]> {
    const { meta } = await fetchList<FeedPost>("/feed", { pageSize: 1 });
    return ((meta.facets.tags ?? []) as Array<{ value?: string }>)
      .map((entry) => String(entry.value ?? ""))
      .filter(Boolean);
  },
};

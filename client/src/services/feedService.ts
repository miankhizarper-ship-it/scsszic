import { apiFetch } from "@/services/apiClient";
import { fetchList } from "@/services/contentApi";
import type { FeedFilters } from "@/lib/feedSearch";
import type { FeedComment, FeedPost, ListEnvelope } from "@/types";

/**
 * Feed service — API-backed (Phase 8, engagement added later).
 *
 *   listPosts()        → GET /api/feed          (server-side filters)
 *   getPosts()         → GET /api/feed
 *   getPostsByAuthor() → GET /api/feed?authorUsername=…
 *   getPostsByProject()→ GET /api/feed?projectSlug=…
 *   getPopularTags()   → meta.facets.tags (top 8, count-ranked)
 *
 * Engagement (signed-in accounts):
 *   getViewerState()   → GET  /api/feed/viewer-state?ids=…  (batched)
 *   toggleLike()       → POST /api/feed/:id/like            (toggle)
 *   listComments()     → GET  /api/feed/:id/comments
 *   addComment()       → POST /api/feed/:id/comments
 *
 * Cross-references arrive RESOLVED on each post (`post.refs`) — the server
 * batches author/project/event/blog lookups per page (spec §27, no N+1),
 * and the feed card renders directly from them. Displayed like/comment
 * counts = seeded baseline + real activity. Archived posts never leave the
 * database and accept no engagement.
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

  /* --------------------------- Engagement --------------------------- */

  /**
   * Batched viewer like-state for a page of posts (ONE request per page).
   * Anonymous sessions receive an empty likedIds list.
   */
  async getViewerState(ids: string[]): Promise<{ likedIds: string[] }> {
    if (ids.length === 0) return { likedIds: [] };
    return apiFetch<{ data: { likedIds: string[] } }>("/feed/viewer-state", {
      params: { ids: ids.join(",") },
    }).then((r) => r.data);
  },

  /** Toggle the signed-in viewer's like. Returns the new total + state. */
  async toggleLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    return apiFetch<{ data: { liked: boolean; likes: number } }>(
      `/feed/${encodeURIComponent(postId)}/like`,
      { method: "POST" },
    ).then((r) => r.data);
  },

  /** Full comment thread for one post, oldest first. */
  async listComments(postId: string): Promise<FeedComment[]> {
    return apiFetch<{ data: FeedComment[] }>(
      `/feed/${encodeURIComponent(postId)}/comments`,
    ).then((r) => r.data);
  },

  /** Add a comment as the signed-in viewer. */
  async addComment(postId: string, body: string): Promise<FeedComment> {
    return apiFetch<{ data: FeedComment }>(
      `/feed/${encodeURIComponent(postId)}/comments`,
      { method: "POST", body: { body } },
    ).then((r) => r.data);
  },
};

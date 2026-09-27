import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import type { BlogFilters } from "@/lib/blogSearch";
import type { Blog, FacetEntry, ListEnvelope } from "@/types";

/**
 * Blog service — API-backed (Phase 8).
 *
 * The Phase 4 method names map one-to-one onto the REST endpoints, exactly
 * as documented then — the swap happened inside this file only:
 *
 *   listBlogs()       → GET /api/blogs        (server-side filters)
 *   getBlogs()        → GET /api/blogs
 *   getBlogBySlug()   → GET /api/blogs/:slug
 *   getFeaturedBlog() → GET /api/blogs?featured=true
 *   getRelatedBlogs() → GET /api/blogs/:slug/related
 *   getPopularTags()  → meta.facets.tags (count-ranked, top 10)
 *
 * The published-only gate is enforced by the database queries (spec §13) —
 * drafts and archived articles never leave MongoDB.
 */
export const blogService = {
  /** Filtered, server-side listing with facets in meta (newest first). */
  async listBlogs(filters: Partial<BlogFilters> = {}): Promise<ListEnvelope<Blog>> {
    return fetchList<Blog>("/blogs", {
      search: filters.query,
      category: filters.category,
      tag: filters.tag,
    });
  },

  /** All published articles, newest first. */
  async getBlogs(): Promise<Blog[]> {
    return (await this.listBlogs()).data;
  },

  /** Published article by URL slug — null when unknown/draft/archived. */
  async getBlogBySlug(slug: string | undefined): Promise<Blog | null> {
    return fetchSingle<Blog>(`/blogs/${encodeURIComponent(slug ?? "")}`);
  },

  /** The featured published article — null when none is marked. */
  async getFeaturedBlog(): Promise<Blog | null> {
    const response = await fetchList<Blog>("/blogs", { featured: "true", limit: 1 });
    return response.data[0] ?? null;
  },

  /** Related articles for a detail page (category + tags + recency). */
  async getRelatedBlogs(slug: string | undefined, count = 3): Promise<Blog[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: Blog[] }>(
      `/blogs/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data;
  },

  /** Distinct popular tags (top 10, count-ranked) — derived server-side. */
  async getPopularTags(): Promise<string[]> {
    const { meta } = await fetchList<Blog>("/blogs", { pageSize: 1 });
    return ((meta.facets.tags ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

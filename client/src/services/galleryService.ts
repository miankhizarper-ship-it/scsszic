import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import type { GalleryFilters } from "@/lib/gallerySearch";
import type { FacetEntry, GalleryAlbum, ListEnvelope } from "@/types";

/**
 * Gallery service — API-backed (Phase 8).
 *
 * The Phase 5 method names map one-to-one onto the REST endpoints, exactly
 * as documented then — the swap happened inside this file only:
 *
 *   listAlbums()       → GET /api/gallery       (server-side filters)
 *   getAlbums()        → GET /api/gallery
 *   getAlbumBySlug()   → GET /api/gallery/:albumSlug
 *   getFeaturedAlbum() → GET /api/gallery?featured=true
 *   getRelatedAlbums() → GET /api/gallery/:albumSlug/related
 *   getGalleryYears()  → meta.facets.years (distinct, newest first)
 *
 * Photos stay embedded in their album documents exactly as the domain type
 * models them; archived albums never leave the database (spec §13).
 */
export const galleryService = {
  /** Filtered, server-side listing with facets in meta (newest captures). */
  async listAlbums(filters: Partial<GalleryFilters> = {}): Promise<ListEnvelope<GalleryAlbum>> {
    return fetchList<GalleryAlbum>("/gallery", {
      search: filters.query,
      category: filters.category,
      year: filters.year,
    });
  },

  /** All published albums, newest captures first. */
  async getAlbums(): Promise<GalleryAlbum[]> {
    return (await this.listAlbums()).data;
  },

  /** Published album by URL slug — null when unknown/archived. */
  async getAlbumBySlug(slug: string | undefined): Promise<GalleryAlbum | null> {
    return fetchSingle<GalleryAlbum>(`/gallery/${encodeURIComponent(slug ?? "")}`);
  },

  /** The featured published album — null when none is marked. */
  async getFeaturedAlbum(): Promise<GalleryAlbum | null> {
    const response = await fetchList<GalleryAlbum>("/gallery", { featured: "true", limit: 1 });
    return response.data[0] ?? null;
  },

  /** Related albums for a detail page (category + tags + event boost). */
  async getRelatedAlbums(slug: string | undefined, count = 3): Promise<GalleryAlbum[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: GalleryAlbum[] }>(
      `/gallery/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data;
  },

  /** Distinct capture years (newest first) — derived server-side. */
  async getGalleryYears(): Promise<string[]> {
    const { meta } = await fetchList<GalleryAlbum>("/gallery", { pageSize: 1 });
    return ((meta.facets.years ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

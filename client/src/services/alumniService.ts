import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import { resolveSocialLinks } from "@/lib/socialIcons";
import type { Alumnus, FacetEntry, ListEnvelope, SerializedSocialLink } from "@/types";

/**
 * Alumni service — API-backed (Phase 8).
 *
 * Phase 2–7 the alumni dataset was consumed directly via lib/alumniSearch
 * + data/alumni; Phase 8 formalizes it behind the SAME service pattern as
 * the other domains:
 *
 *   listAlumni()       → GET /api/alumni      (server-side filters)
 *   getAlumni()        → GET /api/alumni
 *   getAlumnusBySlug() → GET /api/alumni/:slug
 *   getRelatedAlumni() → GET /api/alumni/:slug/related
 *   getBatches()       → meta.facets.batches  (derived server-side)
 *
 * The alumnus shape is unchanged (ProfileIdentity-compatible); social icon
 * keys resolve through lib/socialIcons exactly like events.
 */

type AlumnusDTO = Omit<Alumnus, "socials"> & { socials?: SerializedSocialLink[] };

/** API document → domain object (social icon keys → Lucide components). */
function mapAlumnus(dto: AlumnusDTO): Alumnus {
  return { ...dto, socials: resolveSocialLinks(dto.socials) };
}

export const alumniService = {
  /** Filtered, server-side listing with facets in meta (newest batch first). */
  async listAlumni(
    filters: { query?: string; batch?: string; field?: string } = {},
  ): Promise<ListEnvelope<Alumnus>> {
    const response = await fetchList<AlumnusDTO>("/alumni", {
      search: filters.query,
      batch: filters.batch,
      field: filters.field,
    });
    return { data: response.data.map(mapAlumnus), meta: response.meta };
  },

  /** All alumni, newest batch first. */
  async getAlumni(): Promise<Alumnus[]> {
    return (await this.listAlumni()).data;
  },

  /** Alumni lookup by URL slug (/alumni/:slug) — null when unknown. */
  async getAlumnusBySlug(slug: string | undefined): Promise<Alumnus | null> {
    const dto = await fetchSingle<AlumnusDTO>(`/alumni/${encodeURIComponent(slug ?? "")}`);
    return dto ? mapAlumnus(dto) : null;
  },

  /** Related alumni (same field first, then others, excluding self). */
  async getRelatedAlumni(slug: string | undefined, count = 3): Promise<Alumnus[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: AlumnusDTO[] }>(
      `/alumni/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data.map(mapAlumnus);
  },

  /** Distinct batch years (newest first) — derived server-side. */
  async getBatches(): Promise<string[]> {
    const { meta } = await fetchList<AlumnusDTO>("/alumni", { pageSize: 1 });
    return ((meta.facets.batches ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

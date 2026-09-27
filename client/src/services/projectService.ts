import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import type { ProjectFilters } from "@/lib/projectSearch";
import type { FacetEntry, ListEnvelope, Project } from "@/types";

/**
 * Project service — API-backed (Phase 8).
 *
 *   listProjects()        → GET /api/projects         (server-side filters)
 *   getProjects()         → GET /api/projects
 *   getProjectBySlug()    → GET /api/projects/:projectSlug
 *   getFeaturedProjects() → GET /api/projects?featured=true
 *   getProjectsByMember() → GET /api/projects?memberUsername=…
 *   getRelatedProjects()  → GET /api/projects/:projectSlug/related
 *   getCategories()       → meta.facets.categories (derived server-side)
 *
 * Archived projects never leave the database (spec §13). Team rosters
 * (memberUsernames) resolve through memberService.getMembersByUsernames —
 * the join MongoDB would $lookup, done in one batched request.
 */

export const projectService = {
  /** Filtered, server-side listing with facets in meta (updated first). */
  async listProjects(filters: Partial<ProjectFilters> = {}): Promise<ListEnvelope<Project>> {
    return fetchList<Project>("/projects", {
      search: filters.query,
      category: filters.category,
      technology: filters.technology,
      status: filters.status,
    });
  },

  /** All public projects (active + completed), most recently updated first. */
  async getProjects(): Promise<Project[]> {
    return (await this.listProjects()).data;
  },

  /** Public project lookup by URL slug — null when unknown or archived. */
  async getProjectBySlug(slug: string | undefined): Promise<Project | null> {
    return fetchSingle<Project>(`/projects/${encodeURIComponent(slug ?? "")}`);
  },

  /** The project(s) highlighted on /projects. */
  async getFeaturedProjects(count = 1): Promise<Project[]> {
    const response = await fetchList<Project>("/projects", { featured: "true", limit: count });
    return response.data;
  },

  /** Public projects a member belongs to (owner or roster). */
  async getProjectsByMember(username: string | undefined): Promise<Project[]> {
    if (!username) return [];
    const response = await fetchList<Project>("/projects", { memberUsername: username });
    return response.data;
  },

  /** Related projects for a detail page (category/tech/tag scoring). */
  async getRelatedProjects(slug: string | undefined, count = 3): Promise<Project[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: Project[] }>(
      `/projects/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data;
  },

  /** Distinct categories (alphabetical) — derived server-side. */
  async getCategories(): Promise<string[]> {
    const { meta } = await fetchList<Project>("/projects", { pageSize: 1 });
    return ((meta.facets.categories ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

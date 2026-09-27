import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import type { MemberFilters } from "@/lib/memberSearch";
import type { FacetEntry, ListEnvelope, Member } from "@/types";

/**
 * Member service — API-backed (Phase 8).
 *
 *   listMembers()          → GET /api/members        (server-side filters)
 *   getMembers()           → GET /api/members
 *   getMemberByUsername()  → GET /api/members/:username
 *   getMembersByUsernames()→ GET /api/members?usernames=a,b,c  (roster batch)
 *   getFeaturedMembers()   → GET /api/members?featured=true&limit=N
 *   getRelatedMembers()    → GET /api/members/:username/related
 *   getBatches()           → meta.facets.batches (derived server-side)
 *
 * Archived members are excluded by the database queries (spec §13), so
 * /profile/:username and every directory listing stay safe for direct
 * links to deactivated profiles — the Phase 6 service-boundary gate, now
 * enforced one layer deeper.
 */

export const memberService = {
  /** Filtered, server-side listing with facets in meta. */
  async listMembers(filters: Partial<MemberFilters> = {}): Promise<ListEnvelope<Member>> {
    return fetchList<Member>("/members", {
      search: filters.query,
      batch: filters.batch,
      domain: filters.domain,
    });
  },

  /** All public members (active + alumni), directory order. */
  async getMembers(): Promise<Member[]> {
    return (await this.listMembers()).data;
  },

  /** Public member lookup by username — null when unknown or archived. */
  async getMemberByUsername(username: string | undefined): Promise<Member | null> {
    if (!username) return null;
    return fetchSingle<Member>(`/members/${encodeURIComponent(username)}`);
  },

  /** Batch lookup for project rosters (keeps N-team-cards O(1) requests). */
  async getMembersByUsernames(usernames: string[]): Promise<Member[]> {
    if (usernames.length === 0) return [];
    const response = await fetchList<Member>("/members", {
      usernames: usernames.map(encodeURIComponent).join(","),
    });
    return response.data;
  },

  /** The members highlighted on /members. */
  async getFeaturedMembers(count = 3): Promise<Member[]> {
    const response = await fetchList<Member>("/members", { featured: "true", limit: count });
    return response.data;
  },

  /** Related members for a profile page (skills/interests/domain scoring). */
  async getRelatedMembers(username: string | undefined, count = 3): Promise<Member[]> {
    if (!username) return [];
    const response = await apiFetch<{ data: Member[] }>(
      `/members/${encodeURIComponent(username)}/related`,
      { params: { count } },
    );
    return response.data;
  },

  /** Distinct batch years (newest first) — derived server-side. */
  async getBatches(): Promise<string[]> {
    const { meta } = await fetchList<Member>("/members", { pageSize: 1 });
    return ((meta.facets.batches ?? []) as FacetEntry[])
      .map((entry) => String(entry.value))
      .filter(Boolean);
  },
};

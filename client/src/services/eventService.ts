import { apiFetch } from "@/services/apiClient";
import { fetchList, fetchSingle } from "@/services/contentApi";
import { resolveSocialLinks } from "@/lib/socialIcons";
import type { EventFilters } from "@/lib/eventSearch";
import type { ListEnvelope, SocietyEvent, SerializedSocialLink } from "@/types";

/**
 * Event service — API-backed (Phase 8).
 *
 * The Phase 3 method names map one-to-one onto the REST endpoints, exactly
 * as documented then — the swap happened inside this file only:
 *
 *   listEvents()        → GET /api/events          (server-side filters)
 *   getEvents()         → GET /api/events
 *   getEventBySlug()    → GET /api/events/:slug
 *   getFeaturedEvent()  → GET /api/events?featured=true
 *   getUpcomingEvents() → GET /api/events?status=upcoming,ongoing
 *   getCompletedEvents()→ GET /api/events?status=completed,cancelled
 *   getRelatedEvents()  → GET /api/events/:slug/related
 *
 * Speaker social icon registry keys resolve back to Lucide components here,
 * so the UI consumes the exact SocietyEvent domain shape as before.
 */

/** API document → domain object (speaker social icon keys → components). */
function mapEvent(dto: SocietyEvent): SocietyEvent {
  if (!dto.speakers) return dto;
  return {
    ...dto,
    speakers: dto.speakers.map((speaker) => ({
      ...speaker,
      socials: resolveSocialLinks(speaker.socials as unknown as SerializedSocialLink[] | undefined),
    })),
  };
}

export const eventService = {
  /** Filtered, server-side listing with facets in meta (chronological). */
  async listEvents(filters: Partial<EventFilters> = {}): Promise<ListEnvelope<SocietyEvent>> {
    return fetchList<SocietyEvent>("/events", {
      search: filters.query,
      category: filters.category,
      status: filters.status,
      date: filters.date,
    });
  },

  /** All events, chronological (the UI derives its upcoming/past split). */
  async getEvents(): Promise<SocietyEvent[]> {
    return (await this.listEvents()).data;
  },

  /** Lookup by URL slug — null when unknown (feeds the Not Found state). */
  async getEventBySlug(slug: string | undefined): Promise<SocietyEvent | null> {
    const dto = await fetchSingle<SocietyEvent>(`/events/${encodeURIComponent(slug ?? "")}`);
    return dto ? mapEvent(dto) : null;
  },

  /** The featured event — null when none is marked. */
  async getFeaturedEvent(): Promise<SocietyEvent | null> {
    const response = await fetchList<SocietyEvent>("/events", { featured: "true", limit: 1 });
    const dto = response.data[0];
    return dto ? mapEvent(dto) : null;
  },

  /** Upcoming + live events, soonest first. */
  async getUpcomingEvents(count?: number): Promise<SocietyEvent[]> {
    const response = await fetchList<SocietyEvent>("/events", {
      status: "upcoming,ongoing",
      ...(count !== undefined ? { limit: count } : {}),
    });
    return response.data;
  },

  /** Completed + cancelled events, chronological. */
  async getCompletedEvents(): Promise<SocietyEvent[]> {
    const response = await fetchList<SocietyEvent>("/events", { status: "completed,cancelled" });
    return response.data;
  },

  /** Related events for a detail page (category + tags + live boost). */
  async getRelatedEvents(slug: string | undefined, count = 3): Promise<SocietyEvent[]> {
    if (!slug) return [];
    const response = await apiFetch<{ data: SocietyEvent[] }>(
      `/events/${encodeURIComponent(slug)}/related`,
      { params: { count } },
    );
    return response.data.map(mapEvent);
  },
};

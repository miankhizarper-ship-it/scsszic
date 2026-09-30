import { apiFetch } from "@/services/apiClient";
import { resolveSocialLinks } from "@/lib/socialIcons";
import type { SerializedSocialLink, SiteSettings } from "@/types";

/**
 * Site-settings service (Task 15) — the public side of the admin-managed
 * site configuration.
 *
 *   getSiteSettings() → GET /api/settings
 *
 * Social icon keys arrive as registry strings on the wire and are resolved
 * to Lucide components at this boundary — the exact serialization contract
 * the alumni/team socials use — so the Footer consumes the same
 * ProfileSocialLink shape it always has. An EMPTY socials list means the
 * society has not configured links yet; the Footer falls back to its
 * curated placeholder set in that case.
 */
export const siteSettingsService = {
  /** Public site settings (footer social links today). */
  async getSiteSettings(): Promise<SiteSettings> {
    const response = await apiFetch<{
      data: { socials: SerializedSocialLink[]; heroImage?: string; updatedAt: string };
    }>("/settings");
    return {
      socials: resolveSocialLinks(response.data.socials) ?? [],
      heroImage: response.data.heroImage ?? "",
      updatedAt: response.data.updatedAt,
    };
  },
};

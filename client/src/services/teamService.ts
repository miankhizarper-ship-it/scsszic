import { fetchList } from "@/services/contentApi";
import { resolveSocialLinks } from "@/lib/socialIcons";
import type { TeamCard, TeamCardWrite, TeamGroup } from "@/types";

/**
 * Team service — API-backed (Phase 12).
 *
 * The admin-managed `team` collection backs BOTH public card groups:
 *
 *   getTeamGroup("leaders")    → GET /api/team?group=leaders
 *   getTeamGroup("developers") → GET /api/team?group=developers
 *
 * Published cards only (archived cards never leave the database), manual
 * `order` first. Social icon keys arrive as registry strings on the wire
 * and are resolved to Lucide components at this boundary — exactly the
 * alumni model's serialization contract — so the card components consume
 * the same ProfileSocialLink shape they always have.
 */

function mapCard(dto: TeamCardWrite): TeamCard {
  return { ...dto, socials: resolveSocialLinks(dto.socials) };
}

export const teamService = {
  /** Published cards of one group (or every group when omitted) — ordered. */
  async getTeamGroup(group?: TeamGroup, limit = 4): Promise<TeamCard[]> {
    const response = await fetchList<TeamCardWrite>("/team", {
      group,
      limit,
    });
    return response.data.map(mapCard);
  },
};

import { Linkedin } from "lucide-react";

import avatarAhmad from "@/assets/people/team-ahmad-shah.jpg";
import avatarFatima from "@/assets/people/team-fatima-noor.jpg";
import avatarOwais from "@/assets/people/team-owais-bangash.jpg";
import avatarHira from "@/assets/people/team-hira-anwar.jpg";
import avatarSubhan from "@/assets/people/team-subhan-ullah.jpg";
import avatarRabia from "@/assets/people/team-rabia-sultan.jpg";
import type { TeamMember } from "@/types";

/**
 * MOCK DATA — Society leadership team.
 *
 * Placeholder portraits + placeholder roles, clearly separated for easy
 * editing. Phase 2+: replaced by MongoDB-backed team records with real
 * photos (R2 media) and genuine social profiles.
 *
 * NOTE: Social links are intentionally "#" placeholders until real profiles
 * are provided by the society.
 */

const placeholderSocials = [
  { label: "LinkedIn profile (placeholder)", href: "#", icon: Linkedin },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "team-001",
    name: "Ahmad Shah",
    position: "President",
    description:
      "Leads the society's direction, chairs the core team, and represents SCS to the department and university.",
    initials: "AS",
    image: avatarAhmad,
    imageAlt:
      "Placeholder portrait tile for Ahmad Shah — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
  {
    id: "team-002",
    name: "Fatima Noor",
    position: "Vice President",
    description:
      "Supports the president across planning and operations, and oversees internal coordination between teams.",
    initials: "FN",
    image: avatarFatima,
    imageAlt:
      "Placeholder portrait tile for Fatima Noor — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
  {
    id: "team-003",
    name: "Owais Bangash",
    position: "General Secretary",
    description:
      "Keeps records, manages society communications, and makes sure every session and meeting runs on time.",
    initials: "OB",
    image: avatarOwais,
    imageAlt:
      "Placeholder portrait tile for Owais Bangash — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
  {
    id: "team-004",
    name: "Hira Anwar",
    position: "Technical Lead",
    description:
      "Guides the technical track — workshops, project teams, and the engineering standards behind society builds.",
    initials: "HA",
    image: avatarHira,
    imageAlt:
      "Placeholder portrait tile for Hira Anwar — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
  {
    id: "team-005",
    name: "Subhan Ullah",
    position: "Media & Communications",
    description:
      "Runs SCS announcements, social channels, and event coverage — the voice of the society online.",
    initials: "SU",
    image: avatarSubhan,
    imageAlt:
      "Placeholder portrait tile for Subhan Ullah — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
  {
    id: "team-006",
    name: "Rabia Sultan",
    position: "Event Coordinator",
    description:
      "Plans and executes seminars, bootcamps, and hackathons — from venue logistics to speaker lineups.",
    initials: "RS",
    image: avatarRabia,
    imageAlt:
      "Placeholder portrait tile for Rabia Sultan — abstract navy and gold monogram",
    socials: placeholderSocials,
  },
];

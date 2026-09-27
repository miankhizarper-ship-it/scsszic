import { Github, Instagram, Linkedin, Twitter } from "lucide-react";

import { ROUTES } from "@/routes/paths";
import type { NavLink, SocialLink } from "@/types";

/**
 * Navigation model — single source of truth for the Navbar, MobileMenu
 * and Footer.
 *
 * Links with `children` render as an accessible dropdown on desktop and an
 * expandable group in the mobile panel. The "Community" entry groups the
 * community surfaces; Members and Projects are placeholder routes for now.
 */

export const NAV_LINKS: NavLink[] = [
  { label: "Home", to: ROUTES.home },
  { label: "About", to: ROUTES.about },
  { label: "Events", to: ROUTES.events },
  {
    label: "Community",
    to: ROUTES.feed,
    children: [
      { label: "Feed", to: ROUTES.feed },
      { label: "Members", to: ROUTES.members },
      { label: "Projects", to: ROUTES.projects },
    ],
  },
  { label: "Alumni", to: ROUTES.alumni },
  { label: "Blogs", to: ROUTES.blogs },
  { label: "Gallery", to: ROUTES.gallery },
  { label: "Watch", to: ROUTES.watch },
  { label: "Contact", to: ROUTES.contact },
];

export const FOOTER_QUICK_LINKS: NavLink[] = [
  { label: "Home", to: ROUTES.home },
  { label: "About", to: ROUTES.about },
  { label: "Events", to: ROUTES.events },
  { label: "Gallery", to: ROUTES.gallery },
];

export const FOOTER_COMMUNITY_LINKS: NavLink[] = [
  { label: "Community Feed", to: ROUTES.feed },
  { label: "Members", to: ROUTES.members },
  { label: "Projects", to: ROUTES.projects },
  { label: "Alumni Network", to: ROUTES.alumni },
  { label: "Blogs", to: ROUTES.blogs },
];

export const FOOTER_GET_INVOLVED_LINKS: NavLink[] = [
  { label: "Join SCS", to: ROUTES.signup },
  { label: "Member Login", to: ROUTES.login },
  { label: "Contact Us", to: ROUTES.contact },
];

export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { label: "Terms of Service", to: ROUTES.terms },
  { label: "Privacy Policy", to: ROUTES.privacy },
];

/** Placeholder social links — real profiles are connected in a later phase. */
export const SOCIAL_LINKS: SocialLink[] = [
  { label: "SCS on GitHub", href: "#", icon: Github },
  { label: "SCS on LinkedIn", href: "#", icon: Linkedin },
  { label: "SCS on Instagram", href: "#", icon: Instagram },
  { label: "SCS on X (Twitter)", href: "#", icon: Twitter },
];

import {
  Github,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import type { ProfileSocialLink, SerializedSocialLink } from "@/types";

/**
 * Icon registry — the serialization twin of the server's seed serializer.
 *
 * Social links stored in MongoDB carry an `icon` KEY (Lucide components
 * cannot cross a JSON API). This registry resolves keys back to the icon
 * components so services return the EXACT `ProfileSocialLink` domain shape
 * the UI has always consumed — no component anywhere knows the API exists.
 *
 * Keys are lowercase Lucide display names ("linkedin" → Linkedin), matching
 * the server's iconKeyOf() serialization. Unknown keys degrade gracefully
 * to a generic link icon.
 */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  globe: Globe,
  website: Globe,
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  link: Link2,
};

export function resolveSocialIcon(key: string): LucideIcon {
  return ICON_REGISTRY[key.toLowerCase()] ?? Link2;
}

/** API social link → the domain ProfileSocialLink with a live icon component. */
export function resolveSocialLinks(
  links: SerializedSocialLink[] | undefined,
): ProfileSocialLink[] | undefined {
  if (!links) return undefined;
  return links.map((link) => ({
    label: link.label,
    href: link.href,
    icon: resolveSocialIcon(link.icon),
  }));
}

import { cn } from "@/lib/utils";
import type { ProfileSocialLink } from "@/types";

interface SocialLinksProps {
  links: ProfileSocialLink[];
  /** Visual surface: "dark" for navy bands, "light" for white cards. */
  tone?: "dark" | "light";
  /** "bordered" adds a border ring around each icon (footer style). */
  appearance?: "bare" | "bordered";
  size?: "sm" | "md";
  className?: string;
}

/**
 * SocialLinks — icon row for profile social links.
 * Shared by profile pages, team cards, and the alumni directory.
 */
export function SocialLinks({
  links,
  tone = "dark",
  appearance = "bare",
  size = "md",
  className,
}: SocialLinksProps) {
  const onDark = tone === "dark";
  const boxSize = size === "sm" ? "size-8" : "size-9";
  const iconSize = size === "sm" ? 15 : 17;

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)} aria-label="Social links">
      {links.map(({ label, href, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center rounded-lg transition-colors",
              boxSize,
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              appearance === "bordered" && "border",
              onDark
                ? appearance === "bordered"
                  ? "border-white/10 text-slate-400 hover:border-gold-500/50 hover:text-gold-300"
                  : "text-slate-300 hover:bg-white/10 hover:text-gold-300"
                : appearance === "bordered"
                  ? "border-line text-muted hover:border-navy-300 hover:text-navy-900"
                  : "text-muted hover:bg-navy-50 hover:text-navy-900",
            )}
          >
            <Icon size={iconSize} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

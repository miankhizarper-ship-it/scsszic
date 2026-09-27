import { Badge } from "@/components/ui/Badge";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";

interface TeamMemberCardProps {
  member: TeamMember;
  className?: string;
}

/**
 * TeamMemberCard — leadership profile card for the About page.
 * Renders the portrait placeholder (or a monogram fallback) without
 * distortion, plus position, short description, and optional socials.
 */
export function TeamMemberCard({ member, className }: TeamMemberCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* Portrait — fixed aspect ratio, never distorted */}
      <div className="relative aspect-[4/3.4] w-full overflow-hidden bg-navy-900">
        {member.image ? (
          <img
            src={member.image}
            alt={member.imageAlt ?? `Portrait placeholder for ${member.name}`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center font-display text-4xl font-bold text-gold-300"
          >
            {member.initials}
          </span>
        )}
        {/* Position chip over the portrait */}
        <div className="absolute inset-x-3 bottom-3">
          <Badge variant="solidGold" className="shadow-sm">
            {member.position}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold text-navy-900">{member.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{member.description}</p>

        {member.socials && member.socials.length > 0 && (
          <SocialLinks links={member.socials} tone="light" size="sm" className="mt-4" />
        )}
      </div>
    </article>
  );
}

import { Code2 } from "lucide-react";

import { SocialLinks } from "@/components/ui/SocialLinks";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";

interface DeveloperCardProps {
  member: TeamMember;
  className?: string;
}

/**
 * DeveloperCard — the dark-variant team card for the home page's
 * Developers section. Same content model as TeamMemberCard (portrait or
 * monogram, position chip, one-liner, socials) but on the navy surface so
 * the section reads as a distinct, technical beat in the page rhythm.
 */
export function DeveloperCard({ member, className }: DeveloperCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/30 hover:shadow-lg",
        className,
      )}
    >
      {/* Portrait band — same fixed aspect ratio treatment as TeamMemberCard */}
      <div className="relative aspect-[4/3.4] w-full overflow-hidden bg-navy-950">
        {member.image ? (
          <img
            src={member.image}
            alt={member.imageAlt ?? `Portrait of ${member.name}`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center bg-grid-dark font-display text-4xl font-bold text-gold-300"
          >
            {member.initials}
          </span>
        )}
        {/* Role chip over the portrait */}
        <div className="absolute inset-x-3 bottom-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-navy-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-300 backdrop-blur-sm">
            <Code2 size={12} aria-hidden="true" />
            {member.position}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold text-white">{member.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{member.description}</p>

        {member.socials && member.socials.length > 0 && (
          <SocialLinks links={member.socials} tone="dark" size="sm" className="mt-4" />
        )}
      </div>
    </article>
  );
}

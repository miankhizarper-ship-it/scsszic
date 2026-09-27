import { GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { cn } from "@/lib/utils";
import type { Alumnus } from "@/types";

interface ProfileHeaderProps {
  person: Alumnus;
  className?: string;
}

/**
 * ProfileHeader — navy identity band shared by profile layouts.
 * Portrait, name, batch, current role, organization, and social links.
 * Reusable for future member profiles (/profile/:username).
 */
export function ProfileHeader({ person, className }: ProfileHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden border-b border-white/10 bg-navy-950",
        className,
      )}
    >
      {/* Decorative layers — same language as PageHero */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute -top-32 right-[-8%] h-[360px] w-[360px] rounded-full bg-navy-600/40 blur-3xl"
      />
      <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 py-12 sm:flex-row sm:items-end sm:px-6 sm:py-14 lg:px-8">
        {/* Portrait */}
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-gold-500/40 to-navy-500/30 blur-[2px]"
          />
          {person.image ? (
            <img
              src={person.image}
              alt={person.imageAlt ?? `Portrait placeholder for ${person.name}`}
              width={136}
              height={136}
              className="relative size-[136px] rounded-2xl border border-white/20 object-cover shadow-2xl"
            />
          ) : (
            <span className="relative grid size-[136px] place-items-center rounded-2xl border border-white/20 bg-navy-900 font-display text-3xl font-bold text-gold-300 shadow-2xl">
              {person.initials}
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <Badge variant="onDark">
            <GraduationCap size={12} aria-hidden="true" className="mr-1" />
            {person.batch}
          </Badge>

          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {person.name}
          </h1>

          <p className="mt-2.5 text-base text-slate-300">
            <span className="font-semibold text-gold-300">{person.role}</span>
            <span aria-hidden="true" className="mx-2 text-slate-500">
              ·
            </span>
            {person.company}
          </p>

          {person.socials && person.socials.length > 0 && (
            <div className="mt-5 flex justify-center sm:justify-start">
              <SocialLinks links={person.socials} tone="dark" appearance="bordered" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

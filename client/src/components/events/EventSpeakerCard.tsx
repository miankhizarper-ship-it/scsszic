import { Reveal } from "@/components/ui/Reveal";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { cn } from "@/lib/utils";
import type { EventSpeaker } from "@/types";

interface EventSpeakerCardProps {
  speaker: EventSpeaker;
  className?: string;
}

/**
 * EventSpeakerCard — speaker identity + short bio.
 *
 * Speakers in mock data are clearly-fictional demo personas; the card stays
 * data-driven so real speaker profiles (with R2 photos) drop in unchanged.
 */
export function EventSpeakerCard({ speaker, className }: EventSpeakerCardProps) {
  return (
    <Reveal className={cn("h-full", className)}>
      <article className="flex h-full min-w-0 flex-col rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-xl bg-gradient-to-br from-gold-500/25 to-navy-300/20"
            />
            {speaker.image ? (
              <img
                src={speaker.image}
                alt={speaker.imageAlt ?? `Portrait placeholder for ${speaker.name}`}
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="relative size-16 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <span className="relative grid size-16 place-items-center rounded-xl bg-navy-900 font-display text-lg font-bold text-gold-300 shadow-sm">
                {speaker.initials}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-navy-900">
              {speaker.name}
            </h3>
            <p className="mt-0.5 truncate text-sm font-medium text-gold-700">
              {speaker.role}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{speaker.organization}</p>
          </div>
        </div>

        {speaker.bio && (
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{speaker.bio}</p>
        )}

        {speaker.socials && speaker.socials.length > 0 && (
          <SocialLinks links={speaker.socials} tone="light" size="sm" className="mt-4" />
        )}
      </article>
    </Reveal>
  );
}

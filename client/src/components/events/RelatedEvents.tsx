import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { EventCard } from "@/components/media/EventCard";
import { ROUTES } from "@/routes/paths";
import type { SocietyEvent } from "@/types";

interface RelatedEventsProps {
  /** Pre-selected via getRelatedEvents() — selection logic lives in lib, not here. */
  events: SocietyEvent[];
}

/**
 * RelatedEvents — "keep exploring" section at the bottom of event details.
 * Renders nothing when selection yields fewer than one item.
 */
export function RelatedEvents({ events }: RelatedEventsProps) {
  if (events.length === 0) return null;

  return (
    <section
      aria-labelledby="related-events-heading"
      className="border-t border-line bg-white py-16 lg:py-20"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
              Keep exploring
            </p>
            <h2
              id="related-events-heading"
              className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
            >
              Related events
            </h2>
          </div>

          <Link
            to={ROUTES.events}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            View all events
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <Reveal key={event.id} delay={index * 0.07} className="h-full">
              <li className="h-full">
                <EventCard event={event} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

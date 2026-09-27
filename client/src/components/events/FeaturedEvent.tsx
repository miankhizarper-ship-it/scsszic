import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import {
  EventStatusBadge,
  getRegistrationAction,
} from "@/components/events/EventStatusBadge";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { SocietyEvent } from "@/types";

interface FeaturedEventProps {
  event: SocietyEvent;
}

/**
 * FeaturedEvent — the large highlighted event at the top of /events.
 *
 * Desktop: two-column (large cover left, content right).
 * Mobile: stacked, cover first. Registration CTA only renders when
 * `registration.enabled` is true — spec §4.
 */
export function FeaturedEvent({ event }: FeaturedEventProps) {
  const detailHref = ROUTES.eventDetail(event.slug);
  const registration = getRegistrationAction(event.registration);
  const timeLabel = event.endTime
    ? `${event.startTime} – ${event.endTime}`
    : event.startTime;

  return (
    <section
      aria-labelledby="featured-event-heading"
      className="border-b border-line bg-white py-14 lg:py-16"
    >
      <Container>
        <Reveal>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
            Featured Event
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* ---------- Cover ---------- */}
          <Reveal delay={0.05} className="min-w-0">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-gold-500/15 via-transparent to-navy-300/20 blur-xl"
              />
              <div className="relative overflow-hidden rounded-2xl border border-line shadow-md">
                <img
                  src={event.coverImage}
                  alt={event.coverImageAlt}
                  width={1200}
                  height={675}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/9] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
                <div className="absolute inset-x-4 top-4">
                  <EventStatusBadge status={event.status} tone="dark" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* ---------- Content ---------- */}
          <Reveal delay={0.1} className="min-w-0">
            <span className="inline-flex w-fit items-center rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-700">
              {event.category}
            </span>

            <h2
              id="featured-event-heading"
              className="mt-4 font-display text-3xl font-bold tracking-tight text-navy-900 text-balance sm:text-4xl"
            >
              {event.title}
            </h2>

            <dl className="mt-4 flex flex-col gap-2 text-sm text-muted">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} aria-hidden="true" className="shrink-0 text-gold-600" />
                <dt className="sr-only">Date</dt>
                <dd>
                  <time dateTime={event.date}>{formatCardDate(event.date)}</time>
                  <span aria-hidden="true"> · </span>
                  {timeLabel}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={15} aria-hidden="true" className="shrink-0 text-gold-600" />
                <dt className="sr-only">Location</dt>
                <dd className="min-w-0">{event.location}</dd>
              </div>
            </dl>

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              {event.excerpt}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button to={detailHref} variant="navy" size="lg">
                View Event
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
              {registration.enabled && (
                <Button
                  href={registration.externalUrl ?? "#"}
                  variant="gold"
                  size="lg"
                  title="Demo placeholder — registration opens in a later phase"
                >
                  {registration.label}
                </Button>
              )}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

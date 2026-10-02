import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Lock, MapPin, SearchX } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { EventInfo } from "@/components/events/EventInfo";
import { EventSchedule } from "@/components/events/EventSchedule";
import { EventSpeakerCard } from "@/components/events/EventSpeakerCard";
import { EventGallery } from "@/components/events/EventGallery";
import { RegistrationCTA } from "@/components/events/RegistrationCTA";
import { RelatedEvents } from "@/components/events/RelatedEvents";
import {
  EventStatusBadge,
  getRegistrationAction,
  getRegistrationClosedLabel,
} from "@/components/events/EventStatusBadge";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useEvent, useRelatedEvents } from "@/hooks/content";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * EventDetailPage — the full event experience (/events/:slug).
 *
 * Order: Event Hero → Event Information → About → Speakers → Schedule →
 * Registration → Gallery → Related Events → CTA (spec §10).
 *
 * Phase 8: the lookup runs against GET /api/events/:slug (MongoDB) and
 * related events come from the related endpoint — unknown slugs and
 * malformed ids both resolve to the same Not Found state (spec §30).
 */
export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  // Hooks stay unconditional; early returns come after them.
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const relatedQuery = useRelatedEvents(event ? event.slug : undefined);
  const related = relatedQuery.data ?? [];

  usePageMetadata({
    title: event
      ? `${event.title} | Society of Computer Science`
      : "Event Not Found | Society of Computer Science",
    description: event
      ? event.excerpt
      : "Event details, schedule, speakers, and registration for Society of Computer Science events at SZIC.",
  });

  if (eventQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading event…"
      />
    );
  }

  if (eventQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this event right now"
            description="Event details are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void eventQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Event Not Found"
            description="This event doesn't exist or may have been moved. Browse the events page for everything upcoming and past."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.events} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Events
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  const registration = getRegistrationAction(event.registration);
  const timeLabel = event.endTime
    ? `${event.startTime} – ${event.endTime}`
    : event.startTime;

  return (
    <>
      {/* ---------- Event hero ---------- */}
      <section
        aria-labelledby="event-heading"
        className="relative overflow-hidden bg-navy-950"
      >
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div
          aria-hidden="true"
          className="absolute -top-40 right-[-12%] h-[480px] w-[480px] rounded-full bg-navy-600/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-[-30%] left-[-8%] h-[380px] w-[380px] rounded-full bg-gold-500/[0.06] blur-3xl"
        />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

        <Container className="relative py-12 sm:py-14 lg:py-16">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <Link
              to={ROUTES.events}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Events
            </Link>
          </nav>

          <div className="mt-8 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* Copy */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex w-fit items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-300">
                  {event.category}
                </span>
                <EventStatusBadge status={event.status} tone="dark" />
              </div>

              <h1
                id="event-heading"
                className="mt-5 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-white text-balance sm:text-4xl lg:text-[2.75rem]"
              >
                {event.title}
              </h1>

              <dl className="mt-5 flex flex-col gap-2.5 text-sm text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-gold-400" />
                  <dt className="sr-only">Date</dt>
                  <dd>
                    <time dateTime={event.date}>{formatCardDate(event.date)}</time>
                    <span aria-hidden="true"> · </span>
                    {timeLabel}
                  </dd>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} aria-hidden="true" className="shrink-0 text-gold-400" />
                  <dt className="sr-only">Location</dt>
                  <dd className="min-w-0">{event.location}</dd>
                </div>
              </dl>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
                {event.excerpt}
              </p>

              {/* Primary CTA — only when registration is open (spec §11) */}
              <div className="mt-8">
                {registration.enabled ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      href={registration.externalUrl ?? "#"}
                      variant="gold"
                      size="lg"
                      title="Opens the event's external registration page"
                    >
                      {registration.label}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300">
                    <Lock size={15} aria-hidden="true" className="text-gold-400" />
                    {getRegistrationClosedLabel(event.registration)}
                  </p>
                )}
              </div>
            </div>

            {/* Cover */}
            <div className="relative mx-auto w-full max-w-xl min-w-0 lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-navy-600/50 via-transparent to-gold-500/15 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                <img
                  src={event.coverImage}
                  alt={event.coverImageAlt}
                  width={1200}
                  height={675}
                  loading="eager"
                  decoding="async"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Event information ---------- */}
      <section
        aria-labelledby="event-info-heading"
        className="border-b border-line bg-surface py-12 lg:py-14"
      >
        <Container>
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
              Plan your visit
            </p>
            <h2
              id="event-info-heading"
              className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
            >
              Event information
            </h2>
            <EventInfo event={event} className="mt-6" />
          </Reveal>
        </Container>
      </section>

      {/* ---------- About + Speakers + Schedule ---------- */}
      <section aria-label="Event details" className="bg-surface pb-16 lg:pb-20">
        <Container>
          {/* About the event */}
          <Reveal className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              About this event
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
              {event.description.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>

            {event.tags && event.tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Event tags">
                {event.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md border border-navy-100 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="mt-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                    <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
                    Who you'll hear from
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                    Speakers
                  </h2>
                </div>
              </div>

              <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {event.speakers.map((speaker) => (
                  <li key={speaker.name}>
                    <EventSpeakerCard speaker={speaker} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule */}
          {event.schedule && event.schedule.length > 0 && (
            <div className="mt-14 max-w-3xl">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
                How the day runs
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                Schedule
              </h2>

              <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <EventSchedule items={event.schedule} />
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* ---------- Registration ---------- */}
      <section
        aria-labelledby="event-registration-heading"
        className="border-t border-line bg-white py-16 lg:py-20"
      >
        <Container>
          <Reveal className="mx-auto max-w-3xl">
            <h2 id="event-registration-heading" className="sr-only">
              Registration
            </h2>
            <RegistrationCTA event={event} />
          </Reveal>
        </Container>
      </section>

      {/* ---------- Gallery ---------- */}
      {event.gallery && event.gallery.length > 0 && (
        <section
          aria-labelledby="event-gallery-heading"
          className="border-t border-line bg-surface py-16 lg:py-20"
        >
          <Container>
            <Reveal>
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
                Moments from the day
              </p>
              <h2
                id="event-gallery-heading"
                className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
              >
                Event gallery
              </h2>
            </Reveal>

            <EventGallery media={event.gallery} eventTitle={event.title} className="mt-8" />
          </Container>
        </section>
      )}

      {/* ---------- Related events ---------- */}
      <RelatedEvents events={related} />

      {/* ---------- CTA ---------- */}
      <CTASection
        id="event-cta"
        eyebrow="Be Part of It"
        title="Be in the room next time"
        description="SCS events are built by members, for members. Join the community to suggest topics, volunteer at events, and never miss a session."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Explore All Events", to: ROUTES.events }}
      />
    </>
  );
}

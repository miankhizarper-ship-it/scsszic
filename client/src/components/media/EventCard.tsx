import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { ROUTES } from "@/routes/paths";
import { formatCardDate, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SocietyEvent } from "@/types";

interface EventCardProps {
  event: SocietyEvent;
  className?: string;
}

/**
 * EventCard — reusable event preview card used by the events page, the Home
 * page and related-event listings.
 *
 * Renders cover artwork, category + status badges (status always shown as an
 * icon + text label), date, excerpt, location and a View Event link to
 * /events/:slug. Layout stays purely data-driven, so swapping mock data for
 * API events changes nothing here.
 */
export function EventCard({ event, className }: EventCardProps) {
  const detailHref = ROUTES.eventDetail(event.slug);
  const timeLabel = event.endTime
    ? `${event.startTime} – ${event.endTime}`
    : event.startTime;

  return (
    <article
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md",
        event.status === "cancelled" && "opacity-90",
        className,
      )}
    >
      {/* ---------- Cover ---------- */}
      <div className="relative aspect-[16/9] overflow-hidden bg-navy-950">
        <img
          src={event.coverImage}
          alt={event.coverImageAlt}
          width={800}
          height={450}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {/* Legibility gradient for the overlaid badges */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-navy-950/60 to-transparent"
        />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="rounded-full border border-white/20 bg-navy-950/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-300 backdrop-blur-sm">
            {event.category}
          </span>
          <EventStatusBadge status={event.status} tone="dark" />
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p
          className="flex items-center gap-1.5 text-xs font-medium text-muted"
          aria-label={`${formatDateLong(event.date)} at ${timeLabel}`}
        >
          <CalendarDays size={14} aria-hidden="true" className="shrink-0 text-gold-600" />
          <span>
            <time dateTime={event.date}>{formatCardDate(event.date)}</time>
            <span aria-hidden="true"> · {timeLabel}</span>
          </span>
        </p>

        <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-navy-900">
          <Link
            to={detailHref}
            className="rounded-sm transition-colors group-hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            {event.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {event.excerpt}
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={14} aria-hidden="true" className="shrink-0 text-gold-600" />
          <span className="truncate">{event.location}</span>
        </p>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line px-5 py-4">
        <span className="min-w-0 truncate text-xs text-muted">
          {event.organizer ?? "Society of Computer Science"}
        </span>
        <Link
          to={detailHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          aria-label={`View event: ${event.title}`}
        >
          View Event
          <ArrowRight
            size={15}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}

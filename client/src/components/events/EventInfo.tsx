import { Building2, CalendarDays, Clock, MapPin, Tag } from "lucide-react";

import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SocietyEvent } from "@/types";

interface EventInfoProps {
  event: SocietyEvent;
  /** Optional panel heading — omit when the surrounding section provides one. */
  title?: string;
  className?: string;
}

/**
 * EventInfo — scannable at-a-glance panel for the event detail page.
 * Date / Time / Location / Organizer / Category / Status, each with a
 * Lucide icon. Status reuses the accessible EventStatusBadge (icon + text).
 */
export function EventInfo({ event, title, className }: EventInfoProps) {
  const timeLabel = event.endTime
    ? `${event.startTime} – ${event.endTime}`
    : event.startTime;

  const items = [
    {
      icon: CalendarDays,
      label: "Date",
      value: <time dateTime={event.date}>{formatDateLong(event.date)}</time>,
    },
    { icon: Clock, label: "Time", value: timeLabel },
    { icon: MapPin, label: "Location", value: event.location },
    {
      icon: Building2,
      label: "Organizer",
      value: event.organizer ?? "Society of Computer Science",
    },
    { icon: Tag, label: "Category", value: event.category },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-white p-6 shadow-sm",
        className,
      )}
    >
      {title && (
        <h2 className="font-display text-base font-semibold text-navy-900">{title}</h2>
      )}

      <dl
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8",
          title && "mt-4",
        )}
      >
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-gold-500/30 bg-gold-50 text-gold-700"
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium leading-snug text-navy-900">
                {value}
              </dd>
            </div>
          </div>
        ))}

        {/* Status — accessible badge (icon + text), not just a color dot */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-gold-500/30 bg-gold-50 text-gold-700"
          >
            <EventStatusDot />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Status
            </dt>
            <dd className="mt-1">
              <EventStatusBadge status={event.status} />
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

function EventStatusDot() {
  return <span className="size-2.5 rounded-full bg-current opacity-70" />;
}

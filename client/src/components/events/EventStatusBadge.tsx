import { Ban, CalendarClock, CheckCircle2, Radio } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EventRegistrationInfo, EventStatus } from "@/types";

interface EventStatusBadgeProps {
  status: EventStatus;
  /** Visual surface the badge sits on. */
  tone?: "light" | "dark";
  className?: string;
}

const LABELS: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ICONS: Record<EventStatus, React.ElementType> = {
  upcoming: CalendarClock,
  ongoing: Radio,
  completed: CheckCircle2,
  cancelled: Ban,
};

/**
 * EventStatusBadge — accessible lifecycle indicator.
 *
 * Status is communicated by icon AND text label, never by color alone
 * (spec §19). Styles are status-tinted but always paired with the word.
 */
export function EventStatusBadge({ status, tone = "light", className }: EventStatusBadgeProps) {
  const Icon = ICONS[status];
  const onDark = tone === "dark";

  const statusClasses: Record<EventStatus, string> = onDark
    ? {
        upcoming: "border-white/15 bg-white/10 text-slate-100",
        ongoing: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
        completed: "border-white/15 bg-white/10 text-slate-200",
        cancelled: "border-red-300/40 bg-red-400/15 text-red-200",
      }
    : {
        upcoming: "border-navy-200 bg-navy-50 text-navy-800",
        ongoing: "border-success/30 bg-success/10 text-success",
        completed: "border-line bg-navy-50 text-muted",
        cancelled: "border-error/25 bg-error/10 text-error",
      };

  const iconClasses = cn(
    status === "ongoing" && (onDark ? "text-emerald-200" : "text-success"),
  );

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold uppercase tracking-wider",
        statusClasses[status],
        className,
      )}
    >
      <Icon size={12} aria-hidden="true" className={iconClasses} />
      {LABELS[status]}
      {/* Announce the live state explicitly for assistive tech */}
      {status === "ongoing" && <span className="sr-only">— happening now</span>}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Registration CTA resolution — shared by the featured section, the event
   hero and the registration panel. Pure helpers, no React state.
   -------------------------------------------------------------------------- */

export interface RegistrationAction {
  /** Whether a Register CTA should be rendered. */
  enabled: boolean;
  /** Button label when enabled. */
  label: string;
  /** External URL when provided by the data. */
  externalUrl?: string;
}

export function getRegistrationAction(
  registration: EventRegistrationInfo | undefined,
): RegistrationAction {
  if (registration?.enabled) {
    return {
      enabled: true,
      label: registration.label ?? "Register Now",
      externalUrl: registration.externalUrl,
    };
  }
  return { enabled: false, label: "" };
}

/** The disabled-state text shown where a CTA would be ("Registration Closed" / …). */
export function getRegistrationClosedLabel(
  registration: EventRegistrationInfo | undefined,
): string {
  return registration?.label ?? "Registration Closed";
}

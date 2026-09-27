import { ArrowRight, Info, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  getRegistrationAction,
  getRegistrationClosedLabel,
} from "@/components/events/EventStatusBadge";
import { cn } from "@/lib/utils";
import type { SocietyEvent } from "@/types";

interface RegistrationCTAProps {
  event: SocietyEvent;
  className?: string;
}

/**
 * RegistrationCTA — the registration panel for the event detail page.
 *
 *  - registration.enabled → "Reserve Your Spot" + Register Now button.
 *    In this phase the button uses a placeholder URL / demo state — no
 *    registration backend, no data collection (spec §16).
 *  - registration disabled → the data's reason label ("Registration Closed"
 *    or "Registration Not Required") with the supporting note, no button.
 */
export function RegistrationCTA({ event, className }: RegistrationCTAProps) {
  const registration = event.registration;
  const action = getRegistrationAction(registration);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold-500/40 bg-navy-950 p-6 sm:p-8",
        className,
      )}
    >
      {/* Decorative layers — same language as the CTA section */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl"
      />

      <div className="relative">
        {action.enabled ? (
          <>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
              <Users size={14} aria-hidden="true" />
              Reserve Your Spot
            </p>

            <h2 className="mt-3 font-display text-xl font-bold text-white sm:text-2xl">
              Join us at {event.title}
            </h2>

            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
              {registration?.note ??
                "Register to secure your place — the SCS community looks forward to seeing you there."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button
                href={action.externalUrl ?? "#"}
                variant="gold"
                title="Demo placeholder — registration opens in a later phase"
              >
                {action.label}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>

              {registration?.capacity && (
                <p className="text-xs text-slate-400">
                  Limited to{" "}
                  <span className="font-semibold text-gold-300">
                    {registration.capacity} seats
                  </span>
                </p>
              )}
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Info size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
              Demo phase — registration becomes functional in a later release. No
              data is collected yet.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Registration
            </p>

            <h2 className="mt-3 font-display text-xl font-bold text-white sm:text-2xl">
              {getRegistrationClosedLabel(registration)}
            </h2>

            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
              {registration?.note ??
                "This event does not take registrations through the website."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

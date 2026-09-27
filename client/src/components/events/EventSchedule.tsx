import { cn } from "@/lib/utils";
import type { EventScheduleItem } from "@/types";

interface EventScheduleProps {
  items: EventScheduleItem[];
  className?: string;
}

/**
 * EventSchedule — clean vertical timeline for the event day plan.
 *
 * Time column on the left, connected dot-line down the middle, content on
 * the right. Wraps to a compact single-column rhythm on mobile and never
 * overflows at 320px.
 */
export function EventSchedule({ items, className }: EventScheduleProps) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <li
            key={`${item.time}-${item.title}`}
            className="relative grid grid-cols-[72px_20px_minmax(0,1fr)] gap-x-3 pb-8 last:pb-0 sm:grid-cols-[96px_24px_minmax(0,1fr)] sm:gap-x-4"
          >
            {/* Time */}
            <p className="pt-0.5 text-right font-mono text-xs font-semibold leading-5 text-navy-800 sm:text-[13px]">
              {item.time}
            </p>

            {/* Rail: dot + connecting line */}
            <div aria-hidden="true" className="relative flex justify-center">
              <span className="z-10 mt-1.5 size-3 shrink-0 rounded-full border-2 border-gold-500 bg-white" />
              {!isLast && (
                <span className="absolute top-4 bottom-0 w-px bg-gradient-to-b from-gold-500/50 to-line" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-semibold leading-6 text-navy-900">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

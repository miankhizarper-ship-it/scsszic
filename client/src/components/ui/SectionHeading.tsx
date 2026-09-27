import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Small uppercase eyebrow above the title, e.g. "Upcoming Events". */
  label?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  /** Tone for the surface the heading sits on. */
  tone?: "light" | "dark";
  /** Optional trailing link, e.g. "View all events". */
  action?: { label: string; to: string };
  className?: string;
  id?: string;
}

/**
 * SectionHeading — consistent eyebrow / title / description / action pattern
 * used by every Home section and list page.
 */
export function SectionHeading({
  label,
  title,
  description,
  align = "center",
  tone = "light",
  action,
  className,
  id,
}: SectionHeadingProps) {
  const isCenter = align === "center";
  const onDark = tone === "dark";

  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        isCenter && "mx-auto text-center",
        className,
      )}
    >
      {label && (
        <p
          className={cn(
            "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em]",
            isCenter && "justify-center",
            onDark ? "text-gold-300" : "text-gold-600",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("h-px w-8", onDark ? "bg-gold-500/70" : "bg-gold-500")}
          />
          {label}
          {isCenter && (
            <span
              aria-hidden="true"
              className={cn("h-px w-8", onDark ? "bg-gold-500/70" : "bg-gold-500")}
            />
          )}
        </p>
      )}

      <h2
        id={id}
        className={cn(
          "mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl",
          onDark ? "text-white" : "text-navy-900",
        )}
      >
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            onDark ? "text-slate-300" : "text-muted",
          )}
        >
          {description}
        </p>
      )}

      {action && (
        <Link
          to={action.to}
          className={cn(
            "group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
            onDark
              ? "text-gold-300 hover:text-gold-200"
              : "text-navy-900 hover:text-navy-700",
          )}
        >
          {action.label}
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </Reveal>
  );
}

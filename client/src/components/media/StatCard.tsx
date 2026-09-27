import { cn } from "@/lib/utils";
import type { Stat } from "@/types";

interface StatCardProps {
  stat: Stat;
  /** "dark" → on navy surfaces (gold value). "light" → on light surfaces. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * StatCard — reusable metric card.
 * Values arrive from mock data today and from the API tomorrow; the card
 * itself never changes.
 */
export function StatCard({ stat, tone = "dark", className }: StatCardProps) {
  const onDark = tone === "dark";
  const Icon = stat.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5",
        onDark ? "border-white/10 bg-white/5" : "border-line bg-white shadow-sm",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-lg border",
          onDark
            ? "border-white/10 bg-navy-950/60 text-gold-400"
            : "border-navy-100 bg-navy-50 text-navy-700",
        )}
      >
        <Icon size={19} aria-hidden="true" />
      </span>

      <p
        className={cn(
          "font-display text-3xl font-extrabold tracking-tight sm:text-4xl",
          onDark ? "text-gold-400" : "text-navy-900",
        )}
      >
        {stat.value}
        <span aria-hidden="true">{stat.suffix}</span>
        <span className="sr-only">
          {stat.suffix === "+" ? " plus" : stat.suffix}
        </span>
      </p>

      <div>
        <p
          className={cn(
            "text-sm font-semibold",
            onDark ? "text-white" : "text-navy-900",
          )}
        >
          {stat.label}
        </p>
        <p className={cn("mt-0.5 text-xs", onDark ? "text-slate-400" : "text-muted")}>
          {stat.description}
        </p>
      </div>
    </div>
  );
}

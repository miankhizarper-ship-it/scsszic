import { Check, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FilterGroup {
  /** Group id, e.g. "batch". */
  id: string;
  /** Visible group label, e.g. "Batch". */
  label: string;
  /** Option values — also the `values` keys. */
  options: readonly string[];
}

interface FilterBarProps {
  groups: FilterGroup[];
  /** Currently selected value per group id, or undefined when unselected. */
  values: Record<string, string | undefined>;
  onToggle: (groupId: string, value: string) => void;
  onClear: () => void;
  clearLabel?: string;
  /** Optional display-label override (value stays the option string). */
  getOptionLabel?: (groupId: string, option: string) => string;
  className?: string;
}

/**
 * FilterBar — single-select chip groups for directory filtering.
 *
 * Generic and data-driven: pass any number of groups; selection state lives
 * in the parent so it can be swapped for URL state or an API-backed query
 * later without touching this component.
 */
export function FilterBar({
  groups,
  values,
  onToggle,
  onClear,
  clearLabel = "Clear filters",
  getOptionLabel,
  className,
}: FilterBarProps) {
  /* "All" is the sentinel some filter wrappers pass for "no selection" —
     treat it like empty so the clear action only appears when it has work. */
  const hasSelection = Object.values(values).some((value) => value && value !== "All");

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
        >
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted sm:w-20">
            {group.label}
          </p>

          <ul className="flex flex-wrap items-center gap-2" aria-label={`${group.label} filters`}>
            {group.options.map((option) => {
              const active = values[group.id] === option;

              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => onToggle(group.id, option)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium",
                      "transition-colors duration-200",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
                      active
                        ? "border-navy-900 bg-navy-900 text-white shadow-sm"
                        : "border-line bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50",
                    )}
                  >
                    {active && <Check size={13} aria-hidden="true" className="text-gold-300" />}
                    {getOptionLabel ? getOptionLabel(group.id, option) : option}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {hasSelection && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-navy-900",
            "rounded-md transition-colors hover:text-gold-600",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
          )}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {clearLabel}
        </button>
      )}
    </div>
  );
}

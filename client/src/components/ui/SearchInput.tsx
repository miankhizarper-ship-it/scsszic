import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** Visual surface the input sits on. */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * SearchInput — controlled text search with icon and clear affordance.
 * Generic (works on light navy-tinted or dark navy surfaces).
 */
export function SearchInput({
  id,
  value,
  onChange,
  placeholder = "Search…",
  label,
  tone = "light",
  className,
}: SearchInputProps) {
  const onDark = tone === "dark";

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          size={17}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2",
            onDark ? "text-slate-400" : "text-muted",
          )}
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-lg border pl-10 pr-10 text-sm shadow-sm transition-colors",
            "placeholder:text-current/50 focus:outline-2 focus:outline-offset-1 focus:outline-gold-500",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden", // custom clear button only
            onDark
              ? "border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-gold-500/60"
              : "border-line bg-white text-ink placeholder:text-muted focus:border-navy-300",
          )}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className={cn(
              "absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md transition-colors",
              onDark
                ? "text-slate-400 hover:bg-white/10 hover:text-white"
                : "text-muted hover:bg-navy-50 hover:text-navy-900",
            )}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

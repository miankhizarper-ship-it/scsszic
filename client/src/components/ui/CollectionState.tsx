import { AlertTriangle, RotateCcw, SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Shared API-state primitives (Phase 8) — loading skeletons and error
 * panels used by API-backed pages so a slow or unavailable API never
 * produces a blank screen (spec §16). Visual language matches EmptyState.
 */

/** Pulsing placeholder rows — neutral rhythm matching card grids. */
export function ListSkeleton({
  rows = 3,
  variant = "card",
  className,
}: {
  rows?: number;
  /** "card" = tall blocks for grids; "row" = slim bars for lists. */
  variant?: "card" | "row";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn(
        variant === "card"
          ? "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-4",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse rounded-xl border border-line bg-white",
            variant === "card" ? "h-64" : "h-20",
          )}
        />
      ))}
    </div>
  );
}

/** Full-width loading panel for page-level fetches. */
export function CollectionLoading({
  label = "Loading content…",
  rows = 6,
  variant = "card",
  className,
}: {
  label?: string;
  rows?: number;
  variant?: "card" | "row";
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <p className="sr-only">{label}</p>
      <ListSkeleton rows={rows} variant={variant} />
    </div>
  );
}

/** Error panel with retry — friendly, actionable, never a stack trace. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Check your connection and try again — the rest of the site is still available.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      className={className}
    >
      {onRetry && (
        <Button variant="navy" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          Try again
        </Button>
      )}
    </EmptyState>
  );
}

/** Empty-state helper tuned for "no results" (kept for symmetry/readability). */
export function NoResultsState({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <EmptyState icon={SearchX} title={title} description={description} className={className}>
      {children}
    </EmptyState>
  );
}

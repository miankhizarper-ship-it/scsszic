import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  /** Optional action area (buttons/links) rendered below the copy. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — friendly zero-result / no-data panel.
 * Used by directories and lists when a filter or query returns nothing.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-xl border border-gold-500/40 bg-navy-50 text-navy-700"
        >
          <Icon size={24} />
        </span>
      )}

      <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

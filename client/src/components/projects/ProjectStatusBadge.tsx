import { Activity, CheckCircle2, Archive } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

/**
 * Project status presentation — icon + text, never color alone (the same
 * accessibility rule as EventStatusBadge). Light-tone chips for cards and
 * detail headers.
 */

const STATUS_META: Record<ProjectStatus, { icon: React.ElementType; label: string; classes: string }> = {
  active: {
    icon: Activity,
    label: "In Development",
    classes: "border-gold-200 bg-gold-50 text-gold-700",
  },
  completed: {
    icon: CheckCircle2,
    label: "Shipped",
    classes: "border-navy-100 bg-navy-50 text-navy-700",
  },
  archived: {
    icon: Archive,
    label: "Archived",
    classes: "border-line bg-surface text-muted",
  },
};

export function getProjectStatusLabel(status: ProjectStatus): string {
  return STATUS_META[status].label;
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const { icon: Icon, label, classes } = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        classes,
        className,
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar, type FilterGroup } from "@/components/ui/FilterBar";
import { EVENT_CATEGORIES, EVENT_DATE_OPTIONS, EVENT_STATUSES } from "@/data/events";
import { cn } from "@/lib/utils";

export type EventFilterGroupId = "category" | "status" | "date";

interface EventFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Currently selected values ("" = All). */
  values: Record<EventFilterGroupId, string>;
  /** Called with "" when a group is set back to All. */
  onFilterChange: (group: EventFilterGroupId, value: string) => void;
  onClear: () => void;
  /** Category options — defaults to the curated constants; pages pass the
   *  admin-managed vocabulary (Phase 10C) from useCategories("events"). */
  categories?: readonly string[];
  /** Result count / hint content rendered under the filter groups. */
  children?: React.ReactNode;
  className?: string;
}

const ALL = "All";

/**
 * EventFilters — search + category/status/date chip filters for /events.
 *
 * Generic and stateless: filter state lives in the page (designed to become
 * URL or API query state later). "All" chips reset their group, and the
 * mobile layout wraps naturally so touch targets stay comfortable.
 */
export function EventFilters({
  query,
  onQueryChange,
  values,
  onFilterChange,
  onClear,
  categories = EVENT_CATEGORIES,
  children,
  className,
}: EventFiltersProps) {
  const groups: FilterGroup[] = [
    { id: "category", label: "Category", options: [ALL, ...categories] },
    { id: "status", label: "Status", options: [ALL, ...EVENT_STATUSES] },
    { id: "date", label: "Date", options: [ALL, ...EVENT_DATE_OPTIONS] },
  ];

  const displayValues: Record<string, string | undefined> = {
    category: values.category || ALL,
    status: values.status || ALL,
    date: values.date || ALL,
  };

  const handleToggle = (groupId: string, value: string) => {
    const group = groupId as EventFilterGroupId;
    onFilterChange(group, value === ALL ? "" : value);
  };

  return (
    <Container className={cn("relative", className)}>
      <Reveal>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <SearchInput
            id="events-search"
            value={query}
            onChange={onQueryChange}
            placeholder="Search by title, topic, tag, or location…"
            label="Search events"
            className="max-w-xl"
          />

          <div className="mt-5 border-t border-line pt-5">
            <FilterBar
              groups={groups}
              values={displayValues}
              onToggle={handleToggle}
              onClear={onClear}
            />
          </div>

          {children && <div className="mt-5 border-t border-line pt-4">{children}</div>}
        </div>
      </Reveal>
    </Container>
  );
}

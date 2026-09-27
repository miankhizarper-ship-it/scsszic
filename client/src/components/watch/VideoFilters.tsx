import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar, type FilterGroup } from "@/components/ui/FilterBar";
import { WATCH_CATEGORIES, WATCH_DURATION_OPTIONS } from "@/data/watch";
import { cn } from "@/lib/utils";

export type VideoFilterGroupId = "category" | "duration";

interface VideoFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Currently selected values ("" = All). */
  values: Record<VideoFilterGroupId, string>;
  /** Called with "" when a group is set back to All. */
  onFilterChange: (group: VideoFilterGroupId, value: string) => void;
  onClear: () => void;
  /** Category options — defaults to the curated constants; pages pass the
   *  admin-managed vocabulary (Phase 10C) from useCategories("videos"). */
  categories?: readonly string[];
  /** Result count / hint content rendered under the filter groups. */
  children?: React.ReactNode;
  className?: string;
}

const ALL = "All";

/**
 * VideoFilters — search + category/duration chip filters for /watch.
 *
 * Stateless like the other directory filters: state lives in the page
 * (designed to become URL or API query state later). Categories and duration
 * buckets are centralized in data/watch.ts, so neither is hardcoded here.
 */
export function VideoFilters({
  query,
  onQueryChange,
  values,
  onFilterChange,
  onClear,
  categories = WATCH_CATEGORIES,
  children,
  className,
}: VideoFiltersProps) {
  const groups: FilterGroup[] = [
    { id: "category", label: "Category", options: [ALL, ...categories] },
    { id: "duration", label: "Length", options: [ALL, ...WATCH_DURATION_OPTIONS] },
  ];

  const displayValues: Record<string, string | undefined> = {
    category: values.category || ALL,
    duration: values.duration || ALL,
  };

  const handleToggle = (groupId: string, value: string) => {
    const group = groupId as VideoFilterGroupId;
    onFilterChange(group, value === ALL ? "" : value);
  };

  return (
    <Container className={cn("relative", className)}>
      <Reveal>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <SearchInput
            id="watch-search"
            value={query}
            onChange={onQueryChange}
            placeholder="Search videos by title, speaker, topic, or tag…"
            label="Search videos"
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

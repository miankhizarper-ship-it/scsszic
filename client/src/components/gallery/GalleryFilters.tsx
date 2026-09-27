import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar, type FilterGroup } from "@/components/ui/FilterBar";
import { GALLERY_CATEGORIES } from "@/data/gallery";
import { cn } from "@/lib/utils";

export type GalleryFilterGroupId = "category" | "year";

interface GalleryFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Currently selected values ("" = All). */
  values: Record<GalleryFilterGroupId, string>;
  /** Called with "" when a group is set back to All. */
  onFilterChange: (group: GalleryFilterGroupId, value: string) => void;
  /** Distinct capture years derived from the dataset (lib/gallerySearch). */
  years: string[];
  onClear: () => void;
  /** Category options — defaults to the curated constants; pages pass the
   *  admin-managed vocabulary (Phase 10C) from useCategories("gallery"). */
  categories?: readonly string[];
  /** Result count / hint content rendered under the filter groups. */
  children?: React.ReactNode;
  className?: string;
}

const ALL = "All";

/**
 * GalleryFilters — search + category/year chip filters for /gallery.
 *
 * Stateless like EventFilters/BlogFilters: state lives in the page (designed
 * to become URL or API query state later). Categories are centralized in
 * data/gallery.ts and years are derived from the dataset, so neither is
 * hardcoded here.
 */
export function GalleryFilters({
  query,
  onQueryChange,
  values,
  onFilterChange,
  years,
  onClear,
  categories = GALLERY_CATEGORIES,
  children,
  className,
}: GalleryFiltersProps) {
  const groups: FilterGroup[] = [
    { id: "category", label: "Category", options: [ALL, ...categories] },
    { id: "year", label: "Year", options: [ALL, ...years] },
  ];

  const displayValues: Record<string, string | undefined> = {
    category: values.category || ALL,
    year: values.year || ALL,
  };

  const handleToggle = (groupId: string, value: string) => {
    const group = groupId as GalleryFilterGroupId;
    onFilterChange(group, value === ALL ? "" : value);
  };

  return (
    <Container className={cn("relative", className)}>
      <Reveal>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <SearchInput
            id="gallery-search"
            value={query}
            onChange={onQueryChange}
            placeholder="Search albums by title, tag, location, or moment…"
            label="Search albums"
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

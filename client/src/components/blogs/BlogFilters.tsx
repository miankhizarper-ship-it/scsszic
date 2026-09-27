import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar, type FilterGroup } from "@/components/ui/FilterBar";
import { BLOG_CATEGORIES } from "@/data/blogs";
import { cn } from "@/lib/utils";

export type BlogFilterGroupId = "category" | "tag";

interface BlogFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Currently selected values ("" = All). */
  values: Record<BlogFilterGroupId, string>;
  /** Called with "" when a group is set back to All. */
  onFilterChange: (group: BlogFilterGroupId, value: string) => void;
  /** Popular tags for the compact tag row (derived from data at page level). */
  tags: string[];
  onClear: () => void;
  /** Category options — defaults to the curated constants; pages pass the
   *  admin-managed vocabulary (Phase 10C) from useCategories("blogs"). */
  categories?: readonly string[];
  /** Result count / hint content rendered under the filter groups. */
  children?: React.ReactNode;
  className?: string;
}

const ALL = "All";

/**
 * BlogFilters — search + category/tag chip filters for /blogs.
 *
 * Stateless like EventFilters: state lives in the page (designed to become
 * URL or API query state later). Categories are centralized in data/blogs.ts
 * and the tag row is derived from the dataset, so neither is hardcoded here.
 */
export function BlogFilters({
  query,
  onQueryChange,
  values,
  onFilterChange,
  tags,
  onClear,
  categories = BLOG_CATEGORIES,
  children,
  className,
}: BlogFiltersProps) {
  const groups: FilterGroup[] = [
    { id: "category", label: "Category", options: [ALL, ...categories] },
    { id: "tag", label: "Tag", options: [ALL, ...tags] },
  ];

  const displayValues: Record<string, string | undefined> = {
    category: values.category || ALL,
    tag: values.tag || ALL,
  };

  const handleToggle = (groupId: string, value: string) => {
    const group = groupId as BlogFilterGroupId;
    onFilterChange(group, value === ALL ? "" : value);
  };

  return (
    <Container className={cn("relative", className)}>
      <Reveal>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <SearchInput
            id="blogs-search"
            value={query}
            onChange={onQueryChange}
            placeholder="Search articles by title, topic, tag, or author…"
            label="Search articles"
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

import { useMemo, useState } from "react";
import { Newspaper, SearchX, Sparkles } from "lucide-react";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BlogCard } from "@/components/media/BlogCard";
import { FeaturedBlog } from "@/components/blogs/FeaturedBlog";
import { BlogFilters, type BlogFilterGroupId } from "@/components/blogs/BlogFilters";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useBlogs, useFeaturedBlog } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BLOG_CATEGORIES } from "@/data/blogs";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * BlogsPage — the public blog experience (/blogs).
 *
 * Order: Hero → Featured Blog → Search + Filters → Blog Grid →
 * Empty State → CTA (spec §5).
 *
 * Phase 8: search/category/tag filtering runs SERVER-side against
 * GET /api/blogs (facets in meta); drafts and archived articles never
 * leave the database. The featured article renders in its own block above
 * the grid, so the grid excludes it by id to avoid duplication — the
 * "Showing N articles" count stays the true filter result count.
 */
export default function BlogsPage() {
  usePageMetadata({
    title: buildPageTitle("Blogs"),
    description:
      "Read technology articles, tutorials, insights, and stories from the Society of Computer Science.",
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, category, tag }),
    [debouncedQuery, category, tag],
  );

  const blogsQuery = useBlogs(filters);
  const filtered = useMemo(() => blogsQuery.data?.data ?? [], [blogsQuery.data]);
  const facets = blogsQuery.data?.meta.facets;
  const total = facets?.total ?? 0;
  const popularTags = ((facets?.tags ?? []) as Array<{ value?: string }> )
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const contributorCount = ((facets?.authors ?? []) as Array<{ value?: string }>).length;

  const featuredQuery = useFeaturedBlog();
  const featuredBlog = featuredQuery.data;

  /* The feature block already displays the featured article. */
  const gridBlogs = useMemo(
    () => filtered.filter((blog) => blog.id !== featuredBlog?.id),
    [filtered, featuredBlog],
  );

  const hasActiveFilters = query.trim() !== "" || category !== "" || tag !== "";

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setTag("");
  };

  const handleFilterChange = (group: BlogFilterGroupId, value: string) => {
    /* Toggle semantics: clicking the active chip deselects it (matches the
       events and alumni directories); "" (the All chip) resets the group. */
    const setter = group === "category" ? setCategory : setTag;
    setter((prev) => (prev === value ? "" : value));
  };

  return (
    <>
      <PageHero
        id="blogs-heading"
        eyebrow="Blogs"
        title={
          <>
            Ideas, Insights &amp; The{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              World of Computing
            </span>
          </>
        }
        description="Explore articles, ideas, tutorials, perspectives, and stories from the world of Computer Science and technology."
      >
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { value: `${total}`, label: "Articles" },
            { value: `${BLOG_CATEGORIES.length}`, label: "Categories" },
            { value: `${contributorCount}`, label: "Writers" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm"
            >
              <dt className="order-2 mt-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {label}
              </dt>
              <dd className="order-1 font-display text-2xl font-bold text-gold-300">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      {/* ---------- Featured article ---------- */}
      {featuredBlog && <FeaturedBlog blog={featuredBlog} />}

      {/* ---------- Search + filters ---------- */}
      <section aria-label="Search and filter articles" className="bg-surface py-12 lg:py-14">
        <BlogFilters
          query={query}
          onQueryChange={setQuery}
          values={{ category, tag }}
          onFilterChange={handleFilterChange}
          tags={popularTags}
          onClear={clearFilters}
        >
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {blogsQuery.isPending
              ? "Loading articles…"
              : blogsQuery.isError
                ? "Articles are temporarily unavailable."
                : (
                    <>
                      Showing{" "}
                      <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
                      {filtered.length === 1 ? "article" : "articles"}
                      {hasActiveFilters ? " matching your filters" : ""}.
                    </>
                  )}
          </p>
        </BlogFilters>
      </section>

      {blogsQuery.isPending && (
        <section aria-label="Loading articles" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <CollectionLoading rows={6} label="Loading articles…" />
          </Container>
        </section>
      )}

      {blogsQuery.isError && (
        <section aria-label="Articles failed to load" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <ErrorState
              title="Articles couldn't load"
              description="The blog is temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void blogsQuery.refetch()}
              className="mx-auto max-w-xl border-solid"
            />
          </Container>
        </section>
      )}

      {!blogsQuery.isPending && !blogsQuery.isError && filtered.length === 0 && (
        /* ---------- Empty state ---------- */
        <section aria-label="No articles found" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <EmptyState
              icon={SearchX}
              title="No articles match those filters"
              description="Try a different search term, or clear the category and tag filters to browse every article the community has written."
              className="mx-auto max-w-xl border-solid"
            >
              <Button variant="navy" onClick={clearFilters}>
                <Sparkles size={16} aria-hidden="true" />
                Clear search & filters
              </Button>
            </EmptyState>
          </Container>
        </section>
      )}

      {!blogsQuery.isPending && !blogsQuery.isError && filtered.length > 0 && (
        /* ---------- Blog grid (empty state handled above) ---------- */
        <section
          aria-labelledby="blog-grid-heading"
          className="bg-surface pb-20 lg:pb-24"
        >
          <Container>
            <SectionHeading
              id="blog-grid-heading"
              align="left"
              label="All Articles"
              title="Latest from the community"
              description="Tutorials, explainers, and perspective pieces — newest first. Open any article for the full read."
            />

            <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {gridBlogs.map((blog, index) => (
                <Reveal key={blog.id} delay={(index % 3) * 0.06} className="h-full">
                  <li className="h-full">
                    <BlogCard blog={blog} className="h-full" />
                  </li>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <CTASection
        id="blogs-cta"
        eyebrow="Write for the Community"
        title="Have an idea worth sharing?"
        description="From first-semester lessons to deep technical dives — the SCS blog is written by students, for students. Pitch an article and add your voice to the community."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Pitch an Article", to: ROUTES.contact }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <Newspaper size={13} aria-hidden="true" />
            Articles shown here are fictional demo content during development.
          </span>
        }
      />
    </>
  );
}

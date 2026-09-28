import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlogCard } from "@/components/media/BlogCard";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Newspaper } from "lucide-react";
import { useFeaturedBlog, useLatestBlogs } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * FeaturedBlog — one featured article beside a stack of compact cards.
 *
 * The section never depends on an article being explicitly marked as
 * featured: when no featured article exists (the common case for a new
 * community), the newest published article takes the feature slot and the
 * next two fill the sidebar, so freshly published posts always surface on
 * the home page. With zero published articles a friendly empty state keeps
 * the section from collapsing to a bare heading.
 */
export function FeaturedBlog() {
  const featureQuery = useFeaturedBlog();
  const latestQuery = useLatestBlogs(3);
  const latest = latestQuery.data ?? [];

  /* The marked feature wins; otherwise the newest published article is
     promoted so the section renders whenever ANY article is published. */
  const feature = featureQuery.data ?? latest[0] ?? null;

  /* Sidebar companions: the newest articles that are not the feature. */
  const sidebarPosts = latest
    .filter((blog) => blog.id !== feature?.id)
    .slice(0, 2);

  const loading = featureQuery.isPending || latestQuery.isPending;
  const error = featureQuery.isError || latestQuery.isError;
  const empty = !loading && !error && !feature;
  const retry = () => {
    if (featureQuery.isError) void featureQuery.refetch();
    if (latestQuery.isError) void latestQuery.refetch();
  };

  return (
    <section aria-labelledby="blog-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="blog-heading"
          label="From the Blog"
          title="Insights, guides & student stories"
          description="Written by members, for members — career roadmaps, practical tutorials, and opinions from the SCS community."
          action={{ label: "Visit the blog", to: ROUTES.blogs }}
        />

        {loading && <CollectionLoading rows={3} className="mt-12" label="Loading articles…" />}

        {error && (
          <ErrorState
            title="Articles couldn't load"
            description="The blog is temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={retry}
            className="mt-12 border-solid"
          />
        )}

        {empty && (
          <EmptyState
            icon={Newspaper}
            title="No articles published yet"
            description="The community hasn't published its first article — the newest stories will appear here as soon as they go live. Explore the blog to see what's coming."
            className="mt-12 border-solid"
          />
        )}

        {!loading && !error && feature && (
          /* Phase 12 redesign — three equal full-size cards (featured first)
             instead of one large + two small compact thumbnails. */
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[feature, ...sidebarPosts].map((post, index) => (
              <Reveal key={post.id} delay={index * 0.08} className="h-full">
                <BlogCard blog={post} className="h-full" />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

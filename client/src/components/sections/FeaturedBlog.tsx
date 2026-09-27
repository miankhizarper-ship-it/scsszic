import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlogCard } from "@/components/media/BlogCard";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useBlogs, useFeaturedBlog } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * FeaturedBlog — one featured article beside a stack of compact cards.
 * Data flows through the blog API (published-only) with the feature and
 * its two newest companions resolved server-side in one request each.
 */
export function FeaturedBlog() {
  const featureQuery = useFeaturedBlog();
  const feature = featureQuery.data;

  /* Sidebar companions: the two newest published articles that are not the
     feature (limit=3 keeps the payload small; the filter drops the feature). */
  const latestQuery = useBlogs({ query: "", category: "", tag: "" });
  const sidebarPosts = (latestQuery.data?.data ?? [])
    .filter((blog) => blog.id !== feature?.id)
    .slice(0, 2);

  const loading = featureQuery.isPending || latestQuery.isPending;
  const error = featureQuery.isError || latestQuery.isError;
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

        {!loading && !error && feature && (
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Reveal className="h-full">
              <BlogCard blog={feature} className="h-full" />
            </Reveal>

            <div className="flex flex-col gap-6">
              {sidebarPosts.map((post, index) => (
                <Reveal key={post.id} delay={0.08 + index * 0.08} className="flex-1">
                  <BlogCard blog={post} variant="compact" className="h-full" />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

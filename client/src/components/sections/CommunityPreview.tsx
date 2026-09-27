import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeedPostCard } from "@/components/community/FeedPostCard";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useFeedPreview } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * CommunityPreview — modern feed preview on Home.
 * Three newest published posts via the feed API (cross-references already
 * resolved server-side on each post); the full feed supports member/admin
 * publishing in a later phase.
 */
export function CommunityPreview() {
  const postsQuery = useFeedPreview(3);
  const posts = postsQuery.data ?? [];

  return (
    <section aria-labelledby="feed-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="feed-heading"
          label="Community Feed"
          title="Conversations from the community"
          description="A glimpse of what members are discussing right now — announcements, wins, and shared resources."
          action={{ label: "Open the feed", to: ROUTES.feed }}
        />

        {postsQuery.isPending && (
          <CollectionLoading rows={3} className="mt-12" label="Loading feed…" />
        )}

        {postsQuery.isError && (
          <ErrorState
            title="The feed couldn't load"
            description="Feed posts are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void postsQuery.refetch()}
            className="mt-12 border-solid"
          />
        )}

        {!postsQuery.isPending && !postsQuery.isError && posts.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={index * 0.08} className="h-full">
                <FeedPostCard post={post} variant="compact" className="h-full" />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

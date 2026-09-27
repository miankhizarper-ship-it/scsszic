import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoCard } from "@/components/watch/VideoCard";
import { ROUTES } from "@/routes/paths";
import type { WatchVideo } from "@/types";

interface RelatedVideosProps {
  /** Pre-selected via getRelatedVideos() — selection logic stays out of the component. */
  videos: WatchVideo[];
  className?: string;
}

/**
 * RelatedVideos — the related-content band on video detail pages.
 *
 * Renders the pre-selected videos only (same pattern as RelatedBlogs and
 * RelatedEvents); selection lives in lib/watchSearch. Hidden entirely when
 * there is nothing to show.
 */
export function RelatedVideos({ videos, className }: RelatedVideosProps) {
  if (videos.length === 0) return null;

  return (
    <section
      aria-labelledby="related-videos-heading"
      className={className ?? "bg-surface py-16 lg:py-20"}
    >
      <Container>
        <SectionHeading
          id="related-videos-heading"
          align="left"
          label="Related Videos"
          title="Keep watching"
          description="More sessions from the same topics, speakers, and events."
          action={{ label: "Browse all videos", to: ROUTES.watch }}
        />

        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video, index) => (
            <Reveal key={video.id} delay={(index % 3) * 0.06} className="h-full">
              <li className="h-full">
                <VideoCard video={video} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

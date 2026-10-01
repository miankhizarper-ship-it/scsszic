import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mic,
  SearchX,
  Tag,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { RelatedVideos } from "@/components/watch/RelatedVideos";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useEvent, useRelatedVideos, useVideo } from "@/hooks/content";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * WatchVideoPage — the video experience (/watch/:videoSlug).
 *
 * Order: Breadcrumb → Video player → Category → Title → Excerpt →
 * Duration → Publish date → Speaker → Event → Description → Tags →
 * Related videos → CTA (spec §20).
 *
 * The event chip only renders (and links to /events/:slug) when the linked
 * event actually exists in the current events dataset. Speakers reuse the
 * fictional personas from the events/blog datasets; they are plain text
 * because those datasets don't expose per-person pages yet.
 *
 * Phase 8: the lookup runs against GET /api/watch/:videoSlug — archived
 * videos and unknown slugs resolve to the same Not Found state (spec §13).
 */
export default function WatchVideoPage() {
  const { videoSlug } = useParams<{ videoSlug: string }>();

  // Hooks stay unconditional; early returns come after them.
  const videoQuery = useVideo(videoSlug);
  const video = videoQuery.data;
  const linkedEventQuery = useEvent(video ? video.eventSlug : undefined);
  const linkedEvent = linkedEventQuery.data;
  const relatedQuery = useRelatedVideos(video ? video.slug : undefined);
  const related = relatedQuery.data ?? [];

  usePageMetadata({
    title: video
      ? `${video.title} | Society of Computer Science`
      : "Video Not Found | Society of Computer Science",
    description: video
      ? video.excerpt
      : "Recorded talks, workshops, and event highlights from the Society of Computer Science.",
  });

  if (videoQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading video…"
      />
    );
  }

  if (videoQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this video right now"
            description="The video is temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void videoQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Video Not Found"
            description="This video doesn't exist or may have been archived. Browse Watch for everything the media hub currently offers."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.watch} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Watch
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Video header + player ---------- */}
      <section aria-labelledby="video-heading" className="bg-surface">
        <div aria-hidden="true" className="gold-hairline h-px w-full" />

        <Container className="py-10 sm:py-12 lg:py-14">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li>
                <Link
                  to={ROUTES.watch}
                  className="font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Watch
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted">
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="max-w-[60vw] truncate text-muted sm:max-w-md">
                {video.title}
              </li>
            </ol>
          </nav>

          <Reveal className="mt-8">
            <VideoPlayer video={video} />
          </Reveal>

          <Reveal delay={0.08} className="mt-10 max-w-3xl">
            <Badge variant="solidGold">{video.category}</Badge>

            <h1
              id="video-heading"
              className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-navy-900 text-balance sm:text-4xl lg:text-[2.6rem]"
            >
              {video.title}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-muted">{video.excerpt}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} aria-hidden="true" className="text-gold-600" />
                {video.duration}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" className="text-gold-600" />
                <time dateTime={video.publishedAt}>
                  {formatDateLong(video.publishedAt)}
                </time>
              </span>
              {video.speaker && (
                <span className="inline-flex items-center gap-1.5">
                  <Mic size={14} aria-hidden="true" className="text-gold-600" />
                  <span>
                    <span className="sr-only">Speaker: </span>
                    {video.speaker}
                  </span>
                </span>
              )}
              {linkedEvent && (
                <Link
                  to={ROUTES.eventDetail(linkedEvent.slug)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  From the event: {linkedEvent.title}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              )}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Description + tags ---------- */}
      <section aria-label="About this video" className="border-t border-line bg-white py-12 lg:py-16">
        <Container className="max-w-4xl">
          <div className="mx-auto max-w-[780px]">
            <h2 className="sr-only">About this video</h2>
            {video.description.split("\n\n").map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-[15px] leading-7 text-ink/85 first:mt-0 [&:not(:first-child)]:mt-5">
                {paragraph}
              </p>
            ))}

            {/* Tags */}
            {video.tags.length > 0 && (
              <div className="mt-10 border-t border-line pt-8">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-navy-900">
                  <Tag size={14} aria-hidden="true" className="text-gold-600" />
                  Topics covered
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Video topics">
                  {video.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md border border-navy-100 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- Related videos ---------- */}
      <RelatedVideos videos={related} />

      {/* ---------- CTA ---------- */}
      <CTASection
        id="video-cta"
        eyebrow="Keep Learning"
        title="Turn watching into building"
        description="Every session in this hub started as a room full of students learning together. Join the Society of Computer Science to attend live workshops, find teammates, and put what you watch into practice."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Browse All Videos", to: ROUTES.watch }}
      />
    </>
  );
}

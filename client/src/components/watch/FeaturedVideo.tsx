import { ArrowRight, Clock3, Mic } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ROUTES } from "@/routes/paths";
import { formatDateLong } from "@/lib/format";
import type { WatchVideo } from "@/types";

interface FeaturedVideoProps {
  /** Selected once at page level via getFeaturedVideo() — logic stays out of the component. */
  video: WatchVideo;
}

/**
 * FeaturedVideo — the large feature on /watch.
 *
 * Desktop: two-column player + copy. Mobile: stacks naturally. Uses the
 * full VideoPlayer (poster + play affordance, never autoplay) rather than
 * a bare thumbnail, so the media-hub identity is immediate. Quieter than
 * the gallery feature on purpose — Watch is content-led.
 */
export function FeaturedVideo({ video }: FeaturedVideoProps) {
  const detailHref = ROUTES.videoDetail(video.slug);

  return (
    <section aria-labelledby="featured-video-heading" className="bg-surface pb-4 pt-14 lg:pb-6 lg:pt-16">
      <Container>
        <Reveal>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
            Featured session
          </p>

          <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* Player */}
            <div>
              <Link
                to={detailHref}
                aria-label={`Open video: ${video.title}`}
                className="group relative block overflow-hidden rounded-2xl border border-line shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                <img
                  src={video.thumbnail}
                  alt={video.thumbnailAlt}
                  width={1600}
                  height={900}
                  loading="eager"
                  decoding="async"
                  className="aspect-video w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center bg-navy-950/25"
                >
                  <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-navy-950/70 text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:border-gold-400/70 group-hover:text-gold-300 sm:size-20">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-7 sm:size-8">
                      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.9l11-6.86a1.05 1.05 0 0 0 0-1.8l-11-6.86A1.05 1.05 0 0 0 8 5.14Z" />
                    </svg>
                  </span>
                </div>
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-navy-950/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <Clock3 size={12} aria-hidden="true" className="text-gold-300" />
                  {video.duration}
                </span>
              </Link>
            </div>

            {/* Copy */}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">
                {video.category}
              </p>

              <h2
                id="featured-video-heading"
                className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-navy-900 text-balance sm:text-3xl lg:text-[2.1rem]"
              >
                <Link
                  to={detailHref}
                  className="rounded-sm transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  {video.title}
                </Link>
              </h2>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
                {video.excerpt}
              </p>

              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                {video.speaker && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mic size={13} aria-hidden="true" className="text-gold-600" />
                    {video.speaker}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} aria-hidden="true" className="text-gold-600" />
                  {video.duration}
                </span>
                <time dateTime={video.publishedAt}>
                  {formatDateLong(video.publishedAt)}
                </time>
              </p>

              <div className="mt-7">
                <Link
                  to={detailHref}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy-900 px-5 font-display text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Watch Video
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

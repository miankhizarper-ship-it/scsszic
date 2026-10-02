import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, Mic } from "lucide-react";

import { ROUTES } from "@/routes/paths";
import { formatCardDate, formatDurationLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WatchVideo } from "@/types";

interface VideoCardProps {
  video: WatchVideo;
  className?: string;
}

/**
 * VideoCard — the thumbnail-led card for the /watch grid.
 *
 * Shows thumbnail with play icon + duration badge, category, title, and the
 * speaker/event metadata where available. Hover stays subtle (thumbnail
 * zoom + title tint); the play and duration indicators are always visible
 * so essential info never depends on hover.
 */
export function VideoCard({ video, className }: VideoCardProps) {
  const detailHref = ROUTES.videoDetail(video.slug);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-navy-950">
        <img
          src={video.thumbnail}
          alt={video.thumbnailAlt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Play chip — always visible */}
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid size-12 place-items-center rounded-full border border-white/25 bg-navy-950/60 text-white backdrop-blur-sm transition-colors duration-300 group-hover:border-gold-400/70 group-hover:text-gold-300">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-0.5 size-5"
            >
              <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.9l11-6.86a1.05 1.05 0 0 0 0-1.8l-11-6.86A1.05 1.05 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </span>

        {/* Duration badge — event-synced recordings show what they are
            instead of a fake "0:00" (Task 33) */}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-white/15 bg-navy-950/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Clock3 size={11} aria-hidden="true" className="text-gold-300" />
          {formatDurationLabel(video.duration)}
        </span>

        <span className="absolute left-4 top-4 rounded-full border border-gold-500 bg-gold-500 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-navy-950 shadow-sm">
          {video.category}
        </span>
      </div>

      {/* Copy */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-navy-900">
          <Link
            to={detailHref}
            className="rounded-sm transition-colors group-hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            {video.title}
          </Link>
        </h3>

        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted">
          {video.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="min-w-0 flex-1 truncate text-xs text-muted">
            {video.speaker && (
              <span className="inline-flex items-center gap-1.5">
                <Mic size={12} aria-hidden="true" className="shrink-0 text-gold-600" />
                {video.speaker}
              </span>
            )}
            <span className={cn(video.speaker && "ml-3")}>
              <time dateTime={video.publishedAt}>{formatCardDate(video.publishedAt)}</time>
            </span>
          </p>

          {video.eventSlug && (
            <Link
              to={ROUTES.eventDetail(video.eventSlug)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-navy-100 bg-navy-50 px-1.5 py-0.5 text-xs font-medium text-navy-800 transition-colors hover:border-gold-500/60 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              aria-label="This recording is from an event — view the event"
            >
              <CalendarDays size={12} aria-hidden="true" className="shrink-0 text-gold-600" />
              Event
            </Link>
          )}

          <Link
            to={detailHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            aria-label={`Watch video: ${video.title}`}
          >
            Watch
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

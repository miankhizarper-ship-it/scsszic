import { useEffect, useMemo, useState } from "react";
import { CirclePlay, Info } from "lucide-react";

import { toEmbeddableUrl } from "@/lib/videoEmbed";
import type { WatchVideo } from "@/types";

interface VideoPlayerProps {
  video: WatchVideo;
  className?: string;
}

/**
 * VideoPlayer — architecture-ready playback surface (spec §19).
 *
 * Source resolution, in priority order:
 *   1. `videoUrl`  → native <video controls> (Cloudflare R2 / any MP4 CDN
 *                    URL). Play loads the player explicitly — nothing ever
 *                    autoplays without user intent (the poster stays put
 *                    until the viewer presses play).
 *   2. `embedUrl`  → click-to-load privacy-mode iframe. The stored value is
 *                    NORMALIZED at render time (lib/videoEmbed): whatever
 *                    YouTube/Vimeo share form was pasted into the CMS
 *                    (watch?v=…, youtu.be/…, shorts/…, playlists…), the
 *                    iframe only ever receives a genuinely embeddable URL —
 *                    watch-form URLs would be refused with a blank frame.
 *   3. neither     → poster-only fallback state, so a metadata-only entry
 *                    still renders gracefully.
 *
 * Accessibility: the activate control is a real button with a descriptive
 * label; the 16:9 frame is preserved at every width via aspect-video.
 */
export function VideoPlayer({ video, className }: VideoPlayerProps) {
  const [active, setActive] = useState(false);

  const embedSrc = useMemo(() => toEmbeddableUrl(video.embedUrl), [video.embedUrl]);

  /* Reset the activation state when navigating between videos. */
  useEffect(() => {
    setActive(false);
  }, [video.id]);

  const hasVideoUrl = Boolean(video.videoUrl);
  const hasEmbedUrl = embedSrc !== null;

  return (
    <figure className={className}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-navy-950 shadow-sm">
        {active && hasVideoUrl && (
          <video
            src={video.videoUrl}
            poster={video.thumbnail}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={`Play video: ${video.title}`}
            className="absolute inset-0 h-full w-full"
          />
        )}

        {active && !hasVideoUrl && hasEmbedUrl && (
          <iframe
            src={embedSrc ?? undefined}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        )}

        {!active && (
          <>
            <img
              src={video.thumbnail}
              alt={video.thumbnailAlt}
              width={1600}
              height={900}
              loading={video.featured ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Play affordance — a real, labelled control (never autoplay) */}
            <button
              type="button"
              onClick={() => setActive(true)}
              aria-label={
                hasVideoUrl || hasEmbedUrl
                  ? `Play video: ${video.title}`
                  : `Playback not available: ${video.title}`
              }
              className="group absolute inset-0 grid place-items-center bg-navy-950/25 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold-500"
            >
              {hasVideoUrl || hasEmbedUrl ? (
                <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-navy-950/70 text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:border-gold-400/70 group-hover:text-gold-300 sm:size-20">
                  <CirclePlay size={34} aria-hidden="true" className="sm:hidden" />
                  <CirclePlay size={42} aria-hidden="true" className="hidden sm:block" />
                </span>
              ) : (
                /* Fallback state — metadata entry without a playable source */
                <span className="mx-4 flex max-w-sm flex-col items-center gap-2 rounded-xl border border-white/15 bg-navy-950/80 px-5 py-4 text-center backdrop-blur-sm">
                  <Info size={18} aria-hidden="true" className="text-gold-400" />
                  <span className="text-sm font-semibold text-white">
                    Recording not available yet
                  </span>
                  <span className="text-xs leading-relaxed text-slate-300">
                    This entry has no playable source in the demo dataset —
                    real media arrives with the upcoming media-hosting phase.
                  </span>
                </span>
              )}
            </button>
          </>
        )}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{video.duration}</span>
        <span aria-hidden="true">·</span>
        <span>
          {hasVideoUrl || hasEmbedUrl
            ? "Recording shared by the society — press play to watch."
            : "Demo footage — placeholder media, not a real SCS recording."}
        </span>
      </figcaption>
    </figure>
  );
}

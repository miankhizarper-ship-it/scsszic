import { useMemo, useState } from "react";
import { Expand, Film } from "lucide-react";

import { Lightbox, type LightboxItem } from "@/components/gallery/Lightbox";
import { classifyMediaRef, youtubeThumbUrl } from "@/lib/mediaRef";
import { cn } from "@/lib/utils";

interface EventGalleryProps {
  /** Ordered media URLs from the event data (photos and video clips). */
  media: string[];
  /** Used to build meaningful alt text per item and the viewer dialog label. */
  eventTitle: string;
  className?: string;
}

/**
 * EventGallery — responsive, click-to-view media grid for the event detail
 * page (Task 33).
 *
 * Mobile: simple two-column grid. Desktop (3-col): the first item becomes a
 * large 2×2 visual with the smaller shots tiling beside and below it.
 * Entries arrive as plain URL strings in event data, so Cloudflare R2 URLs
 * drop in later without touching this component. Every tile — photo or
 * video — opens the shared Lightbox (the same full-screen viewer the
 * gallery albums use); videos play inside the viewer exactly like they do
 * on the watch pages, while the grid keeps a poster frame with a badge.
 * Task 34: YouTube/Vimeo links are videos too — their tile shows the video's
 * poster (YouTube thumbnails need no API key) and the viewer plays them in
 * a privacy-mode iframe, mirroring the watch player's embed support.
 */
export function EventGallery({ media, eventTitle, className }: EventGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const items = useMemo<LightboxItem[]>(
    () =>
      media.map((src, index) => {
        const kind = classifyMediaRef(src);
        const video = kind !== "image";
        return {
          id: `event-media-${index}`,
          src,
          alt: video
            ? `${eventTitle} — event video ${index + 1} of ${media.length}`
            : `${eventTitle} — event photo ${index + 1} of ${media.length}`,
          ...(kind === "video-file" ? { videoUrl: src } : {}),
          ...(kind === "video-embed" ? { embedUrl: src } : {}),
        };
      }),
    [media, eventTitle],
  );

  if (media.length === 0) return null;

  return (
    <>
      <ul
        className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}
        aria-label={`Photos and videos from ${eventTitle}`}
      >
        {items.map((item, index) => {
          const isHero = index === 0;
          /* Fill the final full-width row when the count leaves one orphan tile. */
          const isWideLast = index === items.length - 1 && items.length % 3 === 1;
          const kind = classifyMediaRef(item.src);
          const video = kind !== "image";
          const embedThumb = kind === "video-embed" ? youtubeThumbUrl(item.src) : null;

          return (
            <li
              key={item.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-line bg-navy-950",
                isHero && "col-span-2 row-span-2",
                isWideLast && !isHero && "col-span-2 md:col-span-3",
              )}
            >
              <button
                type="button"
                onClick={() => setViewerIndex(index)}
                aria-label={`Open ${video ? "video" : "photo"} ${index + 1} of ${items.length}`}
                className={cn(
                  "block h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-500",
                  video ? "cursor-pointer" : "cursor-zoom-in",
                )}
              >
                {kind === "video-file" && (
                  <video
                    src={item.src}
                    playsInline
                    preload="metadata"
                    tabIndex={-1}
                    className={cn(
                      "h-full w-full object-contain",
                      isHero
                        ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0"
                        : "aspect-[4/3]",
                    )}
                    aria-hidden="true"
                  />
                )}
                {kind === "video-embed" && embedThumb !== null && (
                  <img
                    src={embedThumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                      isHero
                        ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0"
                        : "aspect-[4/3]",
                    )}
                    aria-hidden="true"
                  />
                )}
                {kind === "video-embed" && embedThumb === null && (
                  <div
                    className={cn(
                      "grid h-full w-full place-items-center bg-navy-950",
                      isHero
                        ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0"
                        : "aspect-[4/3]",
                    )}
                    aria-hidden="true"
                  >
                    <Film size={24} className="text-white/30" />
                  </div>
                )}
                {kind === "image" && (
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={isHero ? 1200 : 800}
                    height={isHero ? 900 : 600}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                      isHero
                        ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0"
                        : "aspect-[4/3]",
                    )}
                  />
                )}

                {/* Viewer affordance — clip badge for videos, hover zoom hint for photos */}
                {video ? (
                  <span className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-navy-950/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
                    <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Video
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <span className="grid size-10 place-items-center rounded-full border border-white/25 bg-navy-950/70 text-white backdrop-blur-sm">
                      <Expand size={16} aria-hidden="true" />
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {viewerIndex !== null && (
        <Lightbox
          photos={items}
          index={Math.min(viewerIndex, items.length - 1)}
          albumTitle={eventTitle}
          onClose={() => setViewerIndex(null)}
          onNavigate={setViewerIndex}
        />
      )}
    </>
  );
}

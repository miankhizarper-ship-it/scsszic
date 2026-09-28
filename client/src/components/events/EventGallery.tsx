import { cn } from "@/lib/utils";

/** Video entries are recognised by their file extension — the storage layer
 *  only issues .mp4/.webm keys for direct video uploads (Task 16). */
function isVideoRef(src: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(src.trim());
}

interface EventGalleryProps {
  /** Ordered media URLs from the event data (images and video clips). */
  images: string[];
  /** Used to build meaningful alt text per image. */
  eventTitle: string;
  className?: string;
}

/**
 * EventGallery — responsive gallery for the event detail page.
 *
 * Mobile: simple two-column grid. Desktop (3-col): the first item becomes a
 * large 2×2 visual with the smaller shots tiling beside and below it.
 * Entries arrive as plain URL strings in event data, so Cloudflare R2 URLs
 * drop in later without touching this component. Since Task 16 an entry can
 * also be a video clip — those render an inline playable <video> with a
 * clip badge instead of an <img>.
 */
export function EventGallery({ images, eventTitle, className }: EventGalleryProps) {
  if (images.length === 0) return null;

  return (
    <ul
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}
      aria-label={`Photos and videos from ${eventTitle}`}
    >
      {images.map((src, index) => {
        const isHero = index === 0;
        /* Fill the final full-width row when the count leaves one orphan tile. */
        const isWideLast = index === images.length - 1 && images.length % 3 === 1;
        const video = isVideoRef(src);

        return (
          <li
            key={src}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-line bg-navy-950",
              isHero && "col-span-2 row-span-2",
              isWideLast && !isHero && "col-span-2 md:col-span-3",
            )}
          >
            {video ? (
              <>
                <video
                  src={src}
                  controls
                  playsInline
                  preload="metadata"
                  className={cn(
                    "h-full w-full object-contain transition-transform duration-500",
                    isHero ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0" : "aspect-[4/3]",
                  )}
                  aria-label={`${eventTitle} — event video ${index + 1} of ${images.length}`}
                />
                <span className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-navy-950/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
                  <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Video
                </span>
              </>
            ) : (
              <img
                src={src}
                alt={`${eventTitle} — event photo ${index + 1} of ${images.length} (placeholder artwork)`}
                width={isHero ? 1200 : 800}
                height={isHero ? 900 : 600}
                loading="lazy"
                decoding="async"
                className={cn(
                  "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                  isHero ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0" : "aspect-[4/3]",
                )}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

import { cn } from "@/lib/utils";

interface EventGalleryProps {
  /** Ordered image URLs from the event data (local placeholders now, R2 later). */
  images: string[];
  /** Used to build meaningful alt text per image. */
  eventTitle: string;
  className?: string;
}

/**
 * EventGallery — responsive gallery for the event detail page.
 *
 * Mobile: simple two-column grid. Desktop (3-col): the first image becomes a
 * large 2×2 visual with the smaller shots tiling beside and below it.
 * Images arrive as plain URL strings in event data, so Cloudflare R2 URLs
 * drop in later without touching this component.
 */
export function EventGallery({ images, eventTitle, className }: EventGalleryProps) {
  if (images.length === 0) return null;

  return (
    <ul
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}
      aria-label={`Photos from ${eventTitle}`}
    >
      {images.map((src, index) => {
        const isHero = index === 0;
        /* Fill the final full-width row when the count leaves one orphan tile. */
        const isWideLast = index === images.length - 1 && images.length % 3 === 1;

        return (
          <li
            key={src}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-line bg-navy-950",
              isHero && "col-span-2 row-span-2",
              isWideLast && !isHero && "col-span-2 md:col-span-3",
            )}
          >
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
          </li>
        );
      })}
    </ul>
  );
}

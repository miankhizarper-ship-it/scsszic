import { Expand } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/types";

interface PhotoGridProps {
  photos: GalleryPhoto[];
  /** Called with the photo's index when a tile is activated. */
  onOpen: (index: number) => void;
  className?: string;
}

/**
 * PhotoGrid — the interactive photo mosaic for album detail pages.
 *
 * Mobile: a simple, clean two-column grid. Desktop (3-col): the first photo
 * becomes a large 2×2 anchor and the remaining shots tile around it — an
 * editorial mosaic, not a uniform wall. The final full-width row is filled
 * when the count leaves one orphan tile (same rule as EventGallery).
 *
 * Every tile is a real <button> (keyboard reachable, aria-labelled), with
 * alt text carried from the photo data. The zoom affordance icon is always
 * rendered — the grid never relies on hover alone.
 */
export function PhotoGrid({ photos, onOpen, className }: PhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <ul
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}
      aria-label="Album photos"
    >
      {photos.map((photo, index) => {
        const isHero = index === 0 && photos.length > 2;
        /* Fill the final full-width row when the count leaves one orphan tile. */
        const isWideLast =
          index === photos.length - 1 && photos.length % 3 === 1 && !isHero;

        return (
          <li
            key={photo.id}
            className={cn(
              "group relative",
              isHero && "col-span-2 row-span-2",
              isWideLast && "col-span-2 md:col-span-3",
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={`Open photo ${index + 1} of ${photos.length}${
                photo.caption ? `: ${photo.caption}` : ""
              }`}
              className={cn(
                /* h-full lets the hero tile's button (and its absolutely
                   positioned image) fill the stretched 2×2 grid area. */
                "group/btn relative block h-full w-full overflow-hidden rounded-xl border border-line bg-navy-950",
                "transition-shadow duration-300 hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              )}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                width={isHero ? 1200 : 800}
                height={isHero ? 900 : 600}
                loading="lazy"
                decoding="async"
                className={cn(
                  "h-full w-full object-cover transition-transform duration-500 group-hover/btn:scale-[1.04]",
                  isHero
                    ? "aspect-[16/9] md:aspect-auto md:absolute md:inset-0"
                    : "aspect-[4/3]",
                )}
              />

              {/* Expand affordance — always visible (not hover-only) */}
              <span
                aria-hidden="true"
                className="absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full border border-white/15 bg-navy-950/70 text-white backdrop-blur-sm transition-colors duration-200 group-hover/btn:border-gold-400/60 group-hover/btn:text-gold-300"
              >
                <Expand size={14} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

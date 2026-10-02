import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Minimal item shape for the preview mosaic — a flattened view of gallery
 * album photos (see sections/GalleryPreview.tsx). Plain `src` URLs keep the
 * component R2-ready without depending on the full album model.
 */
export interface GalleryGridItem {
  id: string;
  title: string;
  category: string;
  src: string;
  alt: string;
  /** Task 36 — video tile: poster in `src`, playable source in one of these. */
  videoUrl?: string;
  embedUrl?: string;
}

interface GalleryGridProps {
  items: GalleryGridItem[];
  /**
   * "preview" → editorial mosaic (first item 2×2) for the Home page.
   * "full"    → uniform grid for compact listings.
   */
  variant?: "preview" | "full";
  className?: string;
}

/**
 * GalleryGrid — responsive image grid (Home preview mosaic).
 *
 * Each item is a plain object with `src`, so swapping local artwork for
 * Cloudflare R2 URLs in a later phase is a data change, not a component
 * change.
 */
export function GalleryGrid({ items, variant = "preview", className }: GalleryGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4",
        variant === "preview"
          ? "auto-rows-[120px] min-[420px]:auto-rows-[140px] md:auto-rows-[150px] md:grid-cols-4"
          : "auto-rows-[160px] sm:auto-rows-[180px] md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item, index) => {
        const isVideo = Boolean(item.videoUrl || item.embedUrl);
        return (
          <figure
            key={item.id}
            className={cn(
              "group relative h-full overflow-hidden rounded-xl",
              variant === "preview" && index === 0 && "col-span-2 row-span-2",
            )}
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Video badge — always visible, marks playable clips */}
            {isVideo && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-gold-400/50 bg-navy-950/80 text-gold-300 backdrop-blur-sm"
              >
                <Play size={12} className="ml-0.5" />
              </span>
            )}
            {/* Hover caption overlay */}
            <figcaption
              aria-hidden="true"
              className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-300">
                  {item.category}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">{item.title}</p>
              </div>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

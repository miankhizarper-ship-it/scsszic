import { Link } from "react-router-dom";
import { ArrowRight, Camera, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { formatCardDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GalleryAlbum } from "@/types";

interface AlbumCardProps {
  album: GalleryAlbum;
  className?: string;
}

/**
 * AlbumCard — the image-led card for the /gallery grid.
 *
 * A photo archive card leads with the image: large cover, category badge,
 * and a hover overlay with a "View Album" affordance. Meta (date, photo
 * count, optional location) sits in a quiet row beneath. Interaction stays
 * restrained — subtle zoom + overlay fade, never bouncing or glowing.
 */
export function AlbumCard({ album, className }: AlbumCardProps) {
  const detailHref = ROUTES.albumDetail(album.slug);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* Cover — the lead element */}
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-950">
        <img
          src={album.coverImage}
          alt={album.coverImageAlt}
          width={1200}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <Badge variant="solidGold" className="absolute left-4 top-4 shadow-sm">
          {album.category}
        </Badge>

        {/* Photo count chip — always visible (never hover-only info) */}
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-navy-950/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Camera size={12} aria-hidden="true" className="text-gold-300" />
          {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
        </span>

        {/* Hover overlay + arrow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
            View Album
            <ArrowRight
              size={16}
              className="text-gold-300 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-navy-900">
          <Link
            to={detailHref}
            className="rounded-sm transition-colors group-hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            {album.title}
          </Link>
        </h3>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
          {album.description}
        </p>

        <div className="mt-auto pt-4">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <time dateTime={album.date}>{formatCardDate(album.date)}</time>
            {album.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={12} aria-hidden="true" className="shrink-0 text-gold-600" />
                <span className="truncate">{album.location}</span>
              </span>
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

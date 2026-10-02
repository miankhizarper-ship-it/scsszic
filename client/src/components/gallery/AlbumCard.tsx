import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Camera, Clapperboard, MapPin } from "lucide-react";

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
 *
 * The ENTIRE cover is a real link (the hover overlay is decoration — it
 * never swallows clicks), and the meta row repeats the affordance as text
 * so touch users get an explicit target too.
 */
export function AlbumCard({ album, className }: AlbumCardProps) {
  const detailHref = ROUTES.albumDetail(album.slug);
  const videoCount = album.videoCount ?? album.videos?.length ?? 0;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* Cover — the lead element, fully clickable */}
      <Link
        to={detailHref}
        aria-label={`View album: ${album.title}`}
        className="relative block aspect-[4/3] overflow-hidden bg-navy-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
      >
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

        {/* Media count chips — always visible (never hover-only info) */}
        {album.photoCount > 0 && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-navy-950/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Camera size={12} aria-hidden="true" className="text-gold-300" />
            {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
          </span>
        )}
        {videoCount > 0 && (
          <span
            className={cn(
              "absolute top-4 inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-navy-950/80 px-2.5 py-1 text-[11px] font-semibold text-gold-200 backdrop-blur-sm",
              album.photoCount > 0 ? "right-4 top-12" : "right-4 top-4",
            )}
          >
            <Clapperboard size={12} aria-hidden="true" className="text-gold-300" />
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </span>
        )}

        {/* Hover overlay + arrow — decorative (pointer-events never block
            the link that wraps it) */}
        <span
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
        </span>
      </Link>

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
            {album.eventSlug && (
              <Link
                to={ROUTES.eventDetail(album.eventSlug)}
                className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-navy-50 px-1.5 py-0.5 font-medium text-navy-800 transition-colors hover:border-gold-500/60 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                aria-label="This album documents an event — view the event"
              >
                <CalendarDays size={12} aria-hidden="true" className="shrink-0 text-gold-600" />
                Event
              </Link>
            )}
            <Link
              to={detailHref}
              className="ml-auto inline-flex items-center gap-1 rounded-md font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              View Album
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>
    </article>
  );
}

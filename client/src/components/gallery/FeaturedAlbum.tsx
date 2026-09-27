import { ArrowRight, Camera, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { formatDateLong } from "@/lib/format";
import type { GalleryAlbum } from "@/types";

interface FeaturedAlbumProps {
  /** Selected once at page level via getFeaturedAlbum() — logic stays out of the component. */
  album: GalleryAlbum;
}

/**
 * FeaturedAlbum — the large editorial feature on /gallery.
 *
 * Desktop: two-column cover + copy. Mobile: stacks naturally. Follows the
 * FeaturedBlog structure (same family, same rhythm) but lets the imagery
 * lead: a taller, full-bleed cover with the photo count worn proudly.
 */
export function FeaturedAlbum({ album }: FeaturedAlbumProps) {
  const detailHref = ROUTES.albumDetail(album.slug);

  return (
    <section aria-labelledby="featured-album-heading" className="bg-surface pb-4 pt-14 lg:pb-6 lg:pt-16">
      <Container>
        <Reveal>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
            Featured album
          </p>

          <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* Cover */}
            <Link
              to={detailHref}
              aria-label={`Open album: ${album.title}`}
              className="group relative block min-w-0 overflow-hidden rounded-2xl border border-line shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <img
                src={album.coverImage}
                alt={album.coverImageAlt}
                width={1200}
                height={900}
                loading="eager"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/35 via-transparent to-transparent"
              />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-navy-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Camera size={13} aria-hidden="true" className="text-gold-300" />
                {album.photoCount} photos in this album
              </span>
            </Link>

            {/* Copy */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="solidGold">{album.category}</Badge>
                {album.eventSlug && (
                  <Badge variant="navySoft">Event album</Badge>
                )}
              </div>

              <h2
                id="featured-album-heading"
                className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-navy-900 text-balance sm:text-3xl lg:text-[2.1rem]"
              >
                <Link
                  to={detailHref}
                  className="rounded-sm transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  {album.title}
                </Link>
              </h2>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
                {album.description}
              </p>

              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-gold-500"
                  />
                  <time dateTime={album.date}>{formatDateLong(album.date)}</time>
                </span>
                {album.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} aria-hidden="true" className="text-gold-600" />
                    {album.location}
                  </span>
                )}
              </p>

              <div className="mt-7">
                <Link
                  to={detailHref}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy-900 px-5 font-display text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  View Album
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

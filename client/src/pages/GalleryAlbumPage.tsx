import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  MapPin,
  SearchX,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { RelatedAlbums } from "@/components/gallery/RelatedAlbums";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useAlbum, useEvent, useRelatedAlbums } from "@/hooks/content";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * GalleryAlbumPage — the album experience (/gallery/:albumSlug).
 *
 * Order: Breadcrumb (Gallery → Album) → Album header (category, title,
 * description, date, location, photo count, event link) → Photo mosaic →
 * Lightbox → Related albums → CTA (spec §9–11).
 *
 * The lightbox index is the single piece of page state: open with a photo
 * index, navigate inside, close back to the grid (focus is restored to the
 * invoking tile by the Lightbox itself).
 *
 * Phase 8: the lookup runs against GET /api/gallery/:albumSlug — archived
 * albums and unknown slugs resolve to the same Not Found state (spec §13).
 */
export default function GalleryAlbumPage() {
  const { albumSlug } = useParams<{ albumSlug: string }>();

  // Hooks stay unconditional; early returns come after them.
  const albumQuery = useAlbum(albumSlug);
  const album = albumQuery.data;
  const linkedEventQuery = useEvent(album ? album.eventSlug : undefined);
  const linkedEvent = linkedEventQuery.data;
  const relatedQuery = useRelatedAlbums(album ? album.slug : undefined);
  const related = relatedQuery.data ?? [];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  usePageMetadata({
    title: album
      ? `${album.title} | Society of Computer Science`
      : "Album Not Found | Society of Computer Science",
    description: album
      ? album.description
      : "Photo albums from the Society of Computer Science community at SZIC.",
  });

  if (albumQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading album…"
      />
    );
  }

  if (albumQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this album right now"
            description="The album is temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void albumQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Album Not Found"
            description="This album doesn't exist or may have been archived. Browse the gallery for the albums that are currently published."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.gallery} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Gallery
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Album header ---------- */}
      <section aria-labelledby="album-heading" className="bg-surface">
        <div aria-hidden="true" className="gold-hairline h-px w-full" />

        <Container className="py-10 sm:py-12 lg:py-14">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li>
                <Link
                  to={ROUTES.gallery}
                  className="font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Gallery
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted">
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="truncate text-muted">
                {album.title}
              </li>
            </ol>
          </nav>

          <Reveal className="mt-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="solidGold">{album.category}</Badge>
              {linkedEvent && <Badge variant="navySoft">Event album</Badge>}
            </div>

            <h1
              id="album-heading"
              className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-navy-900 text-balance sm:text-4xl lg:text-[2.6rem]"
            >
              {album.title}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              {album.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" className="text-gold-600" />
                <time dateTime={album.date}>{formatDateLong(album.date)}</time>
              </span>
              {album.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden="true" className="text-gold-600" />
                  {album.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Camera size={14} aria-hidden="true" className="text-gold-600" />
                {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
              </span>
              {linkedEvent && (
                <Link
                  to={ROUTES.eventDetail(linkedEvent.slug)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  From the event: {linkedEvent.title}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              )}
            </div>
          </Reveal>
        </Container>

        {/* Photo mosaic */}
        <Container className="pb-16 lg:pb-20">
          <Reveal delay={0.08}>
            <PhotoGrid
              photos={album.photos}
              onOpen={setLightboxIndex}
            />
          </Reveal>
        </Container>
      </section>

      {/* ---------- Related albums ---------- */}
      <RelatedAlbums albums={related} />

      {/* ---------- CTA ---------- */}
      <CTASection
        id="album-cta"
        eyebrow="Keep Exploring"
        title="Be in the next album"
        description="The people in these photos met through the Society of Computer Science — at workshops, contests, and ceremonies worth remembering. Join the community and make the archive yourself."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Browse All Albums", to: ROUTES.gallery }}
      />

      {/* ---------- Lightbox (outside the page flow) ---------- */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={album.photos}
          index={Math.min(lightboxIndex, album.photos.length - 1)}
          albumTitle={album.title}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

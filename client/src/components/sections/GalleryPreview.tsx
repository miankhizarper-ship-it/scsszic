import { useMemo } from "react";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  GalleryGrid,
  type GalleryGridItem,
} from "@/components/media/GalleryGrid";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useAlbums } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * GalleryPreview — editorial mosaic of the latest society moments.
 * Flattened from the gallery API (newest albums first) via one server-side
 * listing request — the first eight media tiles across the most recent
 * albums (photos, plus Task 36's playable event-video tiles); the mosaic
 * grid wraps into extra rows as the archive grows.
 */
export function GalleryPreview() {
  const albumsQuery = useAlbums();
  const albums = useMemo(() => albumsQuery.data?.data ?? [], [albumsQuery.data]);

  const previewItems = useMemo<GalleryGridItem[]>(() => {
    const items: GalleryGridItem[] = [];
    for (const album of albums) {
      for (const photo of album.photos) {
        if (items.length >= 8) break;
        items.push({
          id: photo.id,
          title: album.title,
          category: album.category,
          src: photo.src,
          alt: photo.alt,
        });
      }
      for (const video of album.videos ?? []) {
        if (items.length >= 8) break;
        items.push({
          id: video.id,
          title: album.title,
          category: album.category,
          src: video.src,
          alt: video.alt,
          ...(video.videoUrl ? { videoUrl: video.videoUrl } : {}),
          ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
        });
      }
      if (items.length >= 8) break;
    }
    return items;
  }, [albums]);

  return (
    <section aria-labelledby="gallery-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="gallery-heading"
          label="Gallery"
          title="Moments from our society"
          description="Hackathons, labs, ceremonies, and everything in between — captured by the community."
          action={{ label: "View full gallery", to: ROUTES.gallery }}
        />

        {albumsQuery.isPending && (
          <CollectionLoading rows={3} className="mt-12" label="Loading gallery…" />
        )}

        {albumsQuery.isError && (
          <ErrorState
            title="The gallery couldn't load"
            description="Photo albums are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void albumsQuery.refetch()}
            className="mt-12 border-solid"
          />
        )}

        {!albumsQuery.isPending && !albumsQuery.isError && previewItems.length > 0 && (
          <Reveal className="mt-12">
            <GalleryGrid items={previewItems} variant="preview" />
          </Reveal>
        )}
      </Container>
    </section>
  );
}

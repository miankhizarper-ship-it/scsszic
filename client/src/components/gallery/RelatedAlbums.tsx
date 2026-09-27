import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AlbumCard } from "@/components/gallery/AlbumCard";
import { ROUTES } from "@/routes/paths";
import type { GalleryAlbum } from "@/types";

interface RelatedAlbumsProps {
  /** Pre-selected via getRelatedAlbums() — selection logic stays out of the component. */
  albums: GalleryAlbum[];
  className?: string;
}

/**
 * RelatedAlbums — the related-content band on album detail pages.
 *
 * Renders the pre-selected albums only (same pattern as RelatedBlogs and
 * RelatedEvents); selection lives in lib/gallerySearch. Hidden entirely
 * when there is nothing to show.
 */
export function RelatedAlbums({ albums, className }: RelatedAlbumsProps) {
  if (albums.length === 0) return null;

  return (
    <section
      aria-labelledby="related-albums-heading"
      className={className ?? "bg-surface py-16 lg:py-20"}
    >
      <Container>
        <SectionHeading
          id="related-albums-heading"
          align="left"
          label="Related Albums"
          title="More moments from the community"
          description="Albums captured around the same events, categories, and seasons."
          action={{ label: "Browse all albums", to: ROUTES.gallery }}
        />

        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {albums.map((album, index) => (
            <Reveal key={album.id} delay={(index % 3) * 0.06} className="h-full">
              <li className="h-full">
                <AlbumCard album={album} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

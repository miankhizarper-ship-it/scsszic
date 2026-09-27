import { useMemo, useState } from "react";
import { Images, SearchX, Sparkles } from "lucide-react";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AlbumCard } from "@/components/gallery/AlbumCard";
import { FeaturedAlbum } from "@/components/gallery/FeaturedAlbum";
import { GalleryFilters, type GalleryFilterGroupId } from "@/components/gallery/GalleryFilters";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useAlbums, useCategories, useFeaturedAlbum } from "@/hooks/content";
import { GALLERY_CATEGORIES } from "@/data/gallery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * GalleryPage — the public photo archive (/gallery).
 *
 * Order: Hero → Featured Album → Search + Filters → Album Grid →
 * Empty State → CTA (spec §7).
 *
 * Phase 8: search/category/year filtering runs SERVER-side against
 * GET /api/gallery (facets in meta); archived albums never leave the
 * database. The featured album renders in its own block above the grid,
 * so the grid excludes it by id to avoid duplication — the "Showing N
 * albums" count stays the true filter result count.
 */
export default function GalleryPage() {
  usePageMetadata({
    title: buildPageTitle("Gallery"),
    description:
      "Explore photo albums from SCS events, workshops, competitions, ceremonies, and everyday community moments at SZIC.",
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, category, year }),
    [debouncedQuery, category, year],
  );

  const albumsQuery = useAlbums(filters);
  // Admin-managed category vocabulary (falls back to the curated constants).
  const categoriesQuery = useCategories("gallery", GALLERY_CATEGORIES);
  const categories = categoriesQuery.data ?? GALLERY_CATEGORIES;
  const filtered = useMemo(() => albumsQuery.data?.data ?? [], [albumsQuery.data]);
  const facets = albumsQuery.data?.meta.facets;
  const total = facets?.total ?? 0;
  const galleryYears = ((facets?.years ?? []) as Array<{ value?: string }> )
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const photoFacet = ((facets?.photos ?? []) as Array<{ n?: number }>)[0];
  const totalPhotos = photoFacet?.n ?? 0;

  const featuredAlbumQuery = useFeaturedAlbum();
  const featuredAlbum = featuredAlbumQuery.data;

  /* The feature block already displays the featured album. */
  const gridAlbums = useMemo(
    () => filtered.filter((album) => album.id !== featuredAlbum?.id),
    [filtered, featuredAlbum],
  );

  const hasActiveFilters = query.trim() !== "" || category !== "" || year !== "";

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setYear("");
  };

  const handleFilterChange = (group: GalleryFilterGroupId, value: string) => {
    /* Toggle semantics: clicking the active chip deselects it (matches the
       events, alumni, and blog directories); "" (the All chip) resets. */
    const setter = group === "category" ? setCategory : setYear;
    setter((prev) => (prev === value ? "" : value));
  };

  return (
    <>
      <PageHero
        id="gallery-heading"
        eyebrow="Gallery"
        title={
          <>
            Moments that define{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              our community.
            </span>
          </>
        }
        description="Explore photo albums from SCS events, workshops, competitions, celebrations, and the behind-the-scenes moments in between — captured by the community, for the community."
      >
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { value: `${total}`, label: "Albums" },
            { value: `${totalPhotos}`, label: "Photos" },
            { value: `${galleryYears.length}`, label: "Years" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm"
            >
              <dt className="order-2 mt-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {label}
              </dt>
              <dd className="order-1 font-display text-2xl font-bold text-gold-300">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      {/* ---------- Featured album ---------- */}
      {featuredAlbum && <FeaturedAlbum album={featuredAlbum} />}

      {/* ---------- Search + filters ---------- */}
      <section aria-label="Search and filter albums" className="bg-surface py-12 lg:py-14">
        <GalleryFilters
          query={query}
          onQueryChange={setQuery}
          values={{ category, year }}
          onFilterChange={handleFilterChange}
          years={galleryYears}
          onClear={clearFilters}
          categories={categories}
        >
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {albumsQuery.isPending
              ? "Loading albums…"
              : albumsQuery.isError
                ? "The archive is temporarily unavailable."
                : (
                    <>
                      Showing{" "}
                      <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
                      {filtered.length === 1 ? "album" : "albums"}
                      {hasActiveFilters ? " matching your filters" : ""}.
                    </>
                  )}
          </p>
        </GalleryFilters>
      </section>

      {albumsQuery.isPending && (
        <section aria-label="Loading albums" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <CollectionLoading rows={6} label="Loading albums…" />
          </Container>
        </section>
      )}

      {albumsQuery.isError && (
        <section aria-label="Albums failed to load" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <ErrorState
              title="The gallery couldn't load"
              description="Photo albums are temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void albumsQuery.refetch()}
              className="mx-auto max-w-xl border-solid"
            />
          </Container>
        </section>
      )}

      {!albumsQuery.isPending && !albumsQuery.isError && filtered.length === 0 && (
        /* ---------- Empty state ---------- */
        <section aria-label="No albums found" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <EmptyState
              icon={SearchX}
              title="No albums match those filters"
              description="Try a different search term, or clear the category and year filters to browse the whole archive."
              className="mx-auto max-w-xl border-solid"
            >
              <Button variant="navy" onClick={clearFilters}>
                <Sparkles size={16} aria-hidden="true" />
                Clear search & filters
              </Button>
            </EmptyState>
          </Container>
        </section>
      )}

      {!albumsQuery.isPending && !albumsQuery.isError && gridAlbums.length > 0 && (
          /* ---------- Album grid ---------- */
          <section
            aria-labelledby="album-grid-heading"
            className="bg-surface pb-20 lg:pb-24"
          >
            <Container>
              <SectionHeading
                id="album-grid-heading"
                align="left"
                label="All Albums"
                title="Browse the archive"
                description="Open any album to view its photos full-size — newest captures first."
              />

              <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {gridAlbums.map((album, index) => (
                  <Reveal key={album.id} delay={(index % 3) * 0.06} className="h-full">
                    <li className="h-full">
                      <AlbumCard album={album} className="h-full" />
                    </li>
                  </Reveal>
                ))}
              </ul>
            </Container>
          </section>
      )}

      {/* ---------- CTA ---------- */}
      <CTASection
        id="gallery-cta"
        eyebrow="Make the Next Memory"
        title="The best moments are the ones you're in."
        description="Every album in this archive started with members showing up — to build, compete, learn, and celebrate together. Join the society and be in the next frame."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Explore Upcoming Events", to: ROUTES.events }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <Images size={13} aria-hidden="true" />
            Albums shown here are fictional demo content with placeholder artwork.
          </span>
        }
      />
    </>
  );
}

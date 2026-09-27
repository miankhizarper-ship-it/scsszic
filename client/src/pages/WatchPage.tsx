import { useMemo, useState } from "react";
import { MonitorPlay, SearchX, Sparkles } from "lucide-react";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { VideoCard } from "@/components/watch/VideoCard";
import { FeaturedVideo } from "@/components/watch/FeaturedVideo";
import { VideoFilters, type VideoFilterGroupId } from "@/components/watch/VideoFilters";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useFeaturedVideo, useVideos } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * WatchPage — the educational media hub (/watch).
 *
 * Order: Hero → Featured Video → Search + Filters → Video Grid →
 * Empty State → CTA (spec §17).
 *
 * Watch is deliberately distinct from Gallery: Gallery is the visual
 * archive (image-led); Watch is the media hub (content-led). Same brand
 * system, different center of gravity.
 *
 * Phase 8: search/category/duration filtering runs SERVER-side against
 * GET /api/watch (facets in meta — total runtime and event-linked counts
 * come from the server too); archived videos never leave the database.
 */
export default function WatchPage() {
  usePageMetadata({
    title: buildPageTitle("Watch"),
    description:
      "Watch recorded talks, workshops, project showcases, and event highlights from the Society of Computer Science — learn, build, and discover.",
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, category, duration }),
    [debouncedQuery, category, duration],
  );

  const videosQuery = useVideos(filters);
  const filtered = useMemo(() => videosQuery.data?.data ?? [], [videosQuery.data]);
  const facets = videosQuery.data?.meta.facets;
  const total = facets?.total ?? 0;
  const minutesFacet = ((facets?.minutes ?? []) as Array<{ n?: number }>)[0];
  const totalHours = Math.max(1, Math.round((minutesFacet?.n ?? 0) / 60));
  const eventLinkedFacet = ((facets?.eventLinked ?? []) as Array<{ n?: number }>)[0];
  const eventLinkedCount = eventLinkedFacet?.n ?? 0;

  const featuredVideoQuery = useFeaturedVideo();
  const featuredVideo = featuredVideoQuery.data;

  /* The feature block already displays the featured video. */
  const gridVideos = useMemo(
    () => filtered.filter((video) => video.id !== featuredVideo?.id),
    [filtered, featuredVideo],
  );

  const hasActiveFilters = query.trim() !== "" || category !== "" || duration !== "";

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setDuration("");
  };

  const handleFilterChange = (group: VideoFilterGroupId, value: string) => {
    /* Toggle semantics: clicking the active chip deselects it (matches the
       events, alumni, blog, and gallery directories). */
    const setter = group === "category" ? setCategory : setDuration;
    setter((prev) => (prev === value ? "" : value));
  };

  return (
    <>
      <PageHero
        id="watch-heading"
        eyebrow="Watch"
        title={
          <>
            Learn. Build.{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              Watch.
            </span>
          </>
        }
        description="Recorded talks, technical sessions, workshops, project showcases, and event highlights — the society's media hub for learning and discovering, one session at a time."
      >
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { value: `${total}`, label: "Videos" },
            { value: `${totalHours}+`, label: "Hours" },
            { value: `${eventLinkedCount}`, label: "From Events" },
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

      {/* ---------- Featured video ---------- */}
      {featuredVideo && <FeaturedVideo video={featuredVideo} />}

      {/* ---------- Search + filters ---------- */}
      <section aria-label="Search and filter videos" className="bg-surface py-12 lg:py-14">
        <VideoFilters
          query={query}
          onQueryChange={setQuery}
          values={{ category, duration }}
          onFilterChange={handleFilterChange}
          onClear={clearFilters}
        >
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {videosQuery.isPending
              ? "Loading videos…"
              : videosQuery.isError
                ? "Videos are temporarily unavailable."
                : (
                    <>
                      Showing{" "}
                      <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
                      {filtered.length === 1 ? "video" : "videos"}
                      {hasActiveFilters ? " matching your filters" : ""}.
                    </>
                  )}
          </p>
        </VideoFilters>
      </section>

      {videosQuery.isPending && (
        <section aria-label="Loading videos" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <CollectionLoading rows={6} label="Loading videos…" />
          </Container>
        </section>
      )}

      {videosQuery.isError && (
        <section aria-label="Videos failed to load" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <ErrorState
              title="Videos couldn't load"
              description="The media hub is temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void videosQuery.refetch()}
              className="mx-auto max-w-xl border-solid"
            />
          </Container>
        </section>
      )}

      {!videosQuery.isPending && !videosQuery.isError && filtered.length === 0 && (
        /* ---------- Empty state ---------- */
        <section aria-label="No videos found" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <EmptyState
              icon={SearchX}
              title="No videos match those filters"
              description="Try a different search term, or clear the category and length filters to browse every session in the media hub."
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

      {!videosQuery.isPending && !videosQuery.isError && gridVideos.length > 0 && (
        /* ---------- Video grid ---------- */
        <section
          aria-labelledby="video-grid-heading"
          className="bg-surface pb-20 lg:pb-24"
        >
          <Container>
            <SectionHeading
              id="video-grid-heading"
              align="left"
              label="All Videos"
              title="The session archive"
              description="Talks, tutorials, panels, and highlight reels — newest releases first."
            />

            <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {gridVideos.map((video, index) => (
                <Reveal key={video.id} delay={(index % 3) * 0.06} className="h-full">
                  <li className="h-full">
                    <VideoCard video={video} className="h-full" />
                  </li>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <CTASection
        id="watch-cta"
        eyebrow="Go Beyond Watching"
        title="Live sessions beat recordings."
        description="The videos here came out of real rooms full of curious students. Join the Society of Computer Science to attend the next workshop, ask your own questions, and build alongside the community."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "See Upcoming Events", to: ROUTES.events }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <MonitorPlay size={13} aria-hidden="true" />
            Videos shown here are fictional demo entries with placeholder media.
          </span>
        }
      />
    </>
  );
}

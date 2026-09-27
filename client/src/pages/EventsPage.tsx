import { useMemo, useState } from "react";
import { CalendarX, SearchX, Sparkles } from "lucide-react";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/media/EventCard";
import { FeaturedEvent } from "@/components/events/FeaturedEvent";
import { EventFilters, type EventFilterGroupId } from "@/components/events/EventFilters";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useCategories, useEvents, useFeaturedEvent } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getCompletedEvents, getUpcomingEvents } from "@/lib/eventSearch";
import { EVENT_CATEGORIES } from "@/data/events";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * EventsPage — the public events experience (/events).
 *
 * Order: Hero → Featured Event → Search + Filters → Upcoming Events →
 * Completed & Past Events → Empty State → CTA (spec §3).
 *
 * Phase 8: search/category/status/date filtering runs SERVER-side against
 * GET /api/events (facets in meta); the upcoming/past split below is pure
 * presentation over the already-fetched page (lib/eventSearch helpers).
 */
export default function EventsPage() {
  usePageMetadata({
    title: buildPageTitle("Events"),
    description:
      "Explore workshops, talks, hackathons, competitions, and technology events organized by the Society of Computer Science.",
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, category, status, date }),
    [debouncedQuery, category, status, date],
  );

  const eventsQuery = useEvents(filters);
  // Admin-managed category vocabulary (falls back to the curated constants).
  const categoriesQuery = useCategories("events", EVENT_CATEGORIES);
  const categories = categoriesQuery.data ?? EVENT_CATEGORIES;
  const filtered = useMemo(() => eventsQuery.data?.data ?? [], [eventsQuery.data]);
  const facets = eventsQuery.data?.meta.facets;
  const total = facets?.total ?? 0;

  const upcoming = useMemo(() => getUpcomingEvents(filtered), [filtered]);
  const past = useMemo(() => getCompletedEvents(filtered), [filtered]);

  const featuredQuery = useFeaturedEvent();
  const featuredEvent = featuredQuery.data;

  const statusFacets = ((facets?.statuses ?? []) as Array<{ value?: string; n?: number }>).filter(
    (entry) => entry.value === "upcoming" || entry.value === "ongoing",
  );
  const upcomingCount = statusFacets.reduce((sum, entry) => sum + (entry.n ?? 0), 0);
  const categoryCount = ((facets?.categories ?? []) as Array<{ value?: string }>).length;

  const hasActiveFilters =
    query.trim() !== "" || category !== "" || status !== "" || date !== "";

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setStatus("");
    setDate("");
  };

  const handleFilterChange = (group: EventFilterGroupId, value: string) => {
    /* Toggle semantics: clicking the active chip deselects it (matches the
       alumni directory behaviour); "" (the All chip) always resets the group. */
    const setter =
      group === "category" ? setCategory : group === "status" ? setStatus : setDate;
    setter((prev) => (prev === value ? "" : value));
  };

  return (
    <>
      <PageHero
        id="events-heading"
        eyebrow="Events"
        title={
          <>
            Learn. Build.{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              Connect.
            </span>
          </>
        }
        description="Discover workshops, talks, competitions, hackathons, and community experiences organized by the Society of Computer Science."
      >
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { value: `${upcomingCount}`, label: "Upcoming & live" },
            { value: `${total}`, label: "Total events" },
            { value: `${categoryCount}`, label: "Categories" },
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

      {/* ---------- Featured event ---------- */}
      {featuredEvent && <FeaturedEvent event={featuredEvent} />}

      {/* ---------- Search + filters ---------- */}
      <section aria-label="Search and filter events" className="bg-surface py-12 lg:py-14">
        <EventFilters
          query={query}
          onQueryChange={setQuery}
          values={{ category, status, date }}
          onFilterChange={handleFilterChange}
          onClear={clearFilters}
          categories={categories}
        >
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {eventsQuery.isPending
              ? "Loading events…"
              : eventsQuery.isError
                ? "Events are temporarily unavailable."
                : (
                    <>
                      Showing{" "}
                      <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
                      {filtered.length === 1 ? "event" : "events"}
                      {hasActiveFilters ? " matching your filters" : ""}.
                    </>
                  )}
          </p>
        </EventFilters>
      </section>

      {eventsQuery.isPending && (
        <section aria-label="Loading events" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <CollectionLoading rows={6} label="Loading events…" />
          </Container>
        </section>
      )}

      {eventsQuery.isError && (
        <section aria-label="Events failed to load" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <ErrorState
              title="Events couldn't load"
              description="The events calendar is temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void eventsQuery.refetch()}
              className="mx-auto max-w-xl border-solid"
            />
          </Container>
        </section>
      )}

      {!eventsQuery.isPending && !eventsQuery.isError && filtered.length === 0 && (
        /* ---------- Global empty state ---------- */
        <section aria-label="No events found" className="bg-surface pb-20 lg:pb-24">
          <Container>
            <EmptyState
              icon={SearchX}
              title="No events match those filters"
              description="Try a different search term, or clear the category, status, and date filters to browse everything the society has planned."
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

      {!eventsQuery.isPending && !eventsQuery.isError && filtered.length > 0 && (
        <>
          {/* ---------- Upcoming & live ---------- */}
          <section
            aria-labelledby="upcoming-events-heading"
            className="bg-surface pb-16 lg:pb-20"
          >
            <Container>
              <SectionHeading
                id="upcoming-events-heading"
                align="left"
                label="Upcoming & Live"
                title="Upcoming events"
                description="Reserve your seat, learn something real, and meet the community — upcoming events are listed chronologically."
              />

              {upcoming.length > 0 ? (
                <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {upcoming.map((event, index) => (
                    <Reveal key={event.id} delay={(index % 3) * 0.06} className="h-full">
                      <li className="h-full">
                        <EventCard event={event} className="h-full" />
                      </li>
                    </Reveal>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="No upcoming events here"
                  description="Nothing on the calendar matches your filters right now — try clearing them, or browse the past events below."
                  className="mt-10"
                />
              )}
            </Container>
          </section>

          {/* ---------- Completed & past ---------- */}
          <section
            aria-labelledby="completed-events-heading"
            className="border-t border-line bg-white py-16 lg:py-20"
          >
            <Container>
              <SectionHeading
                id="completed-events-heading"
                align="left"
                label="Looking Back"
                title="Completed & past events"
                description="A record of the society's recent events — open any event for the full story, schedules, and photo galleries."
              />

              {past.length > 0 ? (
                <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {past.map((event, index) => (
                    <Reveal key={event.id} delay={(index % 3) * 0.06} className="h-full">
                      <li className="h-full">
                        <EventCard event={event} className="h-full" />
                      </li>
                    </Reveal>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="No past events here"
                  description="None of the past events match your filters — try clearing them, or check the upcoming events above."
                  className="mt-10"
                />
              )}
            </Container>
          </section>
        </>
      )}

      {/* ---------- CTA ---------- */}
      <CTASection
        id="events-cta"
        eyebrow="Get Involved"
        title="Never miss an event again"
        description="Join the Society of Computer Science to get early access to workshops, hackathons, and community sessions — and help shape what we host next."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Suggest an Event", to: ROUTES.contact }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} aria-hidden="true" />
            Events shown here are demo content during development.
          </span>
        }
      />
    </>
  );
}

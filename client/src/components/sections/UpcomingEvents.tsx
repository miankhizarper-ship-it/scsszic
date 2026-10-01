import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EventCard } from "@/components/media/EventCard";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useUpcomingEvents } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * UpcomingEvents — soonest live events via the events API.
 * The listing runs server-side (?status=upcoming,ongoing&limit=6) and the
 * responsive grid wraps into extra rows as the calendar fills up, so a busy
 * semester never squeezes cards into a cramped single strip.
 * Loading/error states keep the Home page calm when the API is slow.
 */
export function UpcomingEvents() {
  const eventsQuery = useUpcomingEvents(6);
  const events = eventsQuery.data ?? [];

  return (
    <section aria-labelledby="events-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="events-heading"
          label="Upcoming Events"
          title="What's happening this semester"
          description="Workshops, bootcamps, and competitions — reserve your seat, learn something real, and meet the community."
          action={{ label: "View all events", to: ROUTES.events }}
        />

        {eventsQuery.isPending && (
          <CollectionLoading rows={3} className="mt-12" label="Loading upcoming events…" />
        )}

        {eventsQuery.isError && (
          <ErrorState
            title="Upcoming events couldn't load"
            description="The events calendar is temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void eventsQuery.refetch()}
            className="mt-12 border-solid"
          />
        )}

        {!eventsQuery.isPending && !eventsQuery.isError && events.length === 0 && (
          <p className="mt-12 rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
            Nothing on the calendar right now — check the events page for the full archive.
          </p>
        )}

        {events.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <Reveal key={event.id} delay={index * 0.08} className="h-full">
                <EventCard event={event} className="h-full" />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

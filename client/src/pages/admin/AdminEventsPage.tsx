import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAdminEvents, useDeleteEvent, useUpdateEventStatus } from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { AdminEventSort, SocietyEvent } from "@/types";

/**
 * Admin Events CMS (Phase 9C) — the /admin/events management page over the
 * REAL events collection through GET /api/admin/events (requireAdmin-gated).
 *
 * Everything here is real database data: the table reflects the server-side
 * search/category/status/sort/pagination controls, the facet chips show the
 * live status/category distributions, and mutations (status change, delete)
 * invalidate the list, the dashboard counts, and the public listings.
 *
 * View/preview reuses the existing public detail page (/events/:slug) —
 * there is deliberately no second event rendering system.
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["upcoming", "ongoing", "completed", "cancelled"] as const;

const SORT_OPTIONS: Array<{ value: AdminEventSort; label: string }> = [
  { value: "date_desc", label: "Date — latest first" },
  { value: "date_asc", label: "Date — earliest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
  { value: "created_desc", label: "Newest created" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Actionable states get attention; terminal ones recede. */
function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "upcoming") return { variant: "goldSoft" };
  if (status === "cancelled") {
    return { variant: "navySoft", className: "border-line bg-surface text-muted" };
  }
  return { variant: "navySoft" };
}

/** Real registration state from the model's own registration object. */
function registrationLabel(event: SocietyEvent): string {
  const registration = event.registration;
  if (!registration) return "Not required";
  if (!registration.enabled) return registration.label ?? "Closed";
  return registration.capacity ? `Open · ${registration.capacity} seats` : "Open";
}

interface EventRowProps {
  event: SocietyEvent;
  onDelete: (event: SocietyEvent) => void;
}

/** One management row — desktop table cells. */
function EventRowCells({ event }: { event: SocietyEvent }) {
  const style = statusChipStyle(event.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {event.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">/{event.slug}</p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{event.category}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(event.date)}</span>
        <span className="block truncate text-xs text-muted">
          {event.startTime}
          {event.endTime ? `–${event.endTime}` : ""}
        </span>
      </td>
      <td className="hidden truncate px-4 py-3.5 text-sm text-ink xl:table-cell">{event.location}</td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(event.status)}
        </Badge>
        <span className="mt-1 block truncate text-xs text-muted">{registrationLabel(event)}</span>
      </td>
    </>
  );
}

/** Row action cluster — status select, view, edit, delete. */
function EventRowActions({ event, onDelete }: EventRowProps) {
  const updateStatus = useUpdateEventStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`status-${event.id}`}>
          Change status for {event.title}
        </label>
        <select
          id={`status-${event.id}`}
          value={event.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === event.status) return;
            updateStatus.mutate(
              { id: event.id, status: next as SocietyEvent["status"] },
              {
                onError: () => {
                  window.alert(
                    "The status change could not be saved. Please check the connection and try again.",
                  );
                },
              },
            );
          }}
          className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-300 focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>

        <a
          href={`${ROUTES.events}/${event.slug}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`View public page for ${event.title}`}
          title="View public page"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <ExternalLink size={15} aria-hidden="true" />
        </a>

        <Link
          to={`${ROUTES.admin.events}/${event.id}/edit`}
          aria-label={`Edit ${event.title}`}
          title="Edit event"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(event)}
          aria-label={`Delete ${event.title}`}
          title="Delete event"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one event — same real fields, stacked layout. */
function EventCard({ event, onDelete }: EventRowProps) {
  const updateStatus = useUpdateEventStatus();
  const style = statusChipStyle(event.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">{event.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">/{event.slug}</p>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(event.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Category</dt>
          <dd className="mt-0.5 truncate text-ink">{event.category}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Date</dt>
          <dd className="mt-0.5 truncate text-ink">
            {formatCardDate(event.date)} · {event.startTime}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Location</dt>
          <dd className="mt-0.5 truncate text-ink">{event.location}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Registration</dt>
          <dd className="mt-0.5 truncate text-ink">{registrationLabel(event)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`status-m-${event.id}`}>
          Change status for {event.title}
        </label>
        <select
          id={`status-m-${event.id}`}
          value={event.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === event.status) return;
            updateStatus.mutate(
              { id: event.id, status: next as SocietyEvent["status"] },
              {
                onError: () => {
                  window.alert(
                    "The status change could not be saved. Please check the connection and try again.",
                  );
                },
              },
            );
          }}
          className="h-8 max-w-[7.5rem] rounded-lg border border-line bg-white px-2 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-300 focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <a
            href={`${ROUTES.events}/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public page for ${event.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={14} aria-hidden="true" />
            View
          </a>
          <Link
            to={`${ROUTES.admin.events}/${event.id}/edit`}
            aria-label={`Edit ${event.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(event)}
            aria-label={`Delete ${event.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

/** Loading placeholder — no fabricated rows, matching the dashboard pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading events" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminEventsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminEventSort>("date_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<SocietyEvent | null>(null);

  const { data, isError, isFetching, refetch } = useAdminEvents({
    page,
    pageSize: PAGE_SIZE,
    search,
    category,
    status,
    sort,
  });
  const deleteEvent = useDeleteEvent();

  const hasFilters = Boolean(search || category || status);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, category, status, sort]);

  function clearFilters() {
    setSearchInput("");
    setCategory(undefined);
    setStatus(undefined);
  }

  const events = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const showingFrom = meta && total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const showingTo = meta ? Math.min(meta.page * meta.pageSize, total) : 0;

  return (
    <div
      className="mx-auto w-full max-w-6xl"
      data-state={isError ? "error" : data ? "ready" : "loading"}
    >
      {/* ---------- Header ---------- */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Create and manage the society's events — workshops, seminars,
            hackathons, and more. Changes appear on the public events page as
            soon as they are saved.
          </p>
        </div>
        <Button to={`${ROUTES.admin.events}/new`} variant="navy" className="shrink-0">
          <CalendarPlus size={16} aria-hidden="true" />
          Create Event
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load events"
            description="We couldn't load the events from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-events-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-events-filters-heading" className="sr-only">
              Filter events
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-events-search"
                  label="Search events"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, location, tags…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-events-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-events-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminEventSort)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <FilterBar
                  groups={[
                    {
                      id: "status",
                      label: "Status",
                      options: ["All", ...STATUS_OPTIONS.map(formatStatus)],
                    },
                    ...(meta
                      ? [
                          {
                            id: "category",
                            label: "Category",
                            options: ["All", ...meta.facets.categories.map((entry) => entry.value)],
                          },
                        ]
                      : []),
                  ]}
                  values={{ status: status ? formatStatus(status) : "All", category: category ?? "All" }}
                  onToggle={(groupId, value) => {
                    if (groupId === "status") setStatus(value === "All" ? undefined : value.toLowerCase());
                    if (groupId === "category") setCategory(value === "All" ? undefined : value);
                  }}
                  onClear={clearFilters}
                  clearLabel="Reset filters"
                  getOptionLabel={(_groupId, option) => option}
                />
              </div>
            </div>
          </section>

          {/* ---------- Results ---------- */}
          {!data ? (
            <div className="mt-6">
              <TableSkeleton />
            </div>
          ) : events.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No matching events"
                  description="No events match the current search and filters. Adjust them, or reset to see every event."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No events yet"
                  description="The society's events live here once created. Publish the first workshop, seminar, or hackathon and it will appear on the public events page immediately."
                >
                  <Button to={`${ROUTES.admin.events}/new`} variant="navy">
                    <CalendarPlus size={16} aria-hidden="true" />
                    Create Event
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> events
                </p>
                {isFetching && (
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium text-muted"
                    data-refreshing="true"
                  >
                    <RefreshCw size={12} aria-hidden="true" className="animate-spin" />
                    Updating…
                  </span>
                )}
              </div>

              {/* Desktop table — fixed layout so truncate cells can never
                  push the page wider (Phase 9C QA found the auto-layout bug). */}
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">Events management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[26%] px-4 py-3 xl:w-[24%]">Event</th>
                      <th scope="col" className="w-[15%] px-4 py-3 xl:w-[12%]">Category</th>
                      <th scope="col" className="w-[17%] px-4 py-3 xl:w-[13%]">Date</th>
                      <th scope="col" className="hidden px-4 py-3 xl:table-cell xl:w-[16%]">Location</th>
                      <th scope="col" className="w-[22%] px-4 py-3 xl:w-[18%]">Status</th>
                      <th scope="col" className="w-[20%] px-4 py-3 text-right xl:w-[17%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {events.map((event) => (
                      <tr key={event.id} className="transition-colors hover:bg-navy-50/60">
                        <EventRowCells event={event} />
                        <EventRowActions event={event} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 divide-y divide-line rounded-xl border border-line bg-white lg:hidden [&>li:first-child]:divide-y-0">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Events pagination"
                className="mt-5 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-xs text-muted">
                  Page {meta!.page} of {meta!.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={meta!.page <= 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, meta!.totalPages))
                    }
                    disabled={meta!.page >= meta!.totalPages || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </nav>
            </>
          )}
        </>
      )}

      {/* ---------- Delete confirmation ---------- */}
      <AdminEventDeleteDialog
        event={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteEvent.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteEvent.isPending}
        error={deleteEvent.isError ? deleteEvent.error?.message ?? null : null}
      />
    </div>
  );
}

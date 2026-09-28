import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, RefreshCw, Trash2, UserPlus, UsersRound } from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAdminTeam, useDeleteTeamCard } from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AdminTeamSort, TeamCardWrite, TeamGroup } from "@/types";

/**
 * TeamCardsManager (Task 14) — the shared management list for ONE fixed
 * team-card group. The Home Page admin page mounts it twice (Leadership,
 * Developers) and the About Page admin page mounts it for its leadership
 * strip; because the group never changes inside an instance the old group
 * filter chips are gone — rows are filtered, searched, sorted, paginated,
 * archived, and deleted exactly like the Phase 12 Team CMS did.
 *
 * Pure CRUD surface: the parent page owns the heading, the copy about WHERE
 * the cards appear, and the create/edit destinations (this component never
 * navigates on its own — it renders the hrefs it is given).
 */

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ value: AdminTeamSort; label: string }> = [
  { value: "order_asc", label: "Display order — manual" },
  { value: "name_asc", label: "Name — A to Z" },
  { value: "name_desc", label: "Name — Z to A" },
  { value: "newest", label: "Newest first" },
];

interface TeamCardsManagerProps {
  /** Fixed card group for this instance ("leaders" | "developers"). */
  group: TeamGroup;
  /** Where "New card" points (context-aware create route). */
  createHref: string;
  /** Edit route builder (context-aware edit route). */
  editHref: (id: string) => string;
  /** Empty-state copy (differs per mounting page). */
  emptyTitle: string;
  emptyDescription: string;
  /** Create-button label — defaults to "New card". */
  createLabel?: string;
}

/** Portrait + name + position — shared by the table row and the mobile card. */
function CardIdentity({ card }: { card: TeamCardWrite }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {card.image ? (
        <img
          src={card.image}
          alt={card.imageAlt ?? `Portrait of ${card.name}`}
          loading="lazy"
          className="size-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 font-display text-xs font-bold text-gold-300"
        >
          {card.initials}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-bold text-navy-900">{card.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{card.position}</p>
      </div>
    </div>
  );
}

interface ManagerRowProps {
  card: TeamCardWrite;
  editHref: (id: string) => string;
  onDelete: (card: TeamCardWrite) => void;
}

/** One management row — desktop table cells. */
function TeamRowCells({ card }: { card: TeamCardWrite }) {
  return (
    <>
      <td className="px-4 py-3.5">
        <CardIdentity card={card} />
      </td>
      <td className="px-4 py-3.5">
        <span className="block text-sm text-ink">#{card.order}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={card.status === "published" ? "navySoft" : "goldSoft"}>
          {card.status === "published" ? "Published" : "Archived"}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — edit, delete. */
function TeamRowActions({ card, editHref, onDelete }: ManagerRowProps) {
  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Link
          to={editHref(card.id)}
          aria-label={`Edit ${card.name}`}
          title="Edit card"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(card)}
          aria-label={`Delete ${card.name}`}
          title="Delete card"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one team card — same real fields, stacked layout. */
function TeamCardRow({ card, editHref, onDelete }: ManagerRowProps) {
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <CardIdentity card={card} />
        <Badge variant={card.status === "published" ? "navySoft" : "goldSoft"}>
          {card.status === "published" ? "Published" : "Archived"}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Order</dt>
          <dd className="mt-0.5 text-ink">#{card.order}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Status</dt>
          <dd className="mt-0.5 text-ink">
            {card.status === "published" ? "Published" : "Archived"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            to={editHref(card.id)}
            aria-label={`Edit ${card.name}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(card)}
            aria-label={`Delete ${card.name}`}
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

/** Loading placeholder — no fabricated rows, matching the 9C/9D pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading cards" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export function TeamCardsManager({
  group,
  createHref,
  editHref,
  emptyTitle,
  emptyDescription,
  createLabel = "New card",
}: TeamCardsManagerProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminTeamSort>("order_asc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<TeamCardWrite | null>(null);

  const { data, isError, isFetching, refetch } = useAdminTeam({
    page,
    pageSize: PAGE_SIZE,
    search,
    group,
    status: status as never,
    sort,
  });
  const deleteTeamCard = useDeleteTeamCard();

  const hasFilters = Boolean(search || status);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
  }

  const cards = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const showingFrom = meta && total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const showingTo = meta ? Math.min(meta.page * meta.pageSize, total) : 0;

  return (
    <div data-state={isError ? "error" : data ? "ready" : "loading"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Published cards appear on the site immediately; archived cards are kept
          but hidden from every public surface.
        </p>
        <Button to={createHref} variant="navy" className="shrink-0">
          <UserPlus size={16} aria-hidden="true" />
          {createLabel}
        </Button>
      </div>

      {isError ? (
        <div className="mt-6">
          <ErrorState
            title="Couldn't load cards"
            description="We couldn't load the cards from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="team-manager-filters-heading"
            className="mt-5 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="team-manager-filters-heading" className="sr-only">
              Filter cards
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="team-manager-search"
                  label="Search cards"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, position, description…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="team-manager-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="team-manager-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminTeamSort)}
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
                      options: ["All", "Published", "Archived"],
                    },
                  ]}
                  values={{ status: status ?? "All" }}
                  onToggle={(groupId, value) => {
                    if (groupId === "status")
                      setStatus(value === "All" ? undefined : value.toLowerCase());
                  }}
                  onClear={clearFilters}
                  clearLabel="Reset filters"
                />
              </div>
            </div>
          </section>

          {/* ---------- Results ---------- */}
          {!data ? (
            <div className="mt-6">
              <TableSkeleton />
            </div>
          ) : cards.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={UsersRound}
                  title="No matching cards"
                  description="No cards match the current search and filters. Adjust them, or reset to see every card."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState icon={UsersRound} title={emptyTitle} description={emptyDescription}>
                  <Button to={createHref} variant="navy">
                    <UserPlus size={16} aria-hidden="true" />
                    {createLabel}
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing{" "}
                  <span className="font-semibold text-navy-900">
                    {showingFrom}–{showingTo}
                  </span>{" "}
                  of <span className="font-semibold text-navy-900">{total}</span> cards
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

              {/* Desktop table */}
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">Card management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[52%] px-4 py-3">
                        Card
                      </th>
                      <th scope="col" className="w-[16%] px-4 py-3">
                        Order
                      </th>
                      <th scope="col" className="w-[16%] px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="w-[16%] px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {cards.map((card) => (
                      <tr key={card.id} className="transition-colors hover:bg-navy-50/60">
                        <TeamRowCells card={card} />
                        <TeamRowActions
                          card={card}
                          editHref={editHref}
                          onDelete={setPendingDelete}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {cards.map((card) => (
                  <TeamCardRow
                    key={card.id}
                    card={card}
                    editHref={editHref}
                    onDelete={setPendingDelete}
                  />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Card pagination"
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
                    onClick={() => setPage((current) => Math.min(current + 1, meta!.totalPages))}
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

      {/* ---------- Delete confirmation (shared, accessible) ---------- */}
      <AdminEventDeleteDialog
        kind="teamCard"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.name } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteTeamCard.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteTeamCard.isPending}
        error={deleteTeamCard.isError ? deleteTeamCard.error?.message ?? null : null}
      />
    </div>
  );
}

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
import { ROUTES } from "@/routes/paths";
import { TEAM_GROUP_LABELS } from "@/lib/adminTeamForm";
import type { AdminTeamSort, TeamCardWrite } from "@/types";

/**
 * Admin Team CMS (Phase 12) — the /admin/team management page over the
 * `team` collection through GET /api/admin/team (team-permission-gated).
 *
 * ONE section manages BOTH public card groups: Leadership (home + About)
 * and Developers (home). Group/status filter chips and a search over
 * name/position/description; rows order by the manual display order by
 * default. Published cards appear on the public site immediately;
 * archived cards stay visible here but leave every public surface.
 */

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ value: AdminTeamSort; label: string }> = [
  { value: "order_asc", label: "Display order — manual" },
  { value: "name_asc", label: "Name — A to Z" },
  { value: "name_desc", label: "Name — Z to A" },
  { value: "newest", label: "Newest first" },
];

interface TeamRowProps {
  card: TeamCardWrite;
  onDelete: (card: TeamCardWrite) => void;
}

/** One management row — desktop table cells. */
function TeamRowCells({ card }: { card: TeamCardWrite }) {
  return (
    <>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
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
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={card.group === "leaders" ? "solidGold" : "navySoft"}>
          {TEAM_GROUP_LABELS[card.group]}
        </Badge>
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
function TeamRowActions({ card, onDelete }: TeamRowProps) {
  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Link
          to={`${ROUTES.admin.team}/${card.id}/edit`}
          aria-label={`Edit ${card.name}`}
          title="Edit team card"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(card)}
          aria-label={`Delete ${card.name}`}
          title="Delete team card"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one team card — same real fields, stacked layout. */
function TeamCardRow({ card, onDelete }: TeamRowProps) {
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
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
            <p className="font-display text-sm font-bold text-navy-900">{card.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{card.position}</p>
          </div>
        </div>
        <Badge variant={card.group === "leaders" ? "solidGold" : "navySoft"}>
          {TEAM_GROUP_LABELS[card.group]}
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
            to={`${ROUTES.admin.team}/${card.id}/edit`}
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
    <div role="status" aria-label="Loading team cards" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminTeamPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [group, setGroup] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminTeamSort>("order_asc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<TeamCardWrite | null>(null);

  const { data, isError, isFetching, refetch } = useAdminTeam({
    page,
    pageSize: PAGE_SIZE,
    search,
    group: group as never,
    status: status as never,
    sort,
  });
  const deleteTeamCard = useDeleteTeamCard();

  const hasFilters = Boolean(search || group || status);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, group, status, sort]);

  function clearFilters() {
    setSearchInput("");
    setGroup(undefined);
    setStatus(undefined);
  }

  const cards = data?.data ?? [];
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
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">Team</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Manage the Leadership and Developers cards shown on the home page — the
            leadership strip on the About page reads the same cards. Published cards
            appear on the site immediately; archived cards are kept but hidden.
          </p>
        </div>
        <Button to={`${ROUTES.admin.team}/new`} variant="navy" className="shrink-0">
          <UserPlus size={16} aria-hidden="true" />
          New team card
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load team cards"
            description="We couldn't load the team cards from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-team-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-team-filters-heading" className="sr-only">
              Filter team cards
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-team-search"
                  label="Search team cards"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, position, description…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-team-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-team-sort"
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
                    { id: "group", label: "Group", options: ["All", "Leaders", "Developers"] },
                    {
                      id: "status",
                      label: "Status",
                      options: ["All", "Published", "Archived"],
                    },
                  ]}
                  values={{ group: group ?? "All", status: status ?? "All" }}
                  onToggle={(groupId, value) => {
                    if (groupId === "group")
                      setGroup(value === "All" ? undefined : value.toLowerCase());
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
                  title="No matching team cards"
                  description="No team cards match the current search and filters. Adjust them, or reset to see every card."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title="No team cards yet"
                  description="Create the first card and it appears in the home page Leadership or Developers section (and the About page's leadership strip) immediately."
                >
                  <Button to={`${ROUTES.admin.team}/new`} variant="navy">
                    <UserPlus size={16} aria-hidden="true" />
                    New team card
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
                  of <span className="font-semibold text-navy-900">{total}</span> team cards
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
                  <caption className="sr-only">Team card management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[34%] px-4 py-3">
                        Card
                      </th>
                      <th scope="col" className="w-[18%] px-4 py-3">
                        Group
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
                        <TeamRowActions card={card} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {cards.map((card) => (
                  <TeamCardRow key={card.id} card={card} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Team pagination"
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

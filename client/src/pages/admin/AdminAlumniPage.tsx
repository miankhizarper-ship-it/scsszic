import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  GraduationCap,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminAlumni,
  useDeleteAlumnus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import type { AdminAlumniSort, AlumnusWrite } from "@/types";

/**
 * Admin Alumni CMS (Phase 9E) — the /admin/alumni management page over the
 * REAL alumni collection through GET /api/admin/alumni (requireAdmin-gated).
 *
 * The alumni dataset has no draft/archived lifecycle — every profile is
 * public (Phase 2 behavior preserved). Every row therefore links to its
 * existing public profile page (/alumni/:username — the same renderer the
 * public directory uses; there is no second profile rendering system), and
 * there is deliberately NO status filter or status action here.
 */

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ value: AdminAlumniSort; label: string }> = [
  { value: "batch_desc", label: "Batch — newest first" },
  { value: "batch_asc", label: "Batch — oldest first" },
  { value: "name_asc", label: "Name — A to Z" },
  { value: "name_desc", label: "Name — Z to A" },
];

interface AlumnusRowProps {
  alumnus: AlumnusWrite;
  onDelete: (alumnus: AlumnusWrite) => void;
}

/** One management row — desktop table cells. */
function AlumnusRowCells({ alumnus }: { alumnus: AlumnusWrite }) {
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {alumnus.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">/{alumnus.username}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">{alumnus.role}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{alumnus.company}</p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{alumnus.field}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{alumnus.batch}</span>
        <span className="block truncate text-xs text-muted">Class of {alumnus.batchYear}</span>
      </td>
    </>
  );
}

/** Row action cluster — view public profile, edit, delete. */
function AlumnusRowActions({ alumnus, onDelete }: AlumnusRowProps) {
  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <a
          href={ROUTES.alumniDetail(alumnus.username)}
          target="_blank"
          rel="noreferrer"
          aria-label={`View public profile for ${alumnus.name}`}
          title="View public profile"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <ExternalLink size={15} aria-hidden="true" />
        </a>

        <Link
          to={`${ROUTES.admin.alumni}/${alumnus.id}/edit`}
          aria-label={`Edit ${alumnus.name}`}
          title="Edit alumni profile"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(alumnus)}
          aria-label={`Delete ${alumnus.name}`}
          title="Delete alumni profile"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one alumnus — same real fields, stacked layout. */
function AlumnusCard({ alumnus, onDelete }: AlumnusRowProps) {
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">{alumnus.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">/{alumnus.username}</p>
        </div>
        <Badge variant="navySoft">{alumnus.batchYear}</Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Role</dt>
          <dd className="mt-0.5 truncate text-ink">{alumnus.role}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Company</dt>
          <dd className="mt-0.5 truncate text-ink">{alumnus.company}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Field</dt>
          <dd className="mt-0.5 truncate text-ink">
            {alumnus.field} · {alumnus.batch}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <a
            href={ROUTES.alumniDetail(alumnus.username)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public profile for ${alumnus.name}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={14} aria-hidden="true" />
            View
          </a>
          <Link
            to={`${ROUTES.admin.alumni}/${alumnus.id}/edit`}
            aria-label={`Edit ${alumnus.name}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(alumnus)}
            aria-label={`Delete ${alumnus.name}`}
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
    <div role="status" aria-label="Loading alumni" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminAlumniPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [field, setField] = useState<string | undefined>(undefined);
  const [batch, setBatch] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminAlumniSort>("batch_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<AlumnusWrite | null>(null);

  const { data, isError, isFetching, refetch } = useAdminAlumni({
    page,
    pageSize: PAGE_SIZE,
    search,
    field,
    batch,
    sort,
  });
  const deleteAlumnus = useDeleteAlumnus();

  const hasFilters = Boolean(search || field || batch);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, field, batch, sort]);

  function clearFilters() {
    setSearchInput("");
    setField(undefined);
    setBatch(undefined);
  }

  const alumni = data?.data ?? [];
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
            Alumni
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Curate the alumni directory. Every profile is public — changes saved
            here appear on the alumni pages immediately.
          </p>
        </div>
        <Button to={`${ROUTES.admin.alumni}/new`} variant="navy" className="shrink-0">
          <UserPlus size={16} aria-hidden="true" />
          Create Alumni
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load alumni"
            description="We couldn't load the alumni from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-alumni-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-alumni-filters-heading" className="sr-only">
              Filter alumni
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-alumni-search"
                  label="Search alumni"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, role, company…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-alumni-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-alumni-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminAlumniSort)}
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
                    ...(meta
                      ? [
                          {
                            id: "field",
                            label: "Field",
                            options: ["All", ...meta.facets.fields.map((entry) => entry.value)],
                          },
                          {
                            id: "batch",
                            label: "Batch",
                            options: ["All", ...meta.facets.batches.map((entry) => entry.value)],
                          },
                        ]
                      : []),
                  ]}
                  values={{ field: field ?? "All", batch: batch ?? "All" }}
                  onToggle={(groupId, value) => {
                    if (groupId === "field") setField(value === "All" ? undefined : value);
                    if (groupId === "batch") setBatch(value === "All" ? undefined : value);
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
          ) : alumni.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No matching alumni"
                  description="No alumni profiles match the current search and filters. Adjust them, or reset to see every profile."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No alumni yet"
                  description="The society's graduates live here once added. Create the first profile and it will appear on the public alumni directory immediately."
                >
                  <Button to={`${ROUTES.admin.alumni}/new`} variant="navy">
                    <UserPlus size={16} aria-hidden="true" />
                    Create Alumni
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> alumni
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
                  <caption className="sr-only">Alumni management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[26%] px-4 py-3">Alumnus</th>
                      <th scope="col" className="w-[26%] px-4 py-3">Role</th>
                      <th scope="col" className="w-[20%] px-4 py-3">Field</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Batch</th>
                      <th scope="col" className="w-[14%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {alumni.map((alumnus) => (
                      <tr key={alumnus.id} className="transition-colors hover:bg-navy-50/60">
                        <AlumnusRowCells alumnus={alumnus} />
                        <AlumnusRowActions alumnus={alumnus} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {alumni.map((alumnus) => (
                  <AlumnusCard key={alumnus.id} alumnus={alumnus} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Alumni pagination"
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

      {/* ---------- Delete confirmation (shared, accessible) ---------- */}
      <AdminEventDeleteDialog
        kind="alumnus"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.name } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteAlumnus.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteAlumnus.isPending}
        error={deleteAlumnus.isError ? deleteAlumnus.error?.message ?? null : null}
      />
    </div>
  );
}

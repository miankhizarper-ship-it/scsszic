import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminMembers,
  useDeleteMember,
  useUpdateMemberStatus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import type { AdminMemberSort, Member } from "@/types";

/**
 * Admin Members CMS (Phase 9E) — the /admin/members management page over
 * the REAL members collection through GET /api/admin/members
 * (requireAdmin-gated).
 *
 * The directory lifecycle is the model's own (active/alumni/archived).
 * Archived profiles are visible HERE (that is the point of the CMS) but
 * never on the public site — the public repository's active+alumni gate is
 * untouched. Public profile links (/profile/:username — the existing
 * renderer, no second profile system) exist only for non-archived rows,
 * because the public page 404s for archived profiles.
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["active", "alumni", "archived"] as const;

const SORT_OPTIONS: Array<{ value: AdminMemberSort; label: string }> = [
  { value: "batch_desc", label: "Batch — newest first" },
  { value: "batch_asc", label: "Batch — oldest first" },
  { value: "name_asc", label: "Name — A to Z" },
  { value: "name_desc", label: "Name — Z to A" },
  { value: "featured_desc", label: "Featured first" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "active") return { variant: "goldSoft" };
  if (status === "archived") {
    return { variant: "navySoft", className: "border-line bg-surface text-muted" };
  }
  return { variant: "navySoft" };
}

interface MemberRowProps {
  member: Member;
  onDelete: (member: Member) => void;
}

/** One management row — desktop table cells. */
function MemberRowCells({ member }: { member: Member }) {
  const style = statusChipStyle(member.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {member.featured && (
            <Star size={12} aria-label="Featured member" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
          )}
          {member.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">@{member.username}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">{member.role}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{member.company ?? member.department ?? "—"}</p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{member.domain}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{member.batch}</span>
        <span className="block truncate text-xs text-muted">{member.department ?? "—"}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(member.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, view (non-archived), edit, delete. */
function MemberRowActions({ member, onDelete }: MemberRowProps) {
  const updateStatus = useUpdateMemberStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`member-status-${member.id}`}>
          Change status for {member.name}
        </label>
        <select
          id={`member-status-${member.id}`}
          value={member.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === member.status) return;
            updateStatus.mutate(
              { id: member.id, status: next as Member["status"] },
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

        {member.status !== "archived" && (
          <a
            href={ROUTES.profile(member.username)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public profile for ${member.name}`}
            title="View public profile"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.members}/${member.id}/edit`}
          aria-label={`Edit ${member.name}`}
          title="Edit member"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(member)}
          aria-label={`Delete ${member.name}`}
          title="Delete member"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one member — same real fields, stacked layout. */
function MemberCard({ member, onDelete }: MemberRowProps) {
  const updateStatus = useUpdateMemberStatus();
  const style = statusChipStyle(member.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">
            {member.featured && (
              <Star size={12} aria-label="Featured member" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
            )}
            {member.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">@{member.username}</p>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(member.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Role</dt>
          <dd className="mt-0.5 truncate text-ink">{member.role}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Domain</dt>
          <dd className="mt-0.5 truncate text-ink">{member.domain}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Batch</dt>
          <dd className="mt-0.5 truncate text-ink">
            {member.batch} · {member.department ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`member-status-m-${member.id}`}>
          Change status for {member.name}
        </label>
        <select
          id={`member-status-m-${member.id}`}
          value={member.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === member.status) return;
            updateStatus.mutate(
              { id: member.id, status: next as Member["status"] },
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
          {member.status !== "archived" && (
            <a
              href={ROUTES.profile(member.username)}
              target="_blank"
              rel="noreferrer"
              aria-label={`View public profile for ${member.name}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.members}/${member.id}/edit`}
            aria-label={`Edit ${member.name}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(member)}
            aria-label={`Delete ${member.name}`}
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
    <div role="status" aria-label="Loading members" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminMembersPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [batch, setBatch] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminMemberSort>("batch_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);

  const { data, isError, isFetching, refetch } = useAdminMembers({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    domain,
    batch,
    sort,
  });
  const deleteMember = useDeleteMember();

  const hasFilters = Boolean(search || status || domain || batch);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, domain, batch, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
    setDomain(undefined);
    setBatch(undefined);
  }

  const members = data?.data ?? [];
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
            Members
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Maintain the member directory. Active and alumni-status profiles are
            public; archived profiles stay here for record-keeping and never
            appear on the public site.
          </p>
        </div>
        <Button to={`${ROUTES.admin.members}/new`} variant="navy" className="shrink-0">
          <UserPlus size={16} aria-hidden="true" />
          Create Member
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load members"
            description="We couldn't load the members from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-members-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-members-filters-heading" className="sr-only">
              Filter members
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-members-search"
                  label="Search members"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, role, skills…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-members-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-members-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminMemberSort)}
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
                            id: "domain",
                            label: "Domain",
                            options: ["All", ...meta.facets.domains.map((entry) => entry.value)],
                          },
                          {
                            id: "batch",
                            label: "Batch",
                            options: ["All", ...meta.facets.batches.map((entry) => entry.value)],
                          },
                        ]
                      : []),
                  ]}
                  values={{
                    status: status ? formatStatus(status) : "All",
                    domain: domain ?? "All",
                    batch: batch ?? "All",
                  }}
                  onToggle={(groupId, value) => {
                    if (groupId === "status") setStatus(value === "All" ? undefined : value.toLowerCase());
                    if (groupId === "domain") setDomain(value === "All" ? undefined : value);
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
          ) : members.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={Users}
                  title="No matching members"
                  description="No members match the current search and filters. Adjust them, or reset to see every member."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  description="The community directory lives here once populated. Create the first member profile and it will appear on the public members page immediately."
                >
                  <Button to={`${ROUTES.admin.members}/new`} variant="navy">
                    <UserPlus size={16} aria-hidden="true" />
                    Create Member
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> members
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
                  <caption className="sr-only">Members management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[24%] px-4 py-3">Member</th>
                      <th scope="col" className="w-[22%] px-4 py-3">Role</th>
                      <th scope="col" className="w-[16%] px-4 py-3">Domain</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Batch</th>
                      <th scope="col" className="w-[10%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[14%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {members.map((member) => (
                      <tr key={member.id} className="transition-colors hover:bg-navy-50/60">
                        <MemberRowCells member={member} />
                        <MemberRowActions member={member} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {members.map((member) => (
                  <MemberCard key={member.id} member={member} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Members pagination"
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
        kind="member"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.name } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteMember.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteMember.isPending}
        error={deleteMember.isError ? deleteMember.error?.message ?? null : null}
      />
    </div>
  );
}

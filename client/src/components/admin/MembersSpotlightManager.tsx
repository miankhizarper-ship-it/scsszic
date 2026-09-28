import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Pencil, RefreshCw, Star, UserPlus, Users } from "lucide-react";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminMembers,
  useUpdateMember,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import type { Member } from "@/types";

/**
 * MembersSpotlightManager (Task 14) — the "Members" tab of the admin Home
 * Page manager. The home page's Members section renders the directory's
 * canonical order capped to four cards (featured first, then newest batch,
 * then name), so THIS tab manages the spotlight with a star toggle: starring
 * a member pins them to the front of the home spotlight; unstarring sends
 * them back to directory order. Full profile editing stays in the Members
 * directory CMS — this tab links there instead of duplicating it.
 */

const PAGE_SIZE = 8;

const MEMBER_STATUS_VARIANT: Record<Member["status"], BadgeVariant> = {
  active: "navySoft",
  alumni: "solidGold",
  archived: "goldSoft",
};

const MEMBER_STATUS_LABEL: Record<Member["status"], string> = {
  active: "Active",
  alumni: "Alumni",
  archived: "Archived",
};

interface SpotlightRowProps {
  member: Member;
}

/**
 * One row — owns its own mutation instance (hooks cannot be called inside a
 * loop). The star is a real toggle button with aria-pressed; while the PATCH
 * is in flight the star is disabled and mid-animation, and failures surface
 * inline next to the control.
 */
function SpotlightRow({ member }: SpotlightRowProps) {
  const updateMember = useUpdateMember(member.id);
  const featured = member.featured === true;

  function toggleFeatured() {
    if (updateMember.isPending) return;
    updateMember.mutate({ featured: !featured });
  }

  return (
    <>
      <td className="px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.avatarAlt ?? `Portrait of ${member.name}`}
              loading="lazy"
              className="size-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 font-display text-xs font-bold text-gold-300"
            >
              {member.initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-navy-900">{member.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{member.role}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="block text-sm text-ink">{member.batch}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={MEMBER_STATUS_VARIANT[member.status]}>
          {MEMBER_STATUS_LABEL[member.status]}
        </Badge>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          {updateMember.isError && (
            <span role="alert" className="text-xs font-medium text-error">
              Couldn't update
            </span>
          )}
          <button
            type="button"
            onClick={toggleFeatured}
            disabled={updateMember.isPending}
            aria-pressed={featured}
            aria-label={
              featured
                ? `Remove ${member.name} from the home page spotlight`
                : `Pin ${member.name} to the home page spotlight`
            }
            title={featured ? "On the home page spotlight — click to remove" : "Pin to the home page spotlight"}
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              "disabled:pointer-events-none disabled:opacity-60",
              featured
                ? "bg-gold-500/15 text-gold-700 hover:bg-gold-500/25"
                : "text-navy-700 hover:bg-navy-50",
            ].join(" ")}
          >
            <Star
              size={14}
              aria-hidden="true"
              className={featured ? "fill-gold-500 text-gold-500" : "text-navy-400"}
            />
            {updateMember.isPending ? "Saving…" : featured ? "On home page" : "Pin"}
          </button>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Link
            to={`${ROUTES.admin.members}/${member.id}/edit`}
            aria-label={`Edit ${member.name}`}
            title="Edit member profile"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
        </div>
      </td>
    </>
  );
}

/** Mobile card variant — same real fields, stacked layout. */
function SpotlightCardRow({ member }: SpotlightRowProps) {
  const updateMember = useUpdateMember(member.id);
  const featured = member.featured === true;

  function toggleFeatured() {
    if (updateMember.isPending) return;
    updateMember.mutate({ featured: !featured });
  }

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.avatarAlt ?? `Portrait of ${member.name}`}
              loading="lazy"
              className="size-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 font-display text-xs font-bold text-gold-300"
            >
              {member.initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-navy-900">{member.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{member.role}</p>
          </div>
        </div>
        <Badge variant={MEMBER_STATUS_VARIANT[member.status]}>
          {MEMBER_STATUS_LABEL[member.status]}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Batch</dt>
          <dd className="mt-0.5 text-ink">{member.batch}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Spotlight</dt>
          <dd className="mt-0.5 text-ink">{featured ? "On home page" : "Directory only"}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={toggleFeatured}
          disabled={updateMember.isPending}
          aria-pressed={featured}
          aria-label={
            featured
              ? `Remove ${member.name} from the home page spotlight`
              : `Pin ${member.name} to the home page spotlight`
          }
          className={[
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
            "disabled:pointer-events-none disabled:opacity-60",
            featured
              ? "bg-gold-500/15 text-gold-700 hover:bg-gold-500/25"
              : "text-navy-700 hover:bg-navy-50",
          ].join(" ")}
        >
          <Star
            size={14}
            aria-hidden="true"
            className={featured ? "fill-gold-500 text-gold-500" : "text-navy-400"}
          />
          {updateMember.isPending ? "Saving…" : featured ? "On home page" : "Pin"}
        </button>
        <Link
          to={`${ROUTES.admin.members}/${member.id}/edit`}
          aria-label={`Edit ${member.name}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={14} aria-hidden="true" />
          Edit
        </Link>
        {updateMember.isError && (
          <span role="alert" className="text-xs font-medium text-error">
            Couldn't update — try again
          </span>
        )}
      </div>
    </li>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading members" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export function MembersSpotlightManager() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [featured, setFeatured] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isError, isFetching, refetch } = useAdminMembers({
    page,
    pageSize: PAGE_SIZE,
    search,
    featured: featured as never,
    sort: "featured_desc",
  });

  const hasFilters = Boolean(search || featured);

  useEffect(() => {
    setPage(1);
  }, [search, featured]);

  function clearFilters() {
    setSearchInput("");
    setFeatured(undefined);
  }

  const members = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const showingFrom = meta && total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const showingTo = meta ? Math.min(meta.page * meta.pageSize, total) : 0;

  return (
    <div data-state={isError ? "error" : data ? "ready" : "loading"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          The home page shows up to <span className="font-semibold text-navy-900">four</span>{" "}
          member cards — featured members first, then the newest directory
          additions. Star a member to pin them to the spotlight; full profile
          editing lives in the Members directory.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button to={ROUTES.admin.members} variant="ghost" size="md">
            <ExternalLink size={15} aria-hidden="true" />
            Full directory
          </Button>
          <Button to={`${ROUTES.admin.members}/new`} variant="navy" size="md">
            <UserPlus size={16} aria-hidden="true" />
            New member
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="mt-6">
          <ErrorState
            title="Couldn't load members"
            description="We couldn't load the member directory from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="members-spotlight-filters-heading"
            className="mt-5 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="members-spotlight-filters-heading" className="sr-only">
              Filter members
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="members-spotlight-search"
                  label="Search members"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, role, batch…"
                />
              </div>
              <div className="min-w-0 flex-1">
                <FilterBar
                  groups={[
                    {
                      id: "featured",
                      label: "Spotlight",
                      options: ["All", "Featured", "Not featured"],
                    },
                  ]}
                  values={{ featured: featured ?? "All" }}
                  onToggle={(groupId, value) => {
                    if (groupId === "featured") {
                      if (value === "All") setFeatured(undefined);
                      else setFeatured(value === "Featured" ? "true" : "false");
                    }
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
                  description="Add the first member profile and it can appear in the home page Members spotlight immediately."
                >
                  <Button to={`${ROUTES.admin.members}/new`} variant="navy">
                    <UserPlus size={16} aria-hidden="true" />
                    New member
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
                  of <span className="font-semibold text-navy-900">{total}</span> members
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
                  <caption className="sr-only">Member spotlight management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[38%] px-4 py-3">
                        Member
                      </th>
                      <th scope="col" className="w-[14%] px-4 py-3">
                        Batch
                      </th>
                      <th scope="col" className="w-[14%] px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="w-[18%] px-4 py-3 text-right">
                        Spotlight
                      </th>
                      <th scope="col" className="w-[16%] px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {members.map((member) => (
                      <tr key={member.id} className="transition-colors hover:bg-navy-50/60">
                        <SpotlightRow member={member} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {members.map((member) => (
                  <SpotlightCardRow key={member.id} member={member} />
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
    </div>
  );
}

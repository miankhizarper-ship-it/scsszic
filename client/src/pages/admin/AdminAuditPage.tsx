import { useEffect, useState } from "react";
import { Activity, RefreshCw, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAdminAudit } from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/lib/format";
import type { AdminAuditListParams, AuditLogEntry } from "@/types";

/**
 * Admin Audit Log (Phase 9H) — the /admin/audit page over GET /api/admin/audit
 * (requireAdmin-gated, READ-ONLY). Every successful privileged mutation from
 * the Phases 9C–9H CMS surfaces lands here as a server-generated record —
 * the actor comes from the verified session, so this page cannot be
 * manipulated from the client. There is deliberately no create/edit/delete:
 * the only interactive elements are filters and pagination.
 *
 * The table is fixed to newest-first (the API has no sort parameter — the
 * deterministic order IS the contract). Metadata is the server-authored
 * concise map (changed fields, from→to, slug) — never raw request bodies.
 */

const PAGE_SIZE = 20;

/** UTC day bounds for the period filter (matches the API's from/to contract). */
function utcDay(offsetDays: number): string {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - offsetDays);
  return day.toISOString().slice(0, 10);
}

const PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today (UTC)" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

function periodToFrom(period: PeriodValue): string | undefined {
  if (period === "today") return utcDay(0);
  if (period === "7d") return utcDay(6);
  if (period === "30d") return utcDay(29);
  return undefined;
}

/** Concise metadata rendering — "key: value" pairs, insertion order kept. */
function MetadataText({ entry }: { entry: AuditLogEntry }) {
  if (!entry.metadata || Object.keys(entry.metadata).length === 0) return <span>—</span>;
  return (
    <span className="break-words">
      {Object.entries(entry.metadata)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" · ")}
    </span>
  );
}

function ActionChip({ action }: { action: string }) {
  return (
    <span className="inline-block max-w-full truncate rounded-md border border-navy-100 bg-navy-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy-700">
      {action}
    </span>
  );
}

/** One audit row — desktop table cells. */
function AuditRowCells({ entry }: { entry: AuditLogEntry }) {
  return (
    <>
      <td className="px-4 py-3">
        <span className="block whitespace-nowrap text-xs font-medium text-ink">
          {formatDateTime(entry.createdAt)}
        </span>
        <span className="mt-0.5 block text-[11px] uppercase tracking-wider text-muted">UTC</span>
      </td>
      <td className="px-4 py-3">
        <p className="truncate text-sm font-semibold text-navy-900">@{entry.actorUsername}</p>
        <p className="mt-0.5 text-xs capitalize text-muted">{entry.actorRole}</p>
      </td>
      <td className="px-4 py-3">
        <ActionChip action={entry.action} />
      </td>
      <td className="px-4 py-3">
        <p className="truncate text-sm text-ink">{entry.resourceLabel ?? "—"}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
          {entry.resourceType} · {entry.resourceId}
        </p>
      </td>
      <td className="px-4 py-3 text-xs leading-relaxed text-muted">
        <MetadataText entry={entry} />
      </td>
    </>
  );
}

/** Mobile card for one audit record — same real fields, stacked layout. */
function AuditCard({ entry }: { entry: AuditLogEntry }) {
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">@{entry.actorUsername}</p>
          <p className="mt-0.5 text-xs text-muted">{formatDateTime(entry.createdAt)} UTC</p>
        </div>
        <Badge variant="navySoft" className="capitalize">{entry.actorRole}</Badge>
      </div>
      <div className="mt-2">
        <ActionChip action={entry.action} />
      </div>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Resource</dt>
          <dd className="mt-0.5 truncate text-ink">
            {entry.resourceLabel ?? "—"} · <span className="font-mono">{entry.resourceId}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Details</dt>
          <dd className="mt-0.5 text-muted">
            <MetadataText entry={entry} />
          </dd>
        </div>
      </dl>
    </li>
  );
}

/** Loading placeholder — no fabricated rows, matching the 9E/9F/9G pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading audit log" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminAuditPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [actor, setActor] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [resourceType, setResourceType] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<PeriodValue>("all");
  const [page, setPage] = useState(1);

  const params: AdminAuditListParams = {
    page,
    pageSize: PAGE_SIZE,
    search,
    actor,
    action,
    resourceType,
    from: periodToFrom(period),
  };

  const { data, isError, isFetching, refetch } = useAdminAudit(params);

  const hasFilters = Boolean(search || actor || action || resourceType || period !== "all");

  // Any filter change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, actor, action, resourceType, period]);

  function clearFilters() {
    setSearchInput("");
    setActor(undefined);
    setAction(undefined);
    setResourceType(undefined);
    setPeriod("all");
  }

  const entries = data?.data ?? [];
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
            Audit Log
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Server-generated record of every successful privileged mutation — the actor comes
            from the verified session, not from the browser. Entries are newest-first and
            read-only.
          </p>
        </div>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load the audit log"
            description="We couldn't load the audit entries from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-audit-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-audit-filters-heading" className="sr-only">
              Filter audit entries
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-audit-search"
                  label="Search audit log"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search actor, action, resource…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-audit-period"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Period
                </label>
                <select
                  id="admin-audit-period"
                  value={period}
                  onChange={(changeEvent) => setPeriod(changeEvent.target.value as PeriodValue)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <FilterBar
                  groups={[
                    ...(meta && meta.facets.actors.length > 0
                      ? [{ id: "actor", label: "Actor", options: ["All", ...meta.facets.actors.map((entry) => entry.value)] }]
                      : []),
                    ...(meta && meta.facets.resourceTypes.length > 0
                      ? [{ id: "resourceType", label: "Resource", options: ["All", ...meta.facets.resourceTypes.map((entry) => entry.value)] }]
                      : []),
                    ...(meta && meta.facets.actions.length > 0
                      ? [{ id: "action", label: "Action", options: ["All", ...meta.facets.actions.map((entry) => entry.value)] }]
                      : []),
                  ]}
                  values={{
                    actor: actor ?? "All",
                    resourceType: resourceType ?? "All",
                    action: action ?? "All",
                  }}
                  onToggle={(groupId, value) => {
                    if (groupId === "actor") setActor(value === "All" ? undefined : value);
                    if (groupId === "resourceType") setResourceType(value === "All" ? undefined : value);
                    if (groupId === "action") setAction(value === "All" ? undefined : value);
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
          ) : entries.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={ScrollText}
                  title="No matching audit entries"
                  description="No audit records match the current search and filters. Adjust them, or reset to see the whole trail."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No audit entries yet"
                  description="Every successful admin mutation — across events, blogs, alumni, members, projects, feed, gallery, videos, and users — is recorded here automatically. Make a change in any CMS section and it will appear."
                />
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> entries
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
                  <caption className="sr-only">Audit log, newest first</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[16%] px-4 py-3">Time</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Actor</th>
                      <th scope="col" className="w-[20%] px-4 py-3">Action</th>
                      <th scope="col" className="w-[22%] px-4 py-3">Resource</th>
                      <th scope="col" className="w-[28%] px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="transition-colors hover:bg-navy-50/60">
                        <AuditRowCells entry={entry} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {entries.map((entry) => (
                  <AuditCard key={entry.id} entry={entry} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Audit pagination"
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
    </div>
  );
}

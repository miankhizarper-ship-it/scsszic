import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clapperboard,
  ExternalLink,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  MonitorPlay,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminVideos,
  useDeleteVideo,
  useUpdateVideoStatus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { DURATION_BUCKETS } from "@/lib/adminVideoForm";
import { ROUTES } from "@/routes/paths";
import type { AdminVideoSort, WatchVideo } from "@/types";

/**
 * Admin Videos CMS (Phase 9G) — the /admin/videos management page over the
 * REAL videos collection (the public Watch hub's data) through
 * GET /api/admin/videos (requireAdmin-gated).
 *
 * The publication lifecycle is the model's own (published/archived).
 * Archived videos are visible HERE (that is the point of the CMS) but
 * never on the public site — the public repository's published-only gate
 * is untouched. Public page links exist only for published rows
 * (/watch/:videoSlug — the existing renderer with the existing
 * VideoPlayer; there is no second playback system and no upload or
 * transcoding — media/source fields are existing references, spec §9).
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["published", "archived"] as const;

const SORT_OPTIONS: Array<{ value: AdminVideoSort; label: string }> = [
  { value: "published_desc", label: "Release date — newest first" },
  { value: "published_asc", label: "Release date — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
  { value: "duration_desc", label: "Duration — longest first" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "published") return { variant: "goldSoft" };
  return { variant: "navySoft", className: "border-line bg-surface text-muted" };
}

/** Video thumbnail — the existing media reference, gracefully degrading. */
function VideoThumb({ video }: { video: WatchVideo }) {
  return (
    <img
      src={video.thumbnail}
      alt=""
      loading="lazy"
      className="aspect-video w-16 shrink-0 rounded-lg border border-line object-cover"
    />
  );
}

interface VideoRowProps {
  video: WatchVideo;
  onDelete: (video: WatchVideo) => void;
}

/** One management row — desktop table cells. */
function VideoRowCells({ video }: { video: WatchVideo }) {
  const style = statusChipStyle(video.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <VideoThumb video={video} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-navy-900">
              {video.featured && (
                <Star size={12} aria-label="Featured video" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
              )}
              {video.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">/{video.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">{video.duration}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{video.category}</p>
      </td>
      <td className="px-4 py-3.5">
        {video.eventSlug ? (
          <Badge variant="navySoft" className="max-w-full">
            <span className="truncate">{video.eventSlug}</span>
          </Badge>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(video.publishedAt)}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(video.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, view (published), edit, delete. */
function VideoRowActions({ video, onDelete }: VideoRowProps) {
  const updateStatus = useUpdateVideoStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`video-status-${video.id}`}>
          Change status for {video.title}
        </label>
        <select
          id={`video-status-${video.id}`}
          value={video.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === video.status) return;
            updateStatus.mutate(
              { id: video.id, status: next as WatchVideo["status"] },
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

        {video.status === "published" && (
          <a
            href={ROUTES.videoDetail(video.slug)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public page for ${video.title}`}
            title="View public page"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.videos}/${video.id}/edit`}
          aria-label={`Edit ${video.title}`}
          title="Edit video"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(video)}
          aria-label={`Delete ${video.title}`}
          title="Delete video"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one video — same real fields, stacked layout. */
function VideoCard({ video, onDelete }: VideoRowProps) {
  const updateStatus = useUpdateVideoStatus();
  const style = statusChipStyle(video.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <VideoThumb video={video} />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-navy-900">
              {video.featured && (
                <Star size={12} aria-label="Featured video" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
              )}
              {video.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">/{video.slug}</p>
          </div>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(video.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Duration</dt>
          <dd className="mt-0.5 truncate text-ink">
            {video.duration} · {video.category}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Event</dt>
          <dd className="mt-0.5 truncate text-ink">{video.eventSlug ?? "—"}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Released</dt>
          <dd className="mt-0.5 truncate text-ink">{formatCardDate(video.publishedAt)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`video-status-m-${video.id}`}>
          Change status for {video.title}
        </label>
        <select
          id={`video-status-m-${video.id}`}
          value={video.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === video.status) return;
            updateStatus.mutate(
              { id: video.id, status: next as WatchVideo["status"] },
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
          {video.status === "published" && (
            <a
              href={ROUTES.videoDetail(video.slug)}
              target="_blank"
              rel="noreferrer"
              aria-label={`View public page for ${video.title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.videos}/${video.id}/edit`}
            aria-label={`Edit ${video.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(video)}
            aria-label={`Delete ${video.title}`}
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

/** Loading placeholder — no fabricated rows, matching the 9C–9F pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading videos" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminVideosPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminVideoSort>("published_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<WatchVideo | null>(null);

  const { data, isError, isFetching, refetch } = useAdminVideos({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    category,
    event,
    duration,
    sort,
  });
  const deleteVideo = useDeleteVideo();

  const hasFilters = Boolean(search || status || category || event || duration);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, category, event, duration, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
    setCategory(undefined);
    setEvent(undefined);
    setDuration(undefined);
  }

  const videos = data?.data ?? [];
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
            Videos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Manage the Watch media hub. Published videos are public
            immediately; archived videos stay here for record-keeping and
            never appear publicly. Sources reference existing media — there
            is no upload or transcoding pipeline yet.
          </p>
        </div>
        <Button to={`${ROUTES.admin.videos}/new`} variant="navy" className="shrink-0">
          <MonitorPlay size={16} aria-hidden="true" />
          Create Video
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load videos"
            description="We couldn't load the videos from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-videos-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-videos-filters-heading" className="sr-only">
              Filter videos
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-videos-search"
                  label="Search videos"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, description, speaker…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-videos-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-videos-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminVideoSort)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:w-56">
                <label
                  htmlFor="admin-videos-event"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Event
                </label>
                <select
                  id="admin-videos-event"
                  value={event ?? ""}
                  onChange={(changeEvent) => setEvent(changeEvent.target.value || undefined)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  <option value="">All events</option>
                  {(meta?.facets.events ?? []).map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.value} ({entry.n})
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:w-44">
                <label
                  htmlFor="admin-videos-duration"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Duration
                </label>
                <select
                  id="admin-videos-duration"
                  value={duration ?? ""}
                  onChange={(changeEvent) => setDuration(changeEvent.target.value || undefined)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  <option value="">All</option>
                  {DURATION_BUCKETS.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucket}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Chip filters get their own full-width row — the four controls
                above already fill the xl row, and starving the chips below
                their min-content caused 1440px overflow (QA 9F precedent). */}
            <div className="mt-4 border-t border-line pt-4">
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
                />
            </div>
          </section>

          {/* ---------- Results ---------- */}
          {!data ? (
            <div className="mt-6">
              <TableSkeleton />
            </div>
          ) : videos.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={Clapperboard}
                  title="No matching videos"
                  description="No videos match the current search and filters. Adjust them, or reset to see every video."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Clapperboard}
                  title="No videos yet"
                  description="The Watch hub lives here once populated. Create the first video and it will appear on the public Watch page immediately (unless archived)."
                >
                  <Button to={`${ROUTES.admin.videos}/new`} variant="navy">
                    <MonitorPlay size={16} aria-hidden="true" />
                    Create Video
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> videos
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
                  <caption className="sr-only">Videos management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[34%] px-4 py-3">Video</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Duration</th>
                      <th scope="col" className="w-[18%] px-4 py-3">Event</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Released</th>
                      <th scope="col" className="w-[10%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[12%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {videos.map((video) => (
                      <tr key={video.id} className="transition-colors hover:bg-navy-50/60">
                        <VideoRowCells video={video} />
                        <VideoRowActions video={video} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Videos pagination"
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
        kind="video"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.title } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteVideo.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteVideo.isPending}
        error={deleteVideo.isError ? deleteVideo.error?.message ?? null : null}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Images,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  ImagePlus,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminGallery,
  useDeleteAlbum,
  useUpdateAlbumStatus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { AdminGallerySort, GalleryAlbum } from "@/types";

/**
 * Admin Gallery CMS (Phase 9G) — the /admin/gallery management page over
 * the REAL gallery_albums collection through GET /api/admin/gallery
 * (requireAdmin-gated).
 *
 * The publication lifecycle is the model's own (published/archived).
 * Archived albums are visible HERE (that is the point of the CMS) but
 * never on the public site — the public repository's published-only gate
 * is untouched. Public page links exist only for published rows
 * (/gallery/:albumSlug — the existing renderer; there is no second album
 * rendering system). Thumbnails are the albums' existing cover media
 * references — no upload infrastructure is involved (spec §7).
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["published", "archived"] as const;

const SORT_OPTIONS: Array<{ value: AdminGallerySort; label: string }> = [
  { value: "date_desc", label: "Capture date — newest first" },
  { value: "date_asc", label: "Capture date — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
  { value: "photos_desc", label: "Photo count — most first" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "published") return { variant: "goldSoft" };
  return { variant: "navySoft", className: "border-line bg-surface text-muted" };
}

/** Album cover thumbnail — the existing media reference, gracefully degrading. */
function AlbumThumb({ album }: { album: GalleryAlbum }) {
  return (
    <img
      src={album.coverImage}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-lg border border-line object-cover"
    />
  );
}

interface AlbumRowProps {
  album: GalleryAlbum;
  onDelete: (album: GalleryAlbum) => void;
}

/** One management row — desktop table cells. */
function AlbumRowCells({ album }: { album: GalleryAlbum }) {
  const style = statusChipStyle(album.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <AlbumThumb album={album} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-navy-900">
              {album.featured && (
                <Star size={12} aria-label="Featured album" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
              )}
              {album.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">/{album.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">
          {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{album.category}</p>
      </td>
      <td className="px-4 py-3.5">
        {album.eventSlug ? (
          <Badge variant="navySoft" className="max-w-full">
            <span className="truncate">{album.eventSlug}</span>
          </Badge>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(album.date)}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(album.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, view (published), edit, delete. */
function AlbumRowActions({ album, onDelete }: AlbumRowProps) {
  const updateStatus = useUpdateAlbumStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`album-status-${album.id}`}>
          Change status for {album.title}
        </label>
        <select
          id={`album-status-${album.id}`}
          value={album.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === album.status) return;
            updateStatus.mutate(
              { id: album.id, status: next as GalleryAlbum["status"] },
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

        {album.status === "published" && (
          <a
            href={ROUTES.albumDetail(album.slug)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public page for ${album.title}`}
            title="View public page"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.gallery}/${album.id}/edit`}
          aria-label={`Edit ${album.title}`}
          title="Edit album"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(album)}
          aria-label={`Delete ${album.title}`}
          title="Delete album"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one album — same real fields, stacked layout. */
function AlbumCard({ album, onDelete }: AlbumRowProps) {
  const updateStatus = useUpdateAlbumStatus();
  const style = statusChipStyle(album.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AlbumThumb album={album} />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-navy-900">
              {album.featured && (
                <Star size={12} aria-label="Featured album" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
              )}
              {album.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">/{album.slug}</p>
          </div>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(album.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Photos</dt>
          <dd className="mt-0.5 truncate text-ink">
            {album.photoCount} · {album.category}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Event</dt>
          <dd className="mt-0.5 truncate text-ink">{album.eventSlug ?? "—"}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Captured</dt>
          <dd className="mt-0.5 truncate text-ink">{formatCardDate(album.date)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`album-status-m-${album.id}`}>
          Change status for {album.title}
        </label>
        <select
          id={`album-status-m-${album.id}`}
          value={album.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === album.status) return;
            updateStatus.mutate(
              { id: album.id, status: next as GalleryAlbum["status"] },
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
          {album.status === "published" && (
            <a
              href={ROUTES.albumDetail(album.slug)}
              target="_blank"
              rel="noreferrer"
              aria-label={`View public page for ${album.title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.gallery}/${album.id}/edit`}
            aria-label={`Edit ${album.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(album)}
            aria-label={`Delete ${album.title}`}
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
    <div role="status" aria-label="Loading albums" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminGalleryPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<string | undefined>(undefined);
  const [featured, setFeatured] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminGallerySort>("date_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<GalleryAlbum | null>(null);

  const { data, isError, isFetching, refetch } = useAdminGallery({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    category,
    event,
    featured: featured as "true" | "false" | undefined,
    sort,
  });
  const deleteAlbum = useDeleteAlbum();

  const hasFilters = Boolean(search || status || category || event || featured);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, category, event, featured, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
    setCategory(undefined);
    setEvent(undefined);
    setFeatured(undefined);
  }

  const albums = data?.data ?? [];
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
            Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Curate the society's photo albums. Published albums appear on the
            public gallery; archived albums stay here for record-keeping and
            never appear publicly. Photos reference existing media — there is
            no upload pipeline yet.
          </p>
        </div>
        <Button to={`${ROUTES.admin.gallery}/new`} variant="navy" className="shrink-0">
          <ImagePlus size={16} aria-hidden="true" />
          Create Album
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load albums"
            description="We couldn't load the albums from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-gallery-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-gallery-filters-heading" className="sr-only">
              Filter albums
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-gallery-search"
                  label="Search albums"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, description, location…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-gallery-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-gallery-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminGallerySort)}
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
                  htmlFor="admin-gallery-event"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Event
                </label>
                <select
                  id="admin-gallery-event"
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
                  htmlFor="admin-gallery-featured"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Featured
                </label>
                <select
                  id="admin-gallery-featured"
                  value={featured ?? ""}
                  onChange={(changeEvent) => setFeatured(changeEvent.target.value || undefined)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  <option value="">All</option>
                  <option value="true">Featured</option>
                  <option value="false">Not featured</option>
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
          ) : albums.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={Images}
                  title="No matching albums"
                  description="No albums match the current search and filters. Adjust them, or reset to see every album."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Images}
                  title="No albums yet"
                  description="The society's photo archive lives here once populated. Create the first album and it will appear on the public gallery immediately (unless archived)."
                >
                  <Button to={`${ROUTES.admin.gallery}/new`} variant="navy">
                    <ImagePlus size={16} aria-hidden="true" />
                    Create Album
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> albums
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
                  <caption className="sr-only">Albums management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[32%] px-4 py-3">Album</th>
                      <th scope="col" className="w-[16%] px-4 py-3">Photos</th>
                      <th scope="col" className="w-[18%] px-4 py-3">Event</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Date</th>
                      <th scope="col" className="w-[10%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[12%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {albums.map((album) => (
                      <tr key={album.id} className="transition-colors hover:bg-navy-50/60">
                        <AlbumRowCells album={album} />
                        <AlbumRowActions album={album} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Albums pagination"
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
        kind="album"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.title } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteAlbum.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteAlbum.isPending}
        error={deleteAlbum.isError ? deleteAlbum.error?.message ?? null : null}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Newspaper,
  Pencil,
  Plus,
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
import {
  useAdminFeedPosts,
  useDeleteFeedPost,
  useUpdateFeedPostStatus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { AdminFeedSort, FeedPost } from "@/types";

/**
 * Admin Feed CMS (Phase 9F) — the /admin/feed management page over the
 * REAL feed_posts collection through GET /api/admin/feed
 * (requireAdmin-gated).
 *
 * The publication lifecycle is the model's own (published/archived).
 * Archived posts are visible HERE (that is the point of the CMS) but never
 * on the public feed — the public repository's published-only gate is
 * untouched. The feed has no per-post public detail page, so "View" links
 * point at the post's RELATED entity's existing public page (project /
 * event / blog) — real URLs only, never a fabricated feed detail route.
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["published", "archived"] as const;

const TYPE_LABELS: Record<string, string> = {
  announcement: "Announcement",
  project: "Project",
  event: "Event",
  article: "Article",
  community: "Community",
};

const SORT_OPTIONS: Array<{ value: AdminFeedSort; label: string }> = [
  { value: "published_desc", label: "Publication — newest first" },
  { value: "published_asc", label: "Publication — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "published") return { variant: "goldSoft" };
  return { variant: "navySoft", className: "border-line bg-surface text-muted" };
}

/** The existing public page this post links to — null when there is none. */
function relatedPublicUrl(post: FeedPost): string | null {
  if (post.projectSlug) return ROUTES.projectDetail(post.projectSlug);
  if (post.blogSlug) return ROUTES.blogDetail(post.blogSlug);
  if (post.eventSlug) return ROUTES.eventDetail(post.eventSlug);
  return null;
}

interface PostRowProps {
  post: FeedPost;
  onDelete: (post: FeedPost) => void;
}

/** One management row — desktop table cells. */
function PostRowCells({ post }: { post: FeedPost }) {
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">{post.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {post.authorName}
          {post.authorUsername ? ` (@${post.authorUsername})` : ""}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{TYPE_LABELS[post.type] ?? post.type}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm text-ink">{post.excerpt}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {post.projectSlug
            ? `Project: ${post.projectSlug}`
            : post.eventSlug
              ? `Event: ${post.eventSlug}`
              : post.blogSlug
                ? `Blog: ${post.blogSlug}`
                : "No linked content"}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(post.publishedAt)}</span>
        <span className="block truncate text-xs text-muted">
          {post.likes} likes · {post.comments} comments
        </span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={statusChipStyle(post.status).variant} className={statusChipStyle(post.status).className}>
          {formatStatus(post.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, related-entity view, edit, delete. */
function PostRowActions({ post, onDelete }: PostRowProps) {
  const updateStatus = useUpdateFeedPostStatus();
  const publicUrl = relatedPublicUrl(post);

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`feed-status-${post.id}`}>
          Change status for {post.title}
        </label>
        <select
          id={`feed-status-${post.id}`}
          value={post.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === post.status) return;
            updateStatus.mutate(
              { id: post.id, status: next as FeedPost["status"] },
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

        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`View related public page for ${post.title}`}
            title="View related public page"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.feed}/${post.id}/edit`}
          aria-label={`Edit ${post.title}`}
          title="Edit post"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(post)}
          aria-label={`Delete ${post.title}`}
          title="Delete post"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one post — same real fields, stacked layout. */
function PostCard({ post, onDelete }: PostRowProps) {
  const updateStatus = useUpdateFeedPostStatus();
  const publicUrl = relatedPublicUrl(post);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">{post.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {post.authorName}
            {post.authorUsername ? ` (@${post.authorUsername})` : ""}
          </p>
        </div>
        <Badge variant={statusChipStyle(post.status).variant} className={statusChipStyle(post.status).className}>
          {formatStatus(post.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Type</dt>
          <dd className="mt-0.5 truncate text-ink">{TYPE_LABELS[post.type] ?? post.type}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Published</dt>
          <dd className="mt-0.5 truncate text-ink">{formatCardDate(post.publishedAt)}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Related</dt>
          <dd className="mt-0.5 truncate text-ink">
            {post.projectSlug
              ? `Project: ${post.projectSlug}`
              : post.eventSlug
                ? `Event: ${post.eventSlug}`
                : post.blogSlug
                  ? `Blog: ${post.blogSlug}`
                  : "No linked content"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`feed-status-m-${post.id}`}>
          Change status for {post.title}
        </label>
        <select
          id={`feed-status-m-${post.id}`}
          value={post.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === post.status) return;
            updateStatus.mutate(
              { id: post.id, status: next as FeedPost["status"] },
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
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`View related public page for ${post.title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.feed}/${post.id}/edit`}
            aria-label={`Edit ${post.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(post)}
            aria-label={`Delete ${post.title}`}
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

/** Loading placeholder — no fabricated rows, matching the 9C–9E pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading feed posts" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminFeedPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [type, setType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [authorUsername, setAuthorUsername] = useState<string | undefined>(undefined);
  const [projectSlug, setProjectSlug] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminFeedSort>("published_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<FeedPost | null>(null);

  const { data, isError, isFetching, refetch } = useAdminFeedPosts({
    page,
    pageSize: PAGE_SIZE,
    search,
    type,
    status,
    authorUsername,
    projectSlug,
    sort,
  });
  const deleteFeedPost = useDeleteFeedPost();

  const hasFilters = Boolean(search || type || status || authorUsername || projectSlug);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, type, status, authorUsername, projectSlug, sort]);

  function clearFilters() {
    setSearchInput("");
    setType(undefined);
    setStatus(undefined);
    setAuthorUsername(undefined);
    setProjectSlug(undefined);
  }

  const posts = data?.data ?? [];
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
            Feed
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Moderate the community feed. Published posts appear on the public
            feed immediately; archived posts stay here for record-keeping and
            never appear publicly.
          </p>
        </div>
        <Button to={`${ROUTES.admin.feed}/new`} variant="navy" className="shrink-0">
          <Plus size={16} aria-hidden="true" />
          Create Post
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load feed posts"
            description="We couldn't load the feed posts from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-feed-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-feed-filters-heading" className="sr-only">
              Filter feed posts
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-feed-search"
                  label="Search posts"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, content, author…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-feed-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-feed-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminFeedSort)}
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
                  htmlFor="admin-feed-author"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Author
                </label>
                <select
                  id="admin-feed-author"
                  value={authorUsername ?? ""}
                  onChange={(changeEvent) => setAuthorUsername(changeEvent.target.value || undefined)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  <option value="">All authors</option>
                  {(meta?.facets.authors ?? []).map((author) => (
                    <option key={author.username} value={author.username}>
                      {author.name} ({author.n})
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:w-56">
                <label
                  htmlFor="admin-feed-project"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Project
                </label>
                <input
                  id="admin-feed-project"
                  type="text"
                  list="admin-feed-project-options"
                  value={projectSlug ?? ""}
                  onChange={(changeEvent) => setProjectSlug(changeEvent.target.value || undefined)}
                  placeholder="e.g. campus-connect"
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                />
                <datalist id="admin-feed-project-options">
                  {(meta?.facets.projects ?? []).map((entry) => (
                    <option key={entry.value} value={entry.value} />
                  ))}
                </datalist>
              </div>
            </div>
            {/* Chip filters get their own full-width row — the four controls
                above already fill the xl row, and starving the chips below
                their min-content caused 1440px overflow (QA 9F 8.6/15.b). */}
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
                          id: "type",
                          label: "Type",
                          options: [
                            "All",
                            ...meta.facets.types.map((entry) => TYPE_LABELS[entry.value] ?? entry.value),
                          ],
                        },
                      ]
                    : []),
                ]}
                values={{
                  status: status ? formatStatus(status) : "All",
                  type: type ? (TYPE_LABELS[type] ?? type) : "All",
                }}
                onToggle={(groupId, value) => {
                  if (groupId === "status") setStatus(value === "All" ? undefined : value.toLowerCase());
                  if (groupId === "type") {
                    const match = Object.entries(TYPE_LABELS).find(([, label]) => label === value);
                    setType(value === "All" || !match ? undefined : match[0]);
                  }
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
          ) : posts.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={Newspaper}
                  title="No matching posts"
                  description="No feed posts match the current search and filters. Adjust them, or reset to see every post."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Newspaper}
                  title="No posts yet"
                  description="The community feed lives here once populated. Publish the first post and it will appear on the public feed immediately."
                >
                  <Button to={`${ROUTES.admin.feed}/new`} variant="navy">
                    <Plus size={16} aria-hidden="true" />
                    Create Post
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> posts
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
                  <caption className="sr-only">Feed management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[26%] px-4 py-3">Post</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Type</th>
                      <th scope="col" className="w-[30%] px-4 py-3">Content</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Published</th>
                      <th scope="col" className="w-[10%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[8%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {posts.map((post) => (
                      <tr key={post.id} className="transition-colors hover:bg-navy-50/60">
                        <PostRowCells post={post} />
                        <PostRowActions post={post} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Feed pagination"
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
        kind="post"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.title } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteFeedPost.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteFeedPost.isPending}
        error={deleteFeedPost.isError ? deleteFeedPost.error?.message ?? null : null}
      />
    </div>
  );
}

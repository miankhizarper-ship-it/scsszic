import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  FileText,
  FilePlus2,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAdminBlogs, useDeleteBlog, useUpdateBlogStatus } from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { AdminBlogSort, Blog } from "@/types";

/**
 * Admin Blogs CMS (Phase 9D) — the /admin/blogs management page over the
 * REAL blogs collection through GET /api/admin/blogs (requireAdmin-gated).
 *
 * Draft and archived articles are visible HERE (that is the point of the
 * CMS) but never on the public site — the public repository's published-only
 * gate is untouched. View/preview links only exist for published articles,
 * whose public detail page (/blogs/:slug) is the existing renderer — there
 * is deliberately no second blog rendering system.
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["draft", "published", "archived"] as const;

const SORT_OPTIONS: Array<{ value: AdminBlogSort; label: string }> = [
  { value: "published_desc", label: "Publication — newest first" },
  { value: "published_asc", label: "Publication — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
  { value: "updated_desc", label: "Recently updated" },
];

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "published") return { variant: "goldSoft" };
  if (status === "archived") {
    return { variant: "navySoft", className: "border-line bg-surface text-muted" };
  }
  return { variant: "navySoft" };
}

interface BlogRowProps {
  blog: Blog;
  onDelete: (blog: Blog) => void;
}

/** One management row — desktop table cells. */
function BlogRowCells({ blog }: { blog: Blog }) {
  const style = statusChipStyle(blog.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {blog.featured && (
            <Star size={12} aria-label="Featured article" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
          )}
          {blog.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">/{blog.slug}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">{blog.author.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{blog.author.role}</p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{blog.category}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(blog.publishedAt)}</span>
        <span className="block truncate text-xs text-muted">{blog.readingTime} min read</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(blog.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, view (published only), edit, delete. */
function BlogRowActions({ blog, onDelete }: BlogRowProps) {
  const updateStatus = useUpdateBlogStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`blog-status-${blog.id}`}>
          Change status for {blog.title}
        </label>
        <select
          id={`blog-status-${blog.id}`}
          value={blog.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === blog.status) return;
            updateStatus.mutate(
              { id: blog.id, status: next as Blog["status"] },
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

        {blog.status === "published" && (
          <a
            href={`${ROUTES.blogs}/${blog.slug}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public page for ${blog.title}`}
            title="View public page"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.blogs}/${blog.id}/edit`}
          aria-label={`Edit ${blog.title}`}
          title="Edit blog"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(blog)}
          aria-label={`Delete ${blog.title}`}
          title="Delete blog"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one blog — same real fields, stacked layout. */
function BlogCard({ blog, onDelete }: BlogRowProps) {
  const updateStatus = useUpdateBlogStatus();
  const style = statusChipStyle(blog.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">{blog.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">/{blog.slug}</p>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(blog.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Author</dt>
          <dd className="mt-0.5 truncate text-ink">{blog.author.name}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Category</dt>
          <dd className="mt-0.5 truncate text-ink">{blog.category}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Published</dt>
          <dd className="mt-0.5 truncate text-ink">
            {formatCardDate(blog.publishedAt)} · {blog.readingTime} min read
            {blog.featured ? " · Featured" : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`blog-status-m-${blog.id}`}>
          Change status for {blog.title}
        </label>
        <select
          id={`blog-status-m-${blog.id}`}
          value={blog.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === blog.status) return;
            updateStatus.mutate(
              { id: blog.id, status: next as Blog["status"] },
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
          {blog.status === "published" && (
            <a
              href={`${ROUTES.blogs}/${blog.slug}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`View public page for ${blog.title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.blogs}/${blog.id}/edit`}
            aria-label={`Edit ${blog.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(blog)}
            aria-label={`Delete ${blog.title}`}
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

/** Loading placeholder — no fabricated rows, matching the 9C pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading blogs" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminBlogsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [authorId, setAuthorId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminBlogSort>("published_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Blog | null>(null);

  const { data, isError, isFetching, refetch } = useAdminBlogs({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    category,
    authorId,
    sort,
  });
  const deleteBlog = useDeleteBlog();

  const hasFilters = Boolean(search || status || category || authorId);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, category, authorId, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
    setCategory(undefined);
    setAuthorId(undefined);
  }

  const blogs = data?.data ?? [];
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
            Blogs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Write, publish, and archive the society's articles. Drafts and
            archived posts stay private — only published articles appear on
            the public blogs page.
          </p>
        </div>
        <Button to={`${ROUTES.admin.blogs}/new`} variant="navy" className="shrink-0">
          <FilePlus2 size={16} aria-hidden="true" />
          Create Blog
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load blogs"
            description="We couldn't load the blogs from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-blogs-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-blogs-filters-heading" className="sr-only">
              Filter blogs
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-blogs-search"
                  label="Search blogs"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, author, tags…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-blogs-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-blogs-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminBlogSort)}
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
                  htmlFor="admin-blogs-author"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Author
                </label>
                <select
                  id="admin-blogs-author"
                  value={authorId ?? ""}
                  onChange={(changeEvent) => setAuthorId(changeEvent.target.value || undefined)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  <option value="">All authors</option>
                  {(meta?.facets.authors ?? []).map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name} ({author.n})
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
                />
              </div>
            </div>
          </section>

          {/* ---------- Results ---------- */}
          {!data ? (
            <div className="mt-6">
              <TableSkeleton />
            </div>
          ) : blogs.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={FileText}
                  title="No matching articles"
                  description="No articles match the current search and filters. Adjust them, or reset to see every article."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No articles yet"
                  description="The society's articles live here once written. Publish the first piece and it will appear on the public blogs page immediately."
                >
                  <Button to={`${ROUTES.admin.blogs}/new`} variant="navy">
                    <FilePlus2 size={16} aria-hidden="true" />
                    Create Blog
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> articles
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
                  <caption className="sr-only">Blogs management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[28%] px-4 py-3 xl:w-[26%]">Article</th>
                      <th scope="col" className="w-[16%] px-4 py-3 xl:w-[15%]">Author</th>
                      <th scope="col" className="w-[14%] px-4 py-3 xl:w-[13%]">Category</th>
                      <th scope="col" className="w-[13%] px-4 py-3 xl:w-[12%]">Published</th>
                      <th scope="col" className="w-[13%] px-4 py-3 xl:w-[12%]">Status</th>
                      <th scope="col" className="w-[16%] px-4 py-3 text-right xl:w-[22%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {blogs.map((blog) => (
                      <tr key={blog.id} className="transition-colors hover:bg-navy-50/60">
                        <BlogRowCells blog={blog} />
                        <BlogRowActions blog={blog} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {blogs.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Blogs pagination"
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
        kind="blog"
        event={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteBlog.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteBlog.isPending}
        error={deleteBlog.isError ? deleteBlog.error?.message ?? null : null}
      />
    </div>
  );
}

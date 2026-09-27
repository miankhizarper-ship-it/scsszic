import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  FolderKanban,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  FolderPlus,
} from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  useAdminProjects,
  useDeleteProject,
  useUpdateProjectStatus,
} from "@/hooks/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { AdminProjectSort, Project } from "@/types";

/**
 * Admin Projects CMS (Phase 9F) — the /admin/projects management page over
 * the REAL projects collection through GET /api/admin/projects
 * (requireAdmin-gated).
 *
 * The showcase lifecycle is the model's own (active/completed/archived).
 * Archived projects are visible HERE (that is the point of the CMS) but
 * never on the public site — the public repository's active+completed gate
 * is untouched. Public page links exist only for non-archived rows
 * (/projects/:slug — the existing renderer; there is no second project
 * rendering system).
 */

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["active", "completed", "archived"] as const;

const SORT_OPTIONS: Array<{ value: AdminProjectSort; label: string }> = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "started_desc", label: "Start date — newest first" },
  { value: "started_asc", label: "Start date — oldest first" },
  { value: "title_asc", label: "Title — A to Z" },
  { value: "title_desc", label: "Title — Z to A" },
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

interface ProjectRowProps {
  project: Project;
  onDelete: (project: Project) => void;
}

/** One management row — desktop table cells. */
function ProjectRowCells({ project }: { project: Project }) {
  const style = statusChipStyle(project.status);
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {project.featured && (
            <Star size={12} aria-label="Featured project" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
          )}
          {project.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">/{project.slug}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="truncate text-sm font-semibold text-ink">{project.ownerUsername}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {project.memberUsernames.length} team member{project.memberUsernames.length === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant="navySoft">{project.category}</Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(project.startedAt)}</span>
        <span className="block truncate text-xs text-muted">Updated {formatCardDate(project.updatedAt)}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(project.status)}
        </Badge>
      </td>
    </>
  );
}

/** Row action cluster — status select, view (non-archived), edit, delete. */
function ProjectRowActions({ project, onDelete }: ProjectRowProps) {
  const updateStatus = useUpdateProjectStatus();

  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <label className="sr-only" htmlFor={`project-status-${project.id}`}>
          Change status for {project.title}
        </label>
        <select
          id={`project-status-${project.id}`}
          value={project.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === project.status) return;
            updateStatus.mutate(
              { id: project.id, status: next as Project["status"] },
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

        {project.status !== "archived" && (
          <a
            href={ROUTES.projectDetail(project.slug)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View public page for ${project.title}`}
            title="View public page"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}

        <Link
          to={`${ROUTES.admin.projects}/${project.id}/edit`}
          aria-label={`Edit ${project.title}`}
          title="Edit project"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(project)}
          aria-label={`Delete ${project.title}`}
          title="Delete project"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one project — same real fields, stacked layout. */
function ProjectCard({ project, onDelete }: ProjectRowProps) {
  const updateStatus = useUpdateProjectStatus();
  const style = statusChipStyle(project.status);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">
            {project.featured && (
              <Star size={12} aria-label="Featured project" className="mr-1.5 mb-0.5 inline fill-gold-500 text-gold-500" />
            )}
            {project.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">/{project.slug}</p>
        </div>
        <Badge variant={style.variant} className={style.className}>
          {formatStatus(project.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Owner</dt>
          <dd className="mt-0.5 truncate text-ink">{project.ownerUsername}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Category</dt>
          <dd className="mt-0.5 truncate text-ink">{project.category}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Team & dates</dt>
          <dd className="mt-0.5 truncate text-ink">
            {project.memberUsernames.length} member{project.memberUsernames.length === 1 ? "" : "s"} ·{" "}
            {formatCardDate(project.startedAt)} · updated {formatCardDate(project.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="sr-only" htmlFor={`project-status-m-${project.id}`}>
          Change status for {project.title}
        </label>
        <select
          id={`project-status-m-${project.id}`}
          value={project.status}
          disabled={updateStatus.isPending}
          onChange={(changeEvent) => {
            const next = changeEvent.target.value;
            if (next === project.status) return;
            updateStatus.mutate(
              { id: project.id, status: next as Project["status"] },
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
          {project.status !== "archived" && (
            <a
              href={ROUTES.projectDetail(project.slug)}
              target="_blank"
              rel="noreferrer"
              aria-label={`View public page for ${project.title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View
            </a>
          )}
          <Link
            to={`${ROUTES.admin.projects}/${project.id}/edit`}
            aria-label={`Edit ${project.title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(project)}
            aria-label={`Delete ${project.title}`}
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
    <div role="status" aria-label="Loading projects" className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminProjectsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<string | undefined>(undefined);
  const [technology, setTechnology] = useState("");
  const [sort, setSort] = useState<AdminProjectSort>("updated_desc");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const { data, isError, isFetching, refetch } = useAdminProjects({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    category,
    event,
    technology: technology || undefined,
    sort,
  });
  const deleteProject = useDeleteProject();

  const hasFilters = Boolean(search || status || category || event || technology);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, status, category, event, technology, sort]);

  function clearFilters() {
    setSearchInput("");
    setStatus(undefined);
    setCategory(undefined);
    setEvent(undefined);
    setTechnology("");
  }

  const projects = data?.data ?? [];
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
            Projects
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Review the student project showcase. Active and completed builds
            are public; archived projects stay here for record-keeping and
            never appear on the public site.
          </p>
        </div>
        <Button to={`${ROUTES.admin.projects}/new`} variant="navy" className="shrink-0">
          <FolderPlus size={16} aria-hidden="true" />
          Create Project
        </Button>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load projects"
            description="We couldn't load the projects from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-projects-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-projects-filters-heading" className="sr-only">
              Filter projects
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-projects-search"
                  label="Search projects"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search title, tech, tags…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-projects-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-projects-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminProjectSort)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:w-44">
                <label
                  htmlFor="admin-projects-technology"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Technology
                </label>
                <input
                  id="admin-projects-technology"
                  type="text"
                  value={technology}
                  onChange={(changeEvent) => setTechnology(changeEvent.target.value)}
                  placeholder="e.g. React"
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                />
              </div>
              <div className="xl:w-56">
                <label
                  htmlFor="admin-projects-event"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Event
                </label>
                <select
                  id="admin-projects-event"
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
            </div>
            {/* Chip filters get their own full-width row — the four controls
                above already fill the xl row, and starving the chips below
                their min-content caused 1440px overflow (QA 9F 2.9/15.a). */}
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
          ) : projects.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No matching projects"
                  description="No projects match the current search and filters. Adjust them, or reset to see every project."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="The student showcase lives here once populated. Create the first project and it will appear on the public projects page immediately."
                >
                  <Button to={`${ROUTES.admin.projects}/new`} variant="navy">
                    <FolderPlus size={16} aria-hidden="true" />
                    Create Project
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> projects
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
                  <caption className="sr-only">Projects management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[26%] px-4 py-3">Project</th>
                      <th scope="col" className="w-[18%] px-4 py-3">Team</th>
                      <th scope="col" className="w-[14%] px-4 py-3">Category</th>
                      <th scope="col" className="w-[16%] px-4 py-3">Dates</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[14%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {projects.map((project) => (
                      <tr key={project.id} className="transition-colors hover:bg-navy-50/60">
                        <ProjectRowCells project={project} />
                        <ProjectRowActions project={project} onDelete={setPendingDelete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} onDelete={setPendingDelete} />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Projects pagination"
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
        kind="project"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.title } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteProject.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteProject.isPending}
        error={deleteProject.isError ? deleteProject.error?.message ?? null : null}
      />
    </div>
  );
}

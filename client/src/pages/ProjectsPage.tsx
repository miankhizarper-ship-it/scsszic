import { useMemo, useState } from "react";
import { FolderGit2, SearchX, Users } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useProjects } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { hasActiveFilters } from "@/lib/projectSearch";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * ProjectsPage — the student-built project showcase (/projects).
 *
 * Server-side search + category + technology + status filtering with facets
 * in meta (categories, technologies, statuses, contributors — hero stats
 * and filter rows all derive from ONE request). Archived builds never
 * leave the database (spec §13).
 */
export default function ProjectsPage() {
  usePageMetadata({
    title: buildPageTitle("Projects"),
    description:
      "Explore projects built by the Society of Computer Science at SZIC — student-built apps, research prototypes, and society tooling.",
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [technology, setTechnology] = useState("");
  const [status, setStatus] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, category, technology, status }),
    [debouncedQuery, category, technology, status],
  );

  const projectsQuery = useProjects(filters);
  const projects = projectsQuery.data?.data ?? [];
  const facets = projectsQuery.data?.meta.facets;
  const total = facets?.total ?? 0;

  const categories = ((facets?.categories ?? []) as Array<{ value?: string }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const technologies = ((facets?.technologies ?? []) as Array<{ value?: string }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const statuses = ((facets?.statuses ?? []) as Array<{ value?: string; n?: number }>).filter(
    (entry) => entry.value === "active" || entry.value === "completed",
  );
  const contributors = ((facets?.contributors ?? []) as Array<{ value?: string }>).length;

  const filtersActive = hasActiveFilters(filters);
  const showEmpty = !projectsQuery.isPending && !projectsQuery.isError && projects.length === 0;

  return (
    <>
      <PageHero
        id="projects-heading"
        eyebrow="Project Showcase"
        title={
          <>
            Built by members,{" "}
            <span className="text-gold-400">shipped together</span>.
          </>
        }
        description="Hackathon winners, society tooling, and research prototypes — every project here started as an idea and a team willing to figure it out."
      >
        <dl className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: String(total), label: "Public builds" },
            { value: String(categories.length), label: "Categories" },
            { value: String(contributors), label: "Contributors" },
            {
              value: String(statuses.find((s) => s.value === "active")?.n ?? 0),
              label: "In development",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-4">
              <dt className="order-2 mt-1 block text-[11px] font-medium uppercase tracking-wider text-slate-300">
                {stat.label}
              </dt>
              <dd className="font-display text-2xl font-extrabold text-gold-400">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <section aria-label="Project showcase" className="bg-surface py-12 lg:py-16">
        <Container>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <SearchInput
              id="project-search"
              value={query}
              onChange={setQuery}
              placeholder="Search projects by title, tagline, technology, or tag…"
              label="Search projects"
              className="max-w-xl"
            />

            <div className="mt-5 border-t border-line pt-5">
              <FilterBar
                groups={[
                  { id: "category", label: "Category", options: categories },
                  { id: "technology", label: "Tech", options: technologies },
                  { id: "status", label: "Status", options: ["active", "completed"] },
                ]}
                getOptionLabel={(group, option) =>
                  group === "status"
                    ? option === "active"
                      ? "In Development"
                      : "Shipped"
                    : option
                }
                values={{ category: category || "All", technology: technology || "All", status: status || "All" }}
                onToggle={(groupId, value) => {
                  const next = value === "All" ? "" : value;
                  if (groupId === "category") setCategory(next);
                  if (groupId === "technology") setTechnology(next);
                  if (groupId === "status") setStatus(next);
                }}
                onClear={() => {
                  setQuery("");
                  setCategory("");
                  setTechnology("");
                  setStatus("");
                }}
              />
            </div>

            <p className="mt-5 border-t border-line pt-4 text-sm text-muted" aria-live="polite">
              {projectsQuery.isPending
                ? "Loading projects…"
                : projectsQuery.isError
                  ? "The showcase is temporarily unavailable."
                  : `${projects.length} ${projects.length === 1 ? "project" : "projects"}${
                      filtersActive ? " matching your filters" : ""
                    }`}
            </p>
          </div>

          {projectsQuery.isPending && (
            <CollectionLoading rows={6} className="mt-10" label="Loading projects…" />
          )}

          {projectsQuery.isError && (
            <ErrorState
              title="The showcase couldn't load"
              description="Projects are temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void projectsQuery.refetch()}
              className="mt-10 border-solid"
            />
          )}

          {showEmpty && (
            <EmptyState
              icon={SearchX}
              title="No projects match those filters"
              description="Try a different search term, or reset the filters to browse the full showcase."
              className="mt-10"
            >
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("");
                    setTechnology("");
                    setStatus("");
                  }}
                  className="font-display text-sm font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition-colors hover:text-gold-600"
                >
                  Clear filters
                </button>
              )}
            </EmptyState>
          )}

          {projects.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} className="h-full" />
              ))}
            </div>
          )}
        </Container>
      </section>

      <CTASection
        id="projects-cta"
        eyebrow="Build The Next One"
        title="Every project here started as an idea"
        description="Project teams form at workshops, hackathons, and study circles — no experience required, just a willingness to figure it out together. Bring your idea or adopt one."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "See Upcoming Events", to: ROUTES.events }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <FolderGit2 size={13} aria-hidden="true" />
            <Users size={13} aria-hidden="true" className="sr-only" />
            Demo showcase — member submissions arrive with the community platform phase.
          </span>
        }
      />
    </>
  );
}

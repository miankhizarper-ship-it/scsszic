import { ProjectCard } from "@/components/projects/ProjectCard";
import type { Project } from "@/types";

interface RelatedProjectsProps {
  projects: Project[];
  className?: string;
}

/**
 * RelatedProjects — renders the pre-selected related projects for a detail
 * page (the API does the scoring; this is presentational only).
 */
export function RelatedProjects({ projects, className }: RelatedProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <section aria-label="Related projects" className={className}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              Keep exploring
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              Related projects
            </h2>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} className="h-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

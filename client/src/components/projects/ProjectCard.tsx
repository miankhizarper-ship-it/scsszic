import { ArrowRight, FolderGit2 } from "lucide-react";
import { Link } from "react-router-dom";

import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  className?: string;
}

/**
 * ProjectCard — showcase card for /projects (and related rails).
 * Cover, status + category badges, tagline, tech stack, and team size.
 */
export function ProjectCard({ project, className }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
        className,
      )}
    >
      {/* ---------- Cover ---------- */}
      <div className="relative overflow-hidden">
        <img
          src={project.coverImage}
          alt={project.coverImageAlt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ProjectStatusBadge status={project.status} />
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">
          {project.category}
        </p>
        <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-navy-900">
          {project.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {project.tagline}
        </p>

        {/* ---------- Tech stack ---------- */}
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies used">
          {project.technologies.slice(0, 4).map((tech) => (
            <li
              key={tech}
              className="rounded-md border border-navy-100 bg-surface px-2 py-0.5 text-[11px] font-semibold text-navy-800"
            >
              {tech}
            </li>
          ))}
          {project.technologies.length > 4 && (
            <li className="rounded-md border border-dashed border-line px-2 py-0.5 text-[11px] font-medium text-muted">
              +{project.technologies.length - 4}
            </li>
          )}
        </ul>

        {/* ---------- Meta ---------- */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <FolderGit2 size={13} aria-hidden="true" className="shrink-0 text-gold-600" />
            <span className="truncate">
              {project.memberUsernames.length}{" "}
              {project.memberUsernames.length === 1 ? "builder" : "builders"}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-navy-900 transition-colors group-hover:text-gold-600">
            View project
            <ArrowRight
              size={13}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

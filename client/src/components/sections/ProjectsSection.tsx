import { useQuery } from "@tanstack/react-query";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { projectService } from "@/services/projectService";
import { ROUTES } from "@/routes/paths";

/**
 * ProjectsSection (Task 26) — the society's REAL work on the home page:
 * featured projects from the Projects showcase, falling back to the
 * newest entries when nothing is starred. Hides itself while loading and
 * when the showcase is empty — like the other data-driven home sections.
 */
export function ProjectsSection() {
  const projectsQuery = useQuery({
    queryKey: ["projects", "homePreview"],
    queryFn: async () => {
      const featured = await projectService.getFeaturedProjects(3);
      if (featured.length >= 3) return featured;
      // Top the row up with the newest entries so the band never shows a
      // lone card while the showcase has more to offer.
      const latest = (await projectService.listProjects()).data;
      const seen = new Set(featured.map((project) => project.id));
      return [...featured, ...latest.filter((project) => !seen.has(project.id))].slice(0, 3);
    },
    staleTime: 60_000,
  });

  const projects = projectsQuery.data;

  if (projectsQuery.isPending || projectsQuery.isError || !projects || projects.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="projects-preview-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="projects-preview-heading"
          label="Student Projects"
          title="Built by members, shipped for real"
          description="From study tools to campus platforms — a look at what SCS members design, argue over, and ship together."
          action={{ label: "Explore all projects", to: ROUTES.projects }}
        />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Reveal key={project.id} delay={(index % 3) * 0.08} className="h-full">
              <li className="h-full">
                <ProjectCard project={project} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

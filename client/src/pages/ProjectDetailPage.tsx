import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  FolderGit2,
  Github,
  Globe,
  Info,
  RefreshCw,
  SearchX,
  Users,
  Wrench,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { RelatedProjects } from "@/components/projects/RelatedProjects";
import { CTASection } from "@/components/sections/CTASection";
import { useEvent, useMembersByUsernames, useProject, useRelatedProjects } from "@/hooks/content";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * ProjectDetailPage — the project experience (/projects/:projectSlug).
 *
 * Order: Breadcrumb (Projects → Project) → Hero (cover, category, title,
 * tagline, status, technologies) → Overview → Team → Timeline + related
 * event + links → Related projects → CTA (spec §17).
 *
 * Cross-references resolve through the member and event APIs so a link is
 * only ever rendered when the target actually exists (the team roster uses
 * ONE batched members request); repository/live links render only when the
 * data provides real URLs (the demo dataset intentionally omits them — no
 * invented destinations).
 *
 * Phase 8: the slug lookup runs against MongoDB through the API, so
 * archived projects and unknown slugs both resolve to the same Not Found
 * state (spec §30).
 */
export default function ProjectDetailPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const { data: project, isPending, isError, refetch } = useProject(projectSlug);

  /* Cross-reference hooks stay unconditional — the early returns below
     come after them. */
  const teamQuery = useMembersByUsernames(project?.memberUsernames ?? []);
  const eventQuery = useEvent(project?.eventSlug);
  const related = useRelatedProjects(project?.slug);

  usePageMetadata({
    title: project
      ? `${project.title} | Society of Computer Science`
      : "Project Not Found | Society of Computer Science",
    description: project
      ? `${project.title} — ${project.tagline} A ${project.category.toLowerCase()} project by the Society of Computer Science community.`
      : "Student-built projects from the Society of Computer Science community at SZIC.",
  });

  if (isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading project…"
      />
    );
  }

  if (isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this project right now"
            description="The project details are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Project Not Found"
            description="This project doesn't exist or may have been archived. Browse the showcase for the projects that are currently published."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.projects} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Projects
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  /* Team roster: one batched lookup for every username on the roster —
     members missing from the public directory (archived) drop out. */
  const team = teamQuery.data ?? [];
  const event = eventQuery.data;

  const timeline: [string, string][] = [
    ["Started", formatDateLong(project.startedAt)],
    ["Last updated", formatDateLong(project.updatedAt)],
  ];

  return (
    <>
      {/* ---------- Project header ---------- */}
      <section aria-labelledby="project-heading" className="bg-surface">
        <div aria-hidden="true" className="gold-hairline h-px w-full" />

        <Container className="py-10 sm:py-12 lg:py-14">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li>
                <Link
                  to={ROUTES.projects}
                  className="font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Projects
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted">
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="truncate text-muted">
                {project.title}
              </li>
            </ol>
          </nav>

          <Reveal className="mt-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <ProjectStatusBadge status={project.status} />
              <Badge variant="solidGold">{project.category}</Badge>
            </div>

            <h1
              id="project-heading"
              className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-navy-900 text-balance sm:text-4xl lg:text-[2.6rem]"
            >
              {project.title}
            </h1>

            <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-gold-700">
              {project.tagline}
            </p>

            {/* Cover */}
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-line shadow-sm">
              <img
                src={project.coverImage}
                alt={project.coverImageAlt}
                width={1600}
                height={900}
                loading="eager"
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/25 via-transparent to-transparent"
              />
            </div>

            {/* Technology stack */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Technology stack
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Technologies used">
                {project.technologies.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </div>

            {/* Demo disclaimer */}
            <p className="mt-6 flex max-w-3xl items-start gap-2 text-xs leading-relaxed text-muted">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                Demo note: this project page shows fictional demo content created to
                design the showcase — the project, its team, and its story are not real.
              </span>
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Overview + sidebar ---------- */}
      <section aria-label="Project overview" className="border-t border-line bg-white py-12 lg:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
            {/* Overview */}
            <div className="min-w-0">
              <Reveal>
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
                  <FolderGit2 size={18} aria-hidden="true" className="text-gold-600" />
                  Overview
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {project.description.split("\n\n").map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="text-[15px] leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Reveal>

              {/* Tags */}
              <Reveal delay={0.05} className="mt-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Tags
                </h2>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Project tags">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md border border-dashed border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* Team */}
              <Reveal delay={0.1} className="mt-10">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
                  <Users size={18} aria-hidden="true" className="text-gold-600" />
                  Team
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Open a member card to visit the profile.
                </p>

                <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {team.map((member) => {
                    const isOwner = member.username === project.ownerUsername;
                    return (
                      <li key={member.username}>
                        <Link
                          to={ROUTES.profile(member.username)}
                          className="group flex h-full items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                        >
                          <span className="relative shrink-0">
                            <span
                              aria-hidden="true"
                              className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold-500/25 to-navy-300/20"
                            />
                            <Avatar
                              src={member.avatar}
                              alt={member.avatarAlt ?? `Portrait placeholder for ${member.name}`}
                              initials={member.initials}
                              size={48}
                              className="relative ring-2 ring-white"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-sm font-semibold text-navy-900 transition-colors group-hover:text-navy-700">
                                {member.name}
                              </span>
                              {isOwner && <Badge variant="goldSoft">Lead</Badge>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-gold-700">
                              {member.role}
                              {member.company ? ` · ${member.company}` : ""}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                              @{member.username}
                            </span>
                          </span>
                          <ArrowRight
                            size={15}
                            aria-hidden="true"
                            className="shrink-0 text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold-600"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            </div>

            {/* Sidebar: timeline, event, links */}
            <aside className="min-w-0">
              <Reveal delay={0.05} className="rounded-xl border border-line bg-surface p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                  <CalendarDays size={16} aria-hidden="true" className="text-gold-600" />
                  Timeline
                </h2>
                <dl className="mt-4 divide-y divide-line">
                  {([
                    ...timeline,
                    [
                      "Status",
                      project.status === "active"
                        ? "In development"
                        : project.status === "completed"
                          ? "Shipped"
                          : "Archived",
                    ],
                    ["Category", project.category],
                  ] as [string, string][]).map(([term, detail]) => (
                    <div key={term} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">
                        {term}
                      </dt>
                      <dd className="min-w-0 truncate text-right text-sm font-medium text-navy-900">
                        {detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              {/* Related event — only when the linked event actually exists */}
              {event && (
                <Reveal delay={0.1} className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                    <CalendarDays size={16} aria-hidden="true" className="text-gold-600" />
                    Born at an event
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    This project started at a society event — explore the full program,
                    speakers, and gallery.
                  </p>
                  <Link
                    to={ROUTES.eventDetail(event.slug)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <span className="min-w-0 truncate">{event.title}</span>
                    <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
                  </Link>
                </Reveal>
              )}

              {/* Links — rendered only when the data provides real URLs */}
              {(project.repositoryUrl || project.liveUrl) && (
                <Reveal delay={0.15} className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                    <Github size={16} aria-hidden="true" className="text-gold-600" />
                    Links
                  </h2>
                  <div className="mt-4 flex flex-col gap-2.5">
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Github size={15} aria-hidden="true" />
                        Source repository
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Globe size={15} aria-hidden="true" />
                        Live deployment
                      </a>
                    )}
                  </div>
                </Reveal>
              )}

              {/* More from the builders */}
              {team.length > 0 && (
                <Reveal
                  delay={0.2}
                  className="relative overflow-hidden rounded-xl border border-gold-500/40 bg-navy-950 p-6"
                >
                  <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
                  <div className="relative">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                      More from the builders
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                      See everything this team has shipped — member profiles collect
                      every project they belong to.
                    </p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {team.slice(0, 3).map((member) => (
                        <li key={member.username}>
                          <Link
                            to={ROUTES.profile(member.username)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition-colors hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                          >
                            <Wrench size={13} aria-hidden="true" className="text-gold-400" />
                            {member.name.split(" ")[0]}'s projects
                            <ArrowRight size={13} aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </aside>
          </div>
        </Container>
      </section>

      {/* ---------- Related projects ---------- */}
      <RelatedProjects projects={related.data ?? []} className="border-t border-line bg-surface py-16 lg:py-20" />

      {/* ---------- CTA ---------- */}
      <CTASection
        id="project-cta"
        eyebrow="Build The Next One"
        title="Every project here started as an idea"
        description="Project teams form at workshops, hackathons, and study circles — no experience required, just a willingness to figure it out together. Bring your idea or adopt one."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "See Upcoming Events", to: ROUTES.events }}
        note={
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw size={13} aria-hidden="true" />
            Demo project — real showcases arrive with member submissions.
          </span>
        }
      />
    </>
  );
}

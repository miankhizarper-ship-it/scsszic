import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FolderGit2,
  GraduationCap,
  PenLine,
  SearchX,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useAuth } from "@/context/AuthProvider";
import { useMember, useProjectsByMember } from "@/hooks/content";
import { useMyMemberProfile } from "@/hooks/me";
import { resolveSocialIcon } from "@/lib/socialIcons";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * ProfilePage — the public member profile (/profile/:username, also linked
 * from /members/:username).
 *
 * Order: navy identity band (ProfileShell header) → About + skills/
 * interests sidebar → Projects by this member → CTA. Cross-references come
 * from the API: the member's `projectSlugs` scope the projects query
 * server-side (?memberUsername=…), so only real, public projects render.
 *
 * Archived members are excluded by the DATABASE queries — a direct link to
 * a deactivated profile lands on the Not Found state (spec §13).
 */
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const memberQuery = useMember(username);
  const member = memberQuery.data;

  // Owner affordance — the signed-in member viewing their OWN public profile
  // gets a direct "Edit public profile" action (self-service fields live on
  // /member/profile: about, skills, interests, projects, social links…).
  // Enabled only for member-role accounts; identity compared by record id,
  // never by URL handle.
  const myProfileQuery = useMyMemberProfile({ enabled: user?.role === "member" });
  const ownsProfile =
    user?.role === "member" &&
    Boolean(member && myProfileQuery.data && myProfileQuery.data.id === member.id);

  // Hooks stay unconditional; early returns come after them.
  const projectsQuery = useProjectsByMember(member?.username);
  const projects = projectsQuery.data ?? [];

  usePageMetadata({
    title: member
      ? buildPageTitle(member.name)
      : buildPageTitle("Member Profile"),
    description: member
      ? `${member.name} — ${member.role} in the Society of Computer Science community at SZIC.`
      : "Member profile on the Society of Computer Science platform.",
  });

  if (memberQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading profile…"
      />
    );
  }

  if (memberQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this profile right now"
            description="Member profiles are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void memberQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Member Not Found"
            description="This profile doesn't exist or may no longer be active. Browse the directory to meet the current members."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.members} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Members
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  const socialEntries = Object.entries(member.social ?? {});

  return (
    <>
      {/* ---------- Identity band ---------- */}
      <header className="relative overflow-hidden border-b border-white/10 bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div
          aria-hidden="true"
          className="absolute -top-32 right-[-8%] h-[360px] w-[360px] rounded-full bg-navy-600/40 blur-3xl"
        />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

        <Container className="relative py-12 sm:py-14">
          <div className="flex flex-col items-center gap-7 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative shrink-0">
              <span
                aria-hidden="true"
                className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-gold-500/40 to-navy-500/30 blur-[2px]"
              />
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.avatarAlt ?? `Portrait placeholder for ${member.name}`}
                  width={136}
                  height={136}
                  className="relative size-[136px] rounded-2xl border border-white/20 object-cover shadow-2xl"
                />
              ) : (
                <span className="relative grid size-[136px] place-items-center rounded-2xl border border-white/20 bg-navy-900 font-display text-3xl font-bold text-gold-300 shadow-2xl">
                  {member.initials}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <Badge variant="onDark">
                <GraduationCap size={12} aria-hidden="true" className="mr-1" />
                {member.batch}
              </Badge>

              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {member.name}
              </h1>

              <p className="mt-2 text-base text-slate-300">
                <span className="font-semibold text-gold-300">{member.role}</span>
                <span aria-hidden="true" className="mx-2 text-slate-500">
                  ·
                </span>
                {member.location}
              </p>

              <p className="mt-1 font-mono text-sm text-slate-400">@{member.username}</p>

              {socialEntries.length > 0 && (
                <div className="mt-5 flex justify-center gap-2 sm:justify-start">
                  {socialEntries.map(([platform, href]) => {
                    const Icon = resolveSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noreferrer" : undefined}
                        aria-label={`${member.name} on ${platform}`}
                        className="grid size-10 place-items-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-gold-500/50 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Icon size={16} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              )}

              {ownsProfile && (
                <div className="mt-5 flex justify-center sm:justify-start">
                  <Button to={ROUTES.member.profileEdit} variant="gold" size="sm">
                    <PenLine size={15} aria-hidden="true" />
                    Edit public profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* ---------- Body ---------- */}
      <section aria-label={`About ${member.name}`} className="bg-surface py-10 lg:py-14">
        <Container>
          <Link
            to={ROUTES.members}
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to directory
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
            {/* ---------- About ---------- */}
            <div className="min-w-0 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-xl font-bold text-navy-900">
                About {member.name.split(" ")[0]}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{member.bio}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[member.domain, ...(member.department ? [member.department] : [])].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-700"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ---------- Sidebar ---------- */}
            <aside className="flex min-w-0 flex-col gap-6">
              <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                  <Sparkles size={16} aria-hidden="true" className="text-gold-600" />
                  Skills
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {member.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-md border border-navy-100 bg-surface px-2.5 py-1 text-xs font-semibold text-navy-800"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                  <Users size={16} aria-hidden="true" className="text-gold-600" />
                  Interests
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {member.interests.map((interest) => (
                    <li
                      key={interest}
                      className="rounded-md border border-dashed border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ---------- Projects ---------- */}
      {projects.length > 0 && (
        <section aria-label="Projects by this member" className="border-t border-line bg-white py-12 lg:py-16">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                  <FolderGit2 size={14} aria-hidden="true" />
                  Projects
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                  {member.name.split(" ")[0]}'s builds
                </h2>
              </div>
              <Link
                to={ROUTES.projects}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                All projects
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} className="h-full" />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <section className="border-t border-line bg-surface py-16 lg:py-20">
        <Container className="text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            <UserRound size={14} aria-hidden="true" />
            Meet More Members
          </p>
          <h2 className="mx-auto mt-3 max-w-xl font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Every profile here started at one event
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button to={ROUTES.members} variant="navy">
              Browse the directory
              <ChevronRight size={15} aria-hidden="true" />
            </Button>
            {/* Signup CTA is for visitors who haven't joined yet. */}
            {!user && (
              <Button to={ROUTES.signup} variant="outline">
                Join the community
              </Button>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

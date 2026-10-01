import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, SearchX, Sparkles, Trophy } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { ProfileCard } from "@/components/media/ProfileCard";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useAlumnus, useRelatedAlumni } from "@/hooks/content";
import { useAuth } from "@/context/AuthProvider";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * AlumniDetailPage — full profile for a single graduate (/alumni/:slug).
 *
 * Profile header → bio + career highlights (main) → skills + facts
 * (sidebar) → related alumni. Phase 8: the lookup runs against
 * GET /api/alumni/:slug and related profiles come from the related
 * endpoint — unknown slugs resolve to the same Not Found state.
 */
export default function AlumniDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const alumnusQuery = useAlumnus(slug);
  const person = alumnusQuery.data;

  // Related lookup stays unconditional (enabled only when the slug exists).
  const relatedQuery = useRelatedAlumni(person ? person.username : undefined);
  const related = relatedQuery.data ?? [];

  usePageMetadata({
    title: person
      ? `${person.name} | Society of Computer Science`
      : "Alumni Profile | Society of Computer Science",
    description: person
      ? `${person.name} — ${person.role} at ${person.company}. ${person.achievement}`
      : "Alumni profile — journey, role, and achievements of a Society of Computer Science graduate.",
  });

  if (alumnusQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        className="bg-surface py-16 lg:py-24"
        label="Loading profile…"
      />
    );
  }

  if (alumnusQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this profile right now"
            description="Alumni profiles are temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void alumnusQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Alumni profile not found"
            description="This profile doesn't exist or may have been moved. Browse the alumni directory to find graduates by batch and field."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.alumni} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Alumni
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  return (
    <>
      <ProfileShell
        person={person}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              to={ROUTES.alumni}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to directory
            </Link>
          </nav>
        }
        sidebar={
          <div className="flex flex-col gap-6">
            {/* Skills */}
            {person.skills && person.skills.length > 0 && (
              <Reveal className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                  <Sparkles size={16} aria-hidden="true" className="text-gold-600" />
                  Skills
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {person.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-md border border-navy-100 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {/* Quick facts */}
            <Reveal delay={0.05} className="rounded-xl border border-line bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                <Briefcase size={16} aria-hidden="true" className="text-gold-600" />
                At a glance
              </h2>
              <dl className="mt-4 divide-y divide-line">
                {[
                  ["Batch", person.batch],
                  ["Field", person.field],
                  ["Role", person.role],
                  ["Organization", person.company],
                ].map(([term, detail]) => (
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

            {/* Network CTA — signup prompt for visitors who haven't joined. */}
            {!user && (
              <Reveal
                delay={0.1}
                className="relative overflow-hidden rounded-xl border border-gold-500/40 bg-navy-950 p-6"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                    SCS Network
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    Want to meet alumni like this? Join the society and take part in
                    mentorship sessions, alumni talks, and portfolio reviews.
                  </p>
                  <Button to={ROUTES.signup} variant="gold" size="sm" className="mt-4">
                    Join the Community
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </Reveal>
            )}
          </div>
        }
      >
        {/* ---------- Bio ---------- */}
        {person.bio && (
          <Reveal className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-lg font-semibold text-navy-900">
              About {person.name.split(" ")[0]}
            </h2>
            <p className="mt-3.5 text-[15px] leading-relaxed text-muted">{person.bio}</p>
          </Reveal>
        )}

        {/* ---------- Career highlights ---------- */}
        {person.careerHighlights && person.careerHighlights.length > 0 && (
          <Reveal
            delay={0.05}
            className="mt-6 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
              <Trophy size={17} aria-hidden="true" className="text-gold-600" />
              Career highlights
            </h2>

            <ol className="mt-4 flex flex-col">
              {person.careerHighlights.map((highlight, index) => (
                <li
                  key={highlight}
                  className="flex items-start gap-4 border-b border-line py-3.5 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 font-mono text-[10px] font-bold text-gold-300"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-relaxed text-navy-800">
                    {highlight}
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        {/* Field badge row for quick scanning */}
        <Reveal delay={0.1} className="mt-6 flex flex-wrap items-center gap-2">
          <Badge variant="goldSoft">{person.field}</Badge>
          <Badge variant="navySoft">{person.batch}</Badge>
        </Reveal>
      </ProfileShell>

      {/* ---------- Related alumni ---------- */}
      <section aria-labelledby="related-alumni-heading" className="border-t border-line bg-white py-16 lg:py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
                Keep exploring
              </p>
              <h2
                id="related-alumni-heading"
                className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
              >
                More SCS alumni
              </h2>
            </div>

            <Link
              to={ROUTES.alumni}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              View all alumni
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {related.map((profile, index) => (
              <Reveal key={profile.id} delay={index * 0.07} className="h-full">
                <li className="h-full">
                  <ProfileCard person={profile} className="h-full" />
                </li>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

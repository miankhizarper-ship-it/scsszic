import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { MemberCard } from "@/components/members/MemberCard";
import { useMembers } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { hasActiveFilters } from "@/lib/memberSearch";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * MembersPage — the student member directory (/members).
 *
 * Server-side search + batch + domain filtering with facets in meta (the
 * API owns the query). Archived members are excluded by the database
 * queries themselves, so deactivated profiles can never appear — even for
 * direct link construction (spec §13).
 */
export default function MembersPage() {
  usePageMetadata({
    title: buildPageTitle("Members"),
    description:
      "Browse the members of the Society of Computer Science at SZIC — students across every batch who learn, build, and collaborate together.",
  });

  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("");
  const [domain, setDomain] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, batch, domain }),
    [debouncedQuery, batch, domain],
  );

  const membersQuery = useMembers(filters);
  const members = membersQuery.data?.data ?? [];
  const facets = membersQuery.data?.meta.facets;
  const total = facets?.total ?? 0;

  const batches = ((facets?.batches ?? []) as Array<{ value?: string | number }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const domains = ((facets?.domains ?? []) as Array<{ value?: string }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);

  const filtersActive = hasActiveFilters(filters);
  const showEmpty = !membersQuery.isPending && !membersQuery.isError && members.length === 0;

  return (
    <>
      <PageHero
        id="members-heading"
        eyebrow="Member Directory"
        title={
          <>
            The people behind{" "}
            <span className="text-gold-400">the society</span>.
          </>
        }
        description="Students across every batch who learn, build, and collaborate together — find study partners, project teammates, and mentors."
      >
        <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-4">
          {[
            { value: String(total), label: "Public profiles" },
            { value: String(batches.length), label: "Batch cohorts" },
            { value: String(domains.length), label: "Technical domains" },
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

      <section aria-label="Member directory" className="bg-surface py-12 lg:py-16">
        <Container>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <SearchInput
              id="member-search"
              value={query}
              onChange={setQuery}
              placeholder="Search members by name, username, skill, interest, or bio…"
              label="Search members"
              className="max-w-xl"
            />

            <div className="mt-5 border-t border-line pt-5">
              <FilterBar
                groups={[
                  { id: "batch", label: "Batch", options: batches },
                  { id: "domain", label: "Domain", options: domains },
                ]}
                values={{ batch: batch || "All", domain: domain || "All" }}
                onToggle={(groupId, value) => {
                  const next = value === "All" ? "" : value;
                  if (groupId === "batch") setBatch(next);
                  if (groupId === "domain") setDomain(next);
                }}
                onClear={() => {
                  setQuery("");
                  setBatch("");
                  setDomain("");
                }}
              />
            </div>

            <p className="mt-5 border-t border-line pt-4 text-sm text-muted" aria-live="polite">
              {membersQuery.isPending
                ? "Loading members…"
                : membersQuery.isError
                  ? "The directory is temporarily unavailable."
                  : `${members.length} ${members.length === 1 ? "member" : "members"}${
                      filtersActive ? " matching your filters" : ""
                    }`}
            </p>
          </div>

          {membersQuery.isPending && (
            <CollectionLoading rows={6} className="mt-10" label="Loading members…" />
          )}

          {membersQuery.isError && (
            <ErrorState
              title="The directory couldn't load"
              description="Member profiles are temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void membersQuery.refetch()}
              className="mt-10 border-solid"
            />
          )}

          {showEmpty && (
            <EmptyState
              icon={SearchX}
              title="No members match those filters"
              description="Try a different search term, or reset the filters to browse the full directory."
              className="mt-10"
            >
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setBatch("");
                    setDomain("");
                  }}
                  className="font-display text-sm font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition-colors hover:text-gold-600"
                >
                  Clear filters
                </button>
              )}
            </EmptyState>
          )}

          {members.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} className="h-full" />
              ))}
            </div>
          )}
        </Container>
      </section>

      <CTASection
        id="members-cta"
        eyebrow="Join The Roster"
        title="Your profile belongs here"
        description="Every member started as a stranger at an orientation. Create your account, show up to an event, and find your people — the directory grows one semester at a time."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "See Upcoming Events", to: ROUTES.events }}
      />
    </>
  );
}

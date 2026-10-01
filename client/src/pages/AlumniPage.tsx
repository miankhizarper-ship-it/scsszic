import { useMemo, useState } from "react";
import { SearchX, Users } from "lucide-react";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AlumniCard } from "@/components/media/AlumniCard";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useAlumni } from "@/hooks/content";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * AlumniPage — the alumni network directory.
 * Order: Hero → Introduction → Search → Filters → Grid → CTA.
 *
 * Phase 8: the directory is served by GET /api/alumni with server-side
 * search/batch/field filtering (facets in meta) — the page sends parameters
 * and renders results, no client-side collection filtering.
 */
export default function AlumniPage() {
  usePageMetadata({
    title: buildPageTitle("Alumni"),
    description:
      "Meet the alumni network of the Society of Computer Science at SZIC — graduates working across engineering, AI, data, security, research, and startups.",
  });

  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("");
  const [field, setField] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, batch, field }),
    [debouncedQuery, batch, field],
  );

  const alumniQuery = useAlumni(filters);
  const results = alumniQuery.data?.data ?? [];
  const facets = alumniQuery.data?.meta.facets;
  const total = facets?.total ?? 0;

  const batches = ((facets?.batches ?? []) as Array<{ value?: string | number }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);
  const fields = ((facets?.fields ?? []) as Array<{ value?: string }>)
    .map((entry) => String(entry.value))
    .filter(Boolean);

  const hasActiveFilters = query.trim() !== "" || batch !== "" || field !== "";

  const clearFilters = () => {
    setQuery("");
    setBatch("");
    setField("");
  };

  const toggleFilter = (groupId: string, value: string) => {
    const current = groupId === "batch" ? batch : field;
    const next = current === value ? "" : value;
    if (groupId === "batch") setBatch(next);
    else setField(next);
  };

  return (
    <>
      <PageHero
        id="alumni-heading"
        eyebrow="Alumni Network"
        title={
          <>
            Our alumni,{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              out in the world
            </span>
          </>
        }
        description="SCS graduates now work across software engineering, AI research, data science, cybersecurity, and startups. Explore their journeys — and see where an SCS beginning can take you."
      >
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { value: `${total}`, label: "Alumni profiles" },
            { value: `${fields.length}`, label: "Professional fields" },
            { value: `${batches.length}`, label: "Batch years" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm"
            >
              <dt className="order-2 mt-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {label}
              </dt>
              <dd className="order-1 font-display text-2xl font-bold text-gold-300">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      {/* ---------- Introduction ---------- */}
      <section aria-labelledby="alumni-intro-heading" className="bg-white py-14 lg:py-16">
        <Container>
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2
              id="alumni-intro-heading"
              className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
            >
              A network that opens doors
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              The alumni network is one of the society's biggest advantages. Graduates
              return every semester to judge hackathons, review portfolios, and mentor
              final-year students — and they are the first to hear about openings at
              the companies they build. Use the directory below to find alumni by
              batch or professional field.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Search + Filters + Grid ---------- */}
      <section aria-label="Alumni directory" className="bg-surface pb-20 lg:pb-24">
        <Container>
          <Reveal>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
              <SearchInput
                id="alumni-search"
                value={query}
                onChange={setQuery}
                placeholder="Search by name, role, company, or skill…"
                label="Search alumni"
                className="max-w-xl"
              />

              <div className="mt-5 border-t border-line pt-5">
                <FilterBar
                  groups={[
                    { id: "batch", label: "Batch", options: batches },
                    { id: "field", label: "Field", options: fields },
                  ]}
                  values={{ batch: batch || "All", field: field || "All" }}
                  onToggle={toggleFilter}
                  onClear={clearFilters}
                />
              </div>

              <p
                className="mt-5 border-t border-line pt-4 text-sm text-muted"
                role="status"
                aria-live="polite"
              >
                {alumniQuery.isPending
                  ? "Loading alumni…"
                  : alumniQuery.isError
                    ? "The directory is temporarily unavailable."
                    : (
                        <>
                          Showing{" "}
                          <span className="font-semibold text-navy-900">{results.length}</span>{" "}
                          {results.length === 1 ? "alumnus" : "alumni"}
                          {hasActiveFilters ? " matching your filters" : ""}.
                        </>
                      )}
              </p>
            </div>
          </Reveal>

          {/* States */}
          {alumniQuery.isPending && (
            <CollectionLoading rows={6} className="mt-8" label="Loading alumni…" />
          )}

          {alumniQuery.isError && (
            <ErrorState
              title="The directory couldn't load"
              description="Alumni profiles are temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void alumniQuery.refetch()}
              className="mt-8 border-solid"
            />
          )}

          {!alumniQuery.isPending && !alumniQuery.isError && results.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No alumni match those filters"
              description="Try a different search term, or clear the batch and field filters to see the full directory."
              className="mt-8"
            >
              <Button variant="navy" onClick={clearFilters}>
                <Users size={16} aria-hidden="true" />
                Show all alumni
              </Button>
            </EmptyState>
          )}

          {/* Results */}
          {results.length > 0 && (
            <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((person, index) => (
                <Reveal key={person.id} delay={(index % 3) * 0.06} className="h-full">
                  <li className="h-full">
                    <AlumniCard person={person} className="h-full" />
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* ---------- CTA ---------- */}
      <CTASection
        id="alumni-cta"
        eyebrow="Stay Connected"
        title="Are you part of the SCS alumni network?"
        description="Graduated from SZIC? We would love to feature your journey — alumni profiles help current students see what is possible and keep the network growing."
        primary={{ label: "Get in Touch", to: ROUTES.contact }}
        secondary={{ label: "Join the Community", to: ROUTES.signup }}
      />
    </>
  );
}

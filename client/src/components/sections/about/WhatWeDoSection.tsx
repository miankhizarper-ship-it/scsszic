import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WHAT_WE_DO } from "@/data/about";

/**
 * WhatWeDoSection — four feature cards (Learn / Build / Collaborate /
 * Innovate). Same information architecture as the Home highlights but with
 * a calmer editorial treatment (top hairline + index numeral) so the two
 * surfaces feel related yet distinct.
 */
export function WhatWeDoSection() {
  return (
    <section aria-labelledby="what-we-do-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="what-we-do-heading"
          label="What We Do"
          title="Four ways the society works for you"
          description="Every SCS activity traces back to one of these four commitments — the operating rhythm of the community."
        />

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {WHAT_WE_DO.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.07} className="h-full">
              <li className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-md">
                {/* Top hairline accent */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-500 transition-transform duration-300 group-hover:scale-x-100"
                />

                <span
                  aria-hidden="true"
                  className="absolute right-5 top-5 font-display text-4xl font-extrabold text-navy-50 transition-colors duration-300 group-hover:text-gold-100"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-lg bg-navy-900 text-gold-300 shadow-sm"
                >
                  <Icon size={21} />
                </span>

                <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">
                  {title}
                </h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

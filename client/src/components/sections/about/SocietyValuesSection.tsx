import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SOCIETY_VALUES } from "@/data/about";

/**
 * SocietyValuesSection — what the community stands for.
 * Editorial numbered rows in two columns (deliberately not another card
 * grid), so the page's visual rhythm keeps varying section to section.
 */
export function SocietyValuesSection() {
  return (
    <section aria-labelledby="values-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="values-heading"
          label="Our Values"
          title="The standards we hold each other to"
          description="Values are only real when they shape daily behavior. These six shape how sessions are run, projects are built, and members treat each other."
        />

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-x-12 border-b border-line md:grid-cols-2">
          {SOCIETY_VALUES.map(({ id, title, description, icon: Icon }, index) => (
            <Reveal key={id} delay={(index % 2) * 0.06} className="min-w-0">
              <article className="flex items-start gap-5 border-t border-line py-6">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700 transition-colors duration-300 hover:bg-navy-900 hover:text-gold-300"
                >
                  <Icon size={20} />
                </span>

                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-2.5 font-display text-base font-semibold text-navy-900">
                    <span
                      aria-hidden="true"
                      className="font-mono text-xs font-semibold text-gold-600"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

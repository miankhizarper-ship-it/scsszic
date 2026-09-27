import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { COMMUNITY_AREAS } from "@/data/about";
import { cn } from "@/lib/utils";

/**
 * CommunityAreasSection — the technical territories the society covers.
 * Editable mock data; a featured area opens the grid with a wider card.
 */
export function CommunityAreasSection() {
  return (
    <section aria-labelledby="areas-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="areas-heading"
          label="Community Areas"
          title="Where our members focus"
          description="SCS tracks the fields shaping computing today. Pick a lane — or explore several; every area is student-led and open to join."
        />

        <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {COMMUNITY_AREAS.map(({ id, title, description, icon: Icon, featured }, index) => (
            <Reveal
              key={id}
              delay={(index % 3) * 0.07}
              className={cn("h-full", featured && "md:col-span-2 lg:col-span-1")}
            >
              <li
                className={cn(
                  "group flex h-full flex-col rounded-xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
                  featured
                    ? "border-gold-500/50 bg-gradient-to-br from-white to-gold-50/60"
                    : "border-line hover:border-navy-200",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-lg transition-colors",
                      featured
                        ? "bg-gold-500 text-navy-950"
                        : "bg-navy-900 text-gold-300",
                    )}
                  >
                    <Icon size={19} />
                  </span>
                  <h3 className="font-display text-[15px] font-semibold text-navy-900">
                    {title}
                  </h3>
                </div>

                <p className="mt-3.5 text-sm leading-relaxed text-muted">{description}</p>

                {featured && (
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gold-700">
                    Core track
                  </p>
                )}
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

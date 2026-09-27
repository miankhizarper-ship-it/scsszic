import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { MISSION } from "@/data/about";

/**
 * MissionSection — dedicated mission statement.
 * Deep navy band with a large pull-quote statement and three supporting
 * pillars (how we pursue the mission).
 */
export function MissionSection() {
  return (
    <section
      aria-labelledby="mission-heading"
      className="relative overflow-hidden bg-navy-950"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-40%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-navy-600/25 blur-3xl"
      />
      <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

      <Container className="relative py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
              <span aria-hidden="true" className="h-px w-8 bg-gold-500/70" />
              Our Mission
              <span aria-hidden="true" className="h-px w-8 bg-gold-500/70" />
            </p>

            <h2
              id="mission-heading"
              className="mt-6 font-display text-2xl font-bold leading-snug tracking-tight text-white text-balance sm:text-3xl"
            >
              {MISSION.statement}
            </h2>
          </Reveal>
        </div>

        {/* Pillars — how the mission is pursued */}
        <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {MISSION.pillars.map(({ title, description }, index) => (
            <Reveal key={title} delay={index * 0.08} className="h-full">
              <li className="flex h-full flex-col rounded-xl border border-white/10 bg-navy-900/70 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-gold-500/40">
                <span
                  aria-hidden="true"
                  className="font-display text-sm font-bold text-gold-500"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

import { GraduationCap, Network, Rocket } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const GAINS = [
  {
    icon: GraduationCap,
    title: "Practical skills",
    description:
      "Workshops and study circles that go beyond the classroom — Git, frameworks, tools, and practices used in real teams.",
  },
  {
    icon: Network,
    title: "A real network",
    description:
      "Seniors, alumni, and peers who share opportunities, review portfolios, and open doors long after graduation.",
  },
  {
    icon: Rocket,
    title: "Proven experience",
    description:
      "Hackathons, bootcamps, and society projects that turn a CV bullet point into a story you can defend in interviews.",
  },
];

/**
 * AboutIntro — two-column society introduction.
 * Left: narrative copy. Right: composed visual identity panel.
 */
export function AboutIntro() {
  return (
    <section aria-labelledby="about-intro-heading" className="overflow-hidden bg-white py-20 lg:py-24">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ---------- Copy ---------- */}
          <div className="min-w-0">
            <SectionHeading
              id="about-intro-heading"
              align="left"
              label="Who We Are"
              title="A student community built around computing — and each other."
              className="max-w-none"
            />

            <Reveal delay={0.1}>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
                <p>
                  The Society of Computer Science (SCS) is a student-driven society at
                  Shaikh Zayed Islamic Centre, University of Peshawar. We exist because
                  the most important parts of a computing education happen outside the
                  lecture hall — in the projects you ship, the people you meet, and the
                  problems you learn to solve together.
                </p>
                <p>
                  SCS is for every SZIC student with an interest in technology: absolute
                  beginners writing their first program, intermediate students looking
                  for direction, and advanced students who want a place to build, teach,
                  and lead. There is no entry exam — only the willingness to
                  participate.
                </p>
              </div>
            </Reveal>

            <ul className="mt-8 flex flex-col gap-5">
              {GAINS.map(({ icon: Icon, title, description }, index) => (
                <Reveal key={title} delay={0.15 + index * 0.08}>
                  <li className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-lg border border-gold-500/40 bg-navy-900 text-gold-300"
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-semibold text-navy-900">
                        {title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">
                        {description}
                      </span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* ---------- Visual: composed identity panel ---------- */}
          <Reveal delay={0.2} className="min-w-0">
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              {/* Glow */}
              <div
                aria-hidden="true"
                className="absolute -inset-5 rounded-2xl bg-gradient-to-br from-navy-500/15 via-transparent to-gold-500/10 blur-2xl"
              />

              <div className="relative overflow-hidden rounded-2xl border border-navy-800 bg-navy-950 shadow-xl">
                <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
                <div
                  aria-hidden="true"
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-navy-600/40 blur-3xl"
                />

                <div className="relative p-7 sm:p-9">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
                    SCS at a glance
                  </p>

                  <dl className="mt-6 divide-y divide-white/10">
                    {[
                      ["Society", "Society of Computer Science"],
                      ["Home", "Shaikh Zayed Islamic Centre"],
                      ["University", "University of Peshawar"],
                      ["Open to", "All SZIC students"],
                      ["Driven by", "Students, for students"],
                    ].map(([term, detail]) => (
                      <div key={term} className="flex items-baseline justify-between gap-4 py-3.5">
                        <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {term}
                        </dt>
                        <dd className="min-w-0 truncate text-right text-sm font-medium text-white">
                          {detail}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 rounded-lg border border-gold-500/30 bg-gold-500/[0.07] p-4">
                    <p className="text-sm leading-relaxed text-gold-200">
                      “More than a society — a professional family that carries you
                      from first semester to first job.”
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating chip */}
              <div
                aria-hidden="true"
                className="absolute -bottom-5 left-6 hidden items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-lg sm:flex"
              >
                <span className="size-2 rounded-full bg-success" />
                <span className="font-display text-xs font-semibold text-navy-900">
                  Active every semester
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

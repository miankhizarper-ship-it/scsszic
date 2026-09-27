import { ArrowRight, BrainCircuit, CheckCircle2, Code2, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/routes/paths";

const PILLARS = [
  {
    icon: Code2,
    title: "Software Development",
    description: "Web, mobile, and systems projects built by member teams.",
  },
  {
    icon: BrainCircuit,
    title: "AI & Emerging Tech",
    description: "Explorations, talks, and hands-on machine learning sessions.",
  },
  {
    icon: Trophy,
    title: "Competitive Programming",
    description: "Contest training and inter-university coding challenges.",
  },
  {
    icon: Users,
    title: "Community & Leadership",
    description: "Event management, peer mentoring, and student governance.",
  },
];

const COMMITMENTS = [
  "Peer-led workshops and study circles",
  "Hackathons, bootcamps, and competitions",
  "Mentorship from seniors and alumni",
];

/**
 * SocietyIntro — two-column introduction: copy on the left, an icon-card
 * composition on the right (no stock photos; feels built, not templated).
 */
export function SocietyIntro() {
  return (
    <section aria-labelledby="about-society" className="bg-white py-20 lg:py-24">
      <Container>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          {/* Left: copy */}
          <div>
            <SectionHeading
              id="about-society"
              align="left"
              label="About the Society"
              title="A student-led community for aspiring technologists."
              description="The Society of Computer Science brings together students of Shaikh Zayed Islamic Centre who are curious about computing — from writing their first line of code to researching the systems of tomorrow. We learn in public, build together, and help every member find their direction in technology."
            />

            <Reveal delay={0.1}>
              <ul className="mt-8 flex flex-col gap-3.5">
                {COMMITMENTS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      size={19}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-gold-600"
                    />
                    <span className="text-sm leading-relaxed text-ink">{item}</span>
                  </li>
                ))}
              </ul>

              <Button to={ROUTES.about} variant="outline" className="mt-9">
                More About SCS
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </Reveal>
          </div>

          {/* Right: composition */}
          <Reveal delay={0.15} className="relative">
            {/* Offset decorative frame */}
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -right-5 hidden h-full w-full rounded-2xl border border-gold-500/30 bg-gold-50 md:block"
            />

            <div className="relative rounded-2xl border border-line bg-white p-6 shadow-lg shadow-navy-950/5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                What we do
              </p>

              <ul className="mt-6 flex flex-col gap-6">
                {PILLARS.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-300">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-display text-sm font-semibold text-navy-900">
                        {title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">
                        {description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-5 right-4 rounded-lg border border-gold-500/40 bg-navy-900 px-4 py-2.5 shadow-lg sm:right-8">
              <p className="font-display text-sm font-bold text-gold-300">Est. 2019</p>
              <p className="text-[10px] tracking-wide text-slate-400">
                SZIC · University of Peshawar
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

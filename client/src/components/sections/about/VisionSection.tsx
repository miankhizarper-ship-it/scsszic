import { Compass } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { VISION } from "@/data/about";

/**
 * VisionSection — dedicated vision statement.
 * Light surface with an asymmetric editorial layout: statement panel on the
 * left, numbered direction points on the right — deliberately different in
 * rhythm from the Mission band before it.
 */
export function VisionSection() {
  return (
    <section aria-labelledby="vision-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Statement */}
          <Reveal className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
                <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
                Our Vision
              </p>

              <h2
                id="vision-heading"
                className="mt-5 font-display text-2xl font-bold leading-snug tracking-tight text-navy-900 text-balance sm:text-3xl"
              >
                {VISION.statement}
              </h2>

              <div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-300"
                >
                  <Compass size={18} />
                </span>
                <p className="text-sm font-medium text-navy-800">
                  Where SCS is headed over the coming years
                </p>
              </div>
            </div>
          </Reveal>

          {/* Direction points */}
          <ol className="flex flex-col gap-4">
            {VISION.points.map((point, index) => (
              <Reveal key={point} delay={index * 0.08} className="min-w-0">
                <li className="flex items-start gap-5 rounded-xl border border-line bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-gold-500/50 bg-gold-50 font-display text-sm font-bold text-gold-700"
                  >
                    {index + 1}
                  </span>
                  <p className="min-w-0 pt-1.5 text-[15px] leading-relaxed text-navy-800">
                    {point}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

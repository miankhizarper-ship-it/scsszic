import { motion } from "framer-motion";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HIGHLIGHTS } from "@/data/highlights";
import { fadeUpSm, staggerContainer, viewportOnce } from "@/lib/motion";

/**
 * Highlights — the four pillars of the society:
 * Learn · Build · Collaborate · Innovate.
 */
export function Highlights() {
  return (
    <section aria-labelledby="highlights-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="highlights-heading"
          label="Why SCS"
          title="Learn. Build. Collaborate. Innovate."
          description="Four pillars guide everything the society does — on campus, in the lab, and online."
        />

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <motion.article
              key={title}
              variants={fadeUpSm}
              className="group rounded-xl border border-line bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-navy-900 text-gold-300 transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-navy-950">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-base font-semibold text-navy-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

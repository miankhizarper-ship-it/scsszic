import { motion } from "framer-motion";

import { Container } from "@/components/ui/Container";
import { StatCard } from "@/components/media/StatCard";
import { STATS } from "@/data/stats";
import { fadeUpSm, staggerContainer, viewportOnce } from "@/lib/motion";

/**
 * Stats — navy band with the society's key numbers.
 * Values live in `data/stats.ts` and map 1:1 to a future API response.
 */
export function Stats() {
  return (
    <section
      aria-labelledby="stats-heading"
      className="relative border-y border-gold-500/20 bg-navy-900"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-50" />
      <h2 id="stats-heading" className="sr-only">
        Society statistics
      </h2>

      <Container className="relative py-12 lg:py-16">
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.id} variants={fadeUpSm} className="h-full">
              <StatCard stat={stat} tone="dark" className="h-full" />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

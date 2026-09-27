import { motion } from "framer-motion";

import { Container } from "@/components/ui/Container";
import { fadeUp, fadeUpSm, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  /** Small uppercase eyebrow, e.g. "About SCS". */
  eyebrow: string;
  /** Page H1. */
  title: React.ReactNode;
  /** Supporting paragraph under the title. */
  description: string;
  /** Optional content rendered under the copy (stats row, search bar, …). */
  children?: React.ReactNode;
  /** Heading id for aria-labelledby wiring. */
  id?: string;
  className?: string;
}

/**
 * PageHero — shared navy hero band for inner pages.
 *
 * Same visual language as the Home hero (deep navy, technical grid, gold
 * accents) but as a compact, single-column treatment with optional slot
 * content below the copy.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  id,
  className,
}: PageHeroProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("relative overflow-hidden bg-navy-950", className)}
    >
      {/* Decorative layers — identical treatment to the Home hero */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute -top-40 right-[-12%] h-[480px] w-[480px] rounded-full bg-navy-600/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-30%] left-[-8%] h-[380px] w-[380px] rounded-full bg-gold-500/[0.06] blur-3xl"
      />
      <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

      <Container className="relative py-16 sm:py-20 lg:py-24">
        <motion.div
          variants={staggerContainer(0.09)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fadeUpSm}
            className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400"
          >
            <span aria-hidden="true" className="h-px w-10 bg-gold-500" />
            {eyebrow}
            <span aria-hidden="true" className="h-px w-10 bg-gold-500" />
          </motion.p>

          <motion.h1
            id={id}
            variants={fadeUp}
            className="mt-5 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white text-balance sm:text-5xl"
          >
            {title}
          </motion.h1>

          <motion.p
            variants={fadeUpSm}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
          >
            {description}
          </motion.p>

          {children && <motion.div variants={fadeUpSm}>{children}</motion.div>}
        </motion.div>
      </Container>
    </section>
  );
}

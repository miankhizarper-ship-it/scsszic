import { motion } from "framer-motion";

import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

/**
 * LegalPageLayout — shared shell for the Terms of Service and Privacy
 * Policy pages. Renders the navy hero band, a "last updated" stamp, a
 * sticky "On this page" index beside the body on desktop (compact chip
 * list on mobile), and a closing contact call-to-action.
 *
 * Body markup written by the pages stays plain (<p>, <ul>, <strong>, <a>)
 * — the wrapper below styles bare elements so both documents read
 * identically without per-page class noise.
 */

export interface LegalSection {
  /** Anchor id used by the "On this page" index and deep links. */
  id: string;
  /** Section heading (rendered with its index number). */
  heading: string;
  /** Section body — plain <p>/<ul>/<strong>/<a> markup. */
  body: React.ReactNode;
}

interface LegalPageLayoutProps {
  /** Hero band eyebrow, e.g. "Legal". */
  eyebrow: string;
  /** Page H1. */
  title: React.ReactNode;
  /** Supporting paragraph under the hero title. */
  description: string;
  /** Human-readable "last updated" date, e.g. "September 28, 2026". */
  updated: string;
  /** Lead paragraph(s) shown before the first numbered section. */
  intro: React.ReactNode;
  sections: LegalSection[];
}

const BODY_CLASSES = [
  "space-y-4 text-[15px] leading-relaxed text-slate-600",
  "[&_a]:font-medium [&_a]:text-navy-800 [&_a]:underline [&_a]:decoration-gold-400 [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:decoration-gold-500",
  "[&_strong]:font-semibold [&_strong]:text-navy-900",
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
  "[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
].join(" ");

export function LegalPageLayout({
  eyebrow,
  title,
  description,
  updated,
  intro,
  sections,
}: LegalPageLayoutProps) {
  return (
    <>
      <PageHero id="legal-heading" eyebrow={eyebrow} title={title} description={description}>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-400" />
          Last updated {updated}
        </p>
      </PageHero>

      <section aria-label="Document body" className="bg-surface py-14 lg:py-20">
        <Container>
          <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-12 xl:gap-16">
            {/* ---- "On this page" index — sticky rail on desktop ---- */}
            <nav aria-label="On this page" className="mb-10 lg:mb-0">
              <div className="lg:sticky lg:top-28">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  On this page
                </p>
                <ul
                  className={cn(
                    "mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-1",
                    "lg:border-l lg:border-line lg:pl-4",
                  )}
                >
                  {sections.map((section, index) => (
                    <li key={section.id} className="lg:py-0.5">
                      <a
                        href={`#${section.id}`}
                        className="inline-flex items-baseline gap-2 rounded-md text-sm text-muted transition-colors hover:text-navy-900 lg:rounded-none lg:py-1"
                      >
                        <span
                          aria-hidden="true"
                          className="font-display text-xs font-semibold text-gold-600"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* ---- Document body ---- */}
            <motion.div
              variants={staggerContainer(0.06)}
              initial="hidden"
              animate="visible"
              className="min-w-0 max-w-3xl"
            >
              <motion.div variants={fadeUp} className={BODY_CLASSES}>
                {intro}
              </motion.div>

              <div className="mt-12 space-y-12">
                {sections.map((section, index) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    variants={fadeUp}
                    aria-labelledby={`${section.id}-heading`}
                    className="scroll-mt-28"
                  >
                    <h2
                      id={`${section.id}-heading`}
                      className="flex items-baseline gap-3 font-display text-lg font-bold tracking-tight text-navy-900 sm:text-xl"
                    >
                      <span
                        aria-hidden="true"
                        className="font-display text-sm font-bold text-gold-600"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.heading}
                    </h2>
                    <div className={cn("mt-4", BODY_CLASSES)}>{section.body}</div>
                  </motion.section>
                ))}
              </div>

              {/* ---- Closing contact pointer ---- */}
              <motion.aside
                variants={fadeUp}
                aria-label="Questions about this document"
                className="mt-14 rounded-2xl border border-line bg-white p-6 sm:p-8"
              >
                <h2 className="font-display text-base font-bold text-navy-900 sm:text-lg">
                  Questions about this document?
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Reach the society team at{" "}
                  <a href="mailto:scs@szic.edu.pk">scs@szic.edu.pk</a> or send a message through
                  the contact page — we read everything and reply as soon as we can.
                </p>
                <a
                  href={ROUTES.contact}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                >
                  Go to the contact page
                  <span aria-hidden="true">→</span>
                </a>
              </motion.aside>
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}

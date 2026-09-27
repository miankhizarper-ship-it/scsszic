import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import type { CtaAction } from "@/types";

interface CTASectionProps {
  eyebrow?: string;
  title: string;
  description: string;
  primary: CtaAction;
  secondary?: CtaAction;
  /** Small footnote under the actions — plain text or a rich node. */
  note?: React.ReactNode;
  id?: string;
}

/**
 * CTASection — reusable closing call-to-action band.
 * Deep navy surface, subtle grid + glow, restrained gold accents.
 */
export function CTASection({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  note,
  id,
}: CTASectionProps) {
  return (
    <section aria-labelledby={id} className="relative overflow-hidden bg-navy-950">
      {/* Decorative layers */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-40%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-navy-600/30 blur-3xl"
      />
      <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

      <Container className="relative py-20 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          {eyebrow && (
            <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
              <span aria-hidden="true" className="h-px w-8 bg-gold-500/70" />
              {eyebrow}
              <span aria-hidden="true" className="h-px w-8 bg-gold-500/70" />
            </p>
          )}

          <h2
            id={id}
            className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            {title}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-slate-300">{description}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to={primary.to} variant="gold" size="lg">
              {primary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
            {secondary && (
              <Button to={secondary.to} variant="outlineLight" size="lg">
                {secondary.label}
              </Button>
            )}
          </div>

          {note && <p className="mt-6 text-xs text-slate-500">{note}</p>}
        </Reveal>
      </Container>
    </section>
  );
}

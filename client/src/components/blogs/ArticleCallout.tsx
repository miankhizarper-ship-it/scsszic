import { Info, KeyRound, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BlogContentBlock } from "@/types";

type CalloutVariant = Extract<BlogContentBlock, { type: "callout" }>["variant"];

interface ArticleCalloutProps {
  variant: CalloutVariant;
  title: string;
  text: string;
  className?: string;
}

const VARIANT_STYLES: Record<
  CalloutVariant,
  { icon: typeof Info; wrapper: string; badge: string }
> = {
  /* Gold-tinted — the article's loudest moment, used sparingly. */
  takeaway: {
    icon: KeyRound,
    wrapper: "border-gold-300 bg-gold-50",
    badge: "bg-gold-500 text-navy-950",
  },
  /* Navy-tinted — practical advice. */
  tip: {
    icon: Lightbulb,
    wrapper: "border-navy-200 bg-navy-50",
    badge: "bg-navy-900 text-gold-300",
  },
  /* Neutral — supporting context and references. */
  note: {
    icon: Info,
    wrapper: "border-line bg-surface",
    badge: "bg-navy-100 text-navy-800",
  },
};

/**
 * ArticleCallout — highlighted aside for article content (spec §16).
 *
 * Subtle navy/gold styling; the variant badge carries a text label (never
 * color alone) and an icon. Used sparingly by the content renderer —
 * "Key Takeaway", "Tip", and "Note" are the only variants.
 */
export function ArticleCallout({ variant, title, text, className }: ArticleCalloutProps) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;

  return (
    <aside
      className={cn(
        "rounded-xl border-l-4 border p-5 sm:p-6",
        style.wrapper,
        className,
      )}
      aria-label={title}
    >
      <p className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md",
            style.badge,
          )}
        >
          <Icon size={13} aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-900">
          {title}
        </span>
      </p>
      <p className="mt-2.5 text-[15px] leading-relaxed text-navy-800">{text}</p>
    </aside>
  );
}

import { cn } from "@/lib/utils";

interface CodeBlockProps {
  /** Language label shown in the header, e.g. "Python". */
  language: string;
  /** Raw code text — rendered verbatim, whitespace preserved. */
  code: string;
  /** Optional one-line caption shown in the header. */
  caption?: string;
  className?: string;
}

/**
 * CodeBlock — navy-themed code block for article content (spec §15).
 *
 * - Horizontally scrollable inside its own frame (`overflow-x-auto`) so long
 *   lines never create page-level horizontal overflow, including on mobile.
 * - Accessible contrast (light slate on deep navy) and a real <pre><code>
 *   pair so screen readers treat it as code.
 * - Deliberately no syntax highlighting dependency — clean, readable, on-brand.
 */
export function CodeBlock({ language, code, caption, className }: CodeBlockProps) {
  return (
    <figure className={cn("overflow-hidden rounded-xl border border-navy-800", className)}>
      {/* Header */}
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 bg-navy-900 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">
          {language}
        </span>
        {caption && (
          <span className="min-w-0 text-xs text-slate-400">{caption}</span>
        )}
      </figcaption>

      {/* Code — scrolls horizontally within the block only */}
      <pre className="max-w-full overflow-x-auto bg-navy-950 px-4 py-4 text-[13px] leading-relaxed">
        <code className="font-mono text-slate-200">{code}</code>
      </pre>
    </figure>
  );
}

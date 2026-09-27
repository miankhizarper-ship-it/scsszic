import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { ArticleCallout } from "@/components/blogs/ArticleCallout";
import { CodeBlock } from "@/components/blogs/CodeBlock";
import { cn } from "@/lib/utils";
import type { BlogContentBlock } from "@/types";

/* ---------------------------------------------------------------------------
 * Inline formatting
 *
 * Paragraph/list/quote text supports two inline constructs — [text](url)
 * links and `inline code` — parsed here with a tiny regex scanner. This keeps
 * the mock content authorable without a Markdown dependency while remaining
 * trivially replaceable by a real markdown/CMS renderer later (the block
 * contract does not change).
 * ------------------------------------------------------------------------- */

const INLINE_PATTERN = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;

function renderInline(text: string, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const [, linkText, href, inlineCode] = match;
    const key = `${keyPrefix}-${match.index}`;

    if (linkText && href) {
      nodes.push(
        href.startsWith("/") ? (
          /* Internal route — SPA navigation */
          <Link
            key={key}
            to={href}
            className="font-medium text-navy-900 underline decoration-gold-400 decoration-2 underline-offset-2 transition-colors hover:text-gold-600"
          >
            {linkText}
          </Link>
        ) : (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-navy-900 underline decoration-gold-400 decoration-2 underline-offset-2 transition-colors hover:text-gold-600"
          >
            {linkText}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ),
      );
    } else if (inlineCode) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-navy-100 bg-navy-50 px-1.5 py-0.5 font-mono text-[0.85em] text-navy-900"
        >
          {inlineCode}
        </code>,
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)}</>;
}

/* ---------------------------------------------------------------------------
 * Block rendering
 * ------------------------------------------------------------------------- */

interface BlogContentProps {
  blocks: BlogContentBlock[];
  className?: string;
}

/**
 * BlogContent — maps structured content blocks onto semantic, typographically
 * tuned article markup (spec §14).
 *
 * Heading levels start at <h2> because the article title owns the <h1>.
 * Paragraph rhythm, list styling, and quote treatment are encoded here —
 * once — so every article shares the same editorial voice. Callouts and code
 * blocks render via ArticleCallout and CodeBlock.
 */
export function BlogContent({ blocks, className }: BlogContentProps) {
  return (
    <div className={cn("space-y-7", className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case "paragraph":
            return (
              <p key={key} className="text-[16.5px] leading-[1.8] text-ink/90">
                {renderInline(block.text, key)}
              </p>
            );

          case "heading":
            return block.level === 2 ? (
              <h2
                key={key}
                className="!mt-10 font-display text-[1.55rem] font-bold leading-snug tracking-tight text-navy-900 sm:text-[1.75rem]"
              >
                {renderInline(block.text, key)}
              </h2>
            ) : (
              <h3
                key={key}
                className="!mt-8 font-display text-[1.2rem] font-semibold leading-snug tracking-tight text-navy-900"
              >
                {renderInline(block.text, key)}
              </h3>
            );

          case "list":
            return block.ordered ? (
              <ol
                key={key}
                className="list-decimal space-y-2.5 pl-6 marker:font-display marker:font-semibold marker:text-gold-600"
              >
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className="pl-1.5 text-[16px] leading-[1.75] text-ink/90"
                  >
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={key}
                className="space-y-2.5"
              >
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className="relative pl-6 text-[16px] leading-[1.75] text-ink/90 before:absolute before:left-1 before:top-[0.72em] before:size-1.5 before:rounded-full before:bg-gold-500"
                  >
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );

          case "code":
            return (
              <CodeBlock
                key={key}
                language={block.language}
                code={block.code}
                caption={block.caption}
              />
            );

          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-[3px] border-gold-500 bg-white/60 px-5 py-4 sm:px-6"
              >
                <p className="font-display text-[1.15rem] font-medium italic leading-relaxed text-navy-800">
                  “{block.text}”
                </p>
                {block.attribution && (
                  <cite className="mt-2.5 block text-sm not-italic text-muted">
                    — {block.attribution}
                  </cite>
                )}
              </blockquote>
            );

          case "callout":
            return (
              <ArticleCallout
                key={key}
                variant={block.variant}
                title={block.title}
                text={block.text}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

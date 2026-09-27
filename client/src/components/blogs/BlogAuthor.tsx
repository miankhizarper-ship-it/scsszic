import { cn } from "@/lib/utils";
import type { BlogAuthorProfile } from "@/types";

interface BlogAuthorProps {
  author: BlogAuthorProfile;
  /**
   * "byline"  — compact avatar + name + role row for the article header.
   * "card"    — full bio panel for the end of the article (spec §17).
   */
  variant?: "byline" | "card";
  className?: string;
}

/**
 * BlogAuthor — reusable author presentation.
 *
 * Authors are fictional demo personas defined in data/authors.ts; the demo
 * disclaimer is rendered by the article page, not per-instance.
 * The avatar falls back to a navy/gold initials monogram whenever no image
 * is present (mirrors ProfileCard behaviour).
 */
export function BlogAuthor({ author, variant = "byline", className }: BlogAuthorProps) {
  const initialsFallback = (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-navy-900 font-display font-bold text-gold-300",
        variant === "card" ? "size-12 text-sm" : "size-10 text-xs",
      )}
    >
      {author.initials}
    </span>
  );

  if (variant === "card") {
    return (
      <section
        aria-label={`About the author: ${author.name}`}
        className={cn(
          "rounded-xl border border-line bg-white p-6 sm:flex sm:items-start sm:gap-5",
          className,
        )}
      >
        {author.avatar ? (
          <img
            src={author.avatar}
            alt={author.avatarAlt ?? `Portrait of demo author ${author.name}`}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="size-12 shrink-0 rounded-full object-cover ring-2 ring-gold-500/60"
          />
        ) : (
          initialsFallback
        )}

        <div className="mt-4 min-w-0 sm:mt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Written by
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-navy-900">
            {author.name}
          </h2>
          <p className="text-sm font-medium text-muted">{author.role}</p>
          {author.bio && (
            <p className="mt-2.5 text-sm leading-relaxed text-muted">{author.bio}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {author.avatar ? (
        <img
          src={author.avatar}
          alt={author.avatarAlt ?? `Portrait of demo author ${author.name}`}
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="size-10 shrink-0 rounded-full object-cover ring-2 ring-gold-500/60"
        />
      ) : (
        initialsFallback
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-900">{author.name}</p>
        <p className="truncate text-xs text-muted">{author.role}</p>
      </div>
    </div>
  );
}

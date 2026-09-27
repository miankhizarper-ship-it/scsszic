import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Blog } from "@/types";

/**
 * BlogCard — two layout variants of the same card (spec §11):
 *  - "default": editorial grid card — cover, category, title, excerpt,
 *    author row, date, reading time, and a "Read Article" link
 *  - "compact": horizontal thumbnail card for side lists (Home)
 */
interface BlogCardProps {
  blog: Blog;
  variant?: "default" | "compact";
  className?: string;
}

export function BlogCard({ blog, variant = "default", className }: BlogCardProps) {
  const detailHref = ROUTES.blogDetail(blog.slug);

  if (variant === "compact") {
    return (
      <article
        className={cn(
          "group flex h-full gap-4 rounded-xl border border-line bg-white p-4 shadow-sm",
          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
          className,
        )}
      >
        <div className="size-24 shrink-0 overflow-hidden rounded-lg">
          <img
            src={blog.coverImage}
            alt={blog.coverImageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">
            {blog.category}
          </p>
          <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold leading-snug text-navy-900">
            <Link
              to={detailHref}
              className="rounded-sm transition-colors group-hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              {blog.title}
            </Link>
          </h3>
          <p className="mt-1.5 text-xs text-muted">
            {blog.author.name} · {blog.readingTime} min read
          </p>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={blog.coverImage}
          alt={blog.coverImageAlt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge variant="solidGold" className="absolute left-4 top-4 shadow-sm">
          {blog.category}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-bold leading-snug text-navy-900">
          <Link
            to={detailHref}
            className="rounded-sm transition-colors group-hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            {blog.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
          {blog.excerpt}
        </p>

        <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
          {blog.author.avatar ? (
            <img
              src={blog.author.avatar}
              alt={blog.author.avatarAlt ?? `Portrait of demo author ${blog.author.name}`}
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="size-9 shrink-0 rounded-full object-cover ring-2 ring-gold-500/60"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-[11px] font-bold text-gold-300"
            >
              {blog.author.initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-900">
              {blog.author.name}
            </p>
            <p className="text-xs text-muted">
              <time dateTime={blog.publishedAt}>{formatDateLong(blog.publishedAt)}</time>
              {" · "}
              {blog.readingTime} min read
            </p>
          </div>
        </div>

        <Link
          to={detailHref}
          className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          aria-label={`Read article: ${blog.title}`}
        >
          Read Article
          <ArrowRight
            size={15}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}

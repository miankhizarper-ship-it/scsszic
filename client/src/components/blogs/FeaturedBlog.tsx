import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { BlogAuthor } from "@/components/blogs/BlogAuthor";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type { Blog } from "@/types";

interface FeaturedBlogProps {
  /** Selected once at page level via getFeaturedBlog() — logic stays out of the component. */
  blog: Blog;
}

/**
 * FeaturedBlog — the large editorial feature on /blogs (spec §7).
 *
 * Desktop: two-column cover + copy. Mobile: stacks naturally.
 * Deliberately quieter than the events feature — generous whitespace and a
 * single gold accent instead of badge stacks, so the article itself leads.
 */
export function FeaturedBlog({ blog }: FeaturedBlogProps) {
  return (
    <section aria-labelledby="featured-blog-heading" className="bg-surface pb-4 pt-14 lg:pb-6 lg:pt-16">
      <Container>
        <Reveal>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
            Featured article
          </p>

          <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* Cover */}
            <Link
              to={ROUTES.blogDetail(blog.slug)}
              aria-label={`Read article: ${blog.title}`}
              className="group relative block min-w-0 overflow-hidden rounded-2xl border border-line shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <img
                src={blog.coverImage}
                alt={blog.coverImageAlt}
                width={1600}
                height={900}
                loading="eager"
                decoding="async"
                className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/25 via-transparent to-transparent"
              />
            </Link>

            {/* Copy */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="solidGold">{blog.category}</Badge>
              </div>

              <h2
                id="featured-blog-heading"
                className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-navy-900 text-balance sm:text-3xl lg:text-[2.1rem]"
              >
                <Link
                  to={ROUTES.blogDetail(blog.slug)}
                  className="rounded-sm transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  {blog.title}
                </Link>
              </h2>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
                {blog.excerpt}
              </p>

              <div className="mt-5">
                <BlogAuthor author={blog.author} variant="byline" />
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} aria-hidden="true" className="text-gold-600" />
                  <time dateTime={blog.publishedAt}>
                    {formatDateLong(blog.publishedAt)}
                  </time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} aria-hidden="true" className="text-gold-600" />
                  {blog.readingTime} min read
                </span>
              </p>

              <div className="mt-7">
                <Link
                  to={ROUTES.blogDetail(blog.slug)}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy-900 px-5 font-display text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Read Article
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

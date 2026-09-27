import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BlogCard } from "@/components/media/BlogCard";
import { ROUTES } from "@/routes/paths";
import type { Blog } from "@/types";

interface RelatedBlogsProps {
  /** Pre-selected via getRelatedBlogs() — selection logic lives in lib, not here. */
  blogs: Blog[];
}

/**
 * RelatedBlogs — "keep reading" section at the bottom of article pages.
 * Renders nothing when selection yields fewer than one item.
 */
export function RelatedBlogs({ blogs }: RelatedBlogsProps) {
  if (blogs.length === 0) return null;

  return (
    <section
      aria-labelledby="related-blogs-heading"
      className="border-t border-line bg-white py-16 lg:py-20"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
              Keep reading
            </p>
            <h2
              id="related-blogs-heading"
              className="mt-3 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
            >
              Related Articles
            </h2>
          </div>

          <Link
            to={ROUTES.blogs}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            View all articles
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog, index) => (
            <Reveal key={blog.id} delay={index * 0.07} className="h-full">
              <li className="h-full">
                <BlogCard blog={blog} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

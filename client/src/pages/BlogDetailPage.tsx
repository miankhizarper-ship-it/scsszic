import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, RefreshCcw, SearchX } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { BlogContent } from "@/components/blogs/BlogContent";
import { BlogAuthor } from "@/components/blogs/BlogAuthor";
import { BlogComments } from "@/components/blogs/BlogComments";
import { ShareButtons } from "@/components/blogs/ShareButtons";
import { RelatedBlogs } from "@/components/blogs/RelatedBlogs";
import { CTASection } from "@/components/sections/CTASection";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { useBlog, useRelatedBlogs } from "@/hooks/content";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { usePageMetadata } from "@/lib/seo";

/**
 * BlogDetailPage — the full article experience (/blogs/:slug).
 *
 * Order: Breadcrumb → Category → Title → Excerpt → Author → Date →
 * Reading time → Hero image → Article content → Tags → Share →
 * Related articles → CTA (spec §12).
 *
 * The header is a light, editorial treatment (distinct from the events navy
 * hero) so reading leads. Phase 8: the lookup runs against
 * GET /api/blogs/:slug — drafts and archived articles resolve to the same
 * Not Found state because they never leave the database (spec §13).
 */
export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  // Hooks stay unconditional; early returns come after them.
  const blogQuery = useBlog(slug);
  const blog = blogQuery.data;
  const relatedQuery = useRelatedBlogs(blog ? blog.slug : undefined);
  const related = relatedQuery.data ?? [];

  usePageMetadata({
    title: blog
      ? `${blog.title} | Society of Computer Science`
      : "Article Not Found | Society of Computer Science",
    description: blog
      ? (blog.seo?.description ?? blog.excerpt)
      : "Technology articles, tutorials, and insights from the Society of Computer Science.",
  });

  if (blogQuery.isPending) {
    return (
      <CollectionLoading
        rows={3}
        variant="row"
        className="bg-surface py-16 lg:py-24"
        label="Loading article…"
      />
    );
  }

  if (blogQuery.isError) {
    return (
      <div className="bg-surface py-16 lg:py-24">
        <Container>
          <ErrorState
            title="We couldn't load this article right now"
            description="The article is temporarily unavailable — the rest of the site is still available. Please try again."
            onRetry={() => void blogQuery.refetch()}
            className="mx-auto max-w-xl border-solid"
          />
        </Container>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex flex-1 items-center bg-surface">
        <Container className="py-20 lg:py-28">
          <EmptyState
            icon={SearchX}
            title="Article Not Found"
            description="This article doesn't exist or may have been unpublished. Browse the blog for everything the community has written."
            className="mx-auto max-w-xl border-solid"
          >
            <Button to={ROUTES.blogs} variant="navy">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Blogs
            </Button>
          </EmptyState>
        </Container>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Article header (editorial, light) ---------- */}
      <section aria-labelledby="blog-article-heading" className="bg-surface">
        <div aria-hidden="true" className="gold-hairline h-px w-full" />

        <Container className="max-w-4xl py-10 sm:py-12 lg:py-14">
          <nav aria-label="Breadcrumb">
            <Link
              to={ROUTES.blogs}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Blogs
            </Link>
          </nav>

          <Reveal className="mt-8">
            <Badge variant="solidGold">{blog.category}</Badge>

            <h1
              id="blog-article-heading"
              className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-navy-900 text-balance sm:text-4xl lg:text-[2.6rem]"
            >
              {blog.title}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              {blog.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
              <BlogAuthor author={blog.author} variant="byline" />

              <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={14} aria-hidden="true" className="text-gold-600" />
                  <dt className="sr-only">Published</dt>
                  <dd>
                    <time dateTime={blog.publishedAt}>
                      {formatDateLong(blog.publishedAt)}
                    </time>
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} aria-hidden="true" className="text-gold-600" />
                  <dt className="sr-only">Reading time</dt>
                  <dd>{blog.readingTime} min read</dd>
                </div>
                {blog.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <RefreshCcw size={13} aria-hidden="true" className="text-gold-600" />
                    <dt className="sr-only">Last updated</dt>
                    <dd>Updated {formatDateLong(blog.updatedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Reveal>
        </Container>

        {/* Hero image — wide editorial band */}
        <Container className="max-w-5xl pb-12 lg:pb-14">
          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-2xl border border-line shadow-sm">
              <img
                src={blog.coverImage}
                alt={blog.coverImageAlt}
                width={1600}
                height={900}
                loading="eager"
                decoding="async"
                className="aspect-[21/10] w-full object-cover"
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Article body ---------- */}
      <section aria-label="Article content" className="border-t border-line bg-white py-12 lg:py-16">
        <Container className="max-w-4xl">
          {/* Comfortable reading width (spec §14: 760–820px) */}
          <div className="mx-auto max-w-[780px]">
            <BlogContent blocks={blog.content} />

            {/* Tags */}
            {blog.tags.length > 0 && (
              <div className="mt-12 border-t border-line pt-8">
                <h2 className="sr-only">Article tags</h2>
                <ul className="flex flex-wrap gap-2" aria-label="Article tags">
                  {blog.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md border border-navy-100 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Share */}
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="sr-only">Share this article</h2>
              <ShareButtons title={blog.title} />
            </div>

            {/* Author card */}
            <div className="mt-10">
              <BlogAuthor author={blog.author} variant="card" />
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Conversation (Task 30) ---------- */}
      <BlogComments slug={blog.slug} />

      {/* ---------- Related articles ---------- */}
      <RelatedBlogs blogs={related} />

      {/* ---------- CTA ---------- */}
      <CTASection
        id="blog-cta"
        eyebrow="Keep Exploring"
        title="Turn reading into building"
        description="The best way to understand an article is to build what it describes. Join the Society of Computer Science to find teammates, mentors, and events that turn ideas into projects."
        primary={{ label: "Join the Community", to: ROUTES.signup }}
        secondary={{ label: "Explore All Articles", to: ROUTES.blogs }}
      />
    </>
  );
}

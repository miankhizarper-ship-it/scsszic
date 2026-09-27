import type { Blog } from "@/types";

/**
 * Pure blog filtering / sorting / selection helpers.
 *
 * Kept completely independent from React so the same contracts can be
 * re-used against the future `GET /api/blogs` endpoint (send the filters
 * as query params) without touching page or component code.
 *
 * Mirrors lib/eventSearch.ts conventions: plain data in, plain data out,
 * no side effects, no framework imports.
 */

export interface BlogFilters {
  /** Free-text query — matches title, excerpt, content text, category, tags, author name. */
  query: string;
  /** Selected category ("" = all). */
  category: string;
  /** Selected tag ("" = all). */
  tag: string;
}

/* ---------- Status gate ---------------------------------------------------- */

/**
 * The published-only gate. Draft and archived articles never reach public
 * pages; every other helper in this module assumes a published input, so
 * services call this first.
 */
export function getPublishedBlogs(blogs: Blog[]): Blog[] {
  return blogs.filter((blog) => blog.status === "published");
}

/* ---------- Sorting / lookup ------------------------------------------------ */

/** Most recent first — the canonical blog listing order. */
export function sortBlogsByDateDesc(blogs: Blog[]): Blog[] {
  return [...blogs].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Lookup by URL slug for /blogs/:slug. */
export function getBlogBySlug(
  blogs: Blog[],
  slug: string | undefined,
): Blog | undefined {
  if (!slug) return undefined;
  return blogs.find((blog) => blog.slug === slug);
}

/** The single featured article highlighted on /blogs. */
export function getFeaturedBlog(blogs: Blog[]): Blog | undefined {
  return blogs.find((blog) => blog.featured);
}

/* ---------- Filtering -------------------------------------------------------- */

/**
 * Flatten a content block to searchable plain text. Code blocks are included
 * (searching "pandas" should find the notebook article); callouts and quotes
 * are searched via their visible text.
 */
function blockText(block: Blog["content"][number]): string {
  switch (block.type) {
    case "paragraph":
    case "quote":
    case "callout":
      return block.text;
    case "heading":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "code":
      return `${block.caption ?? ""} ${block.code}`;
    default:
      return "";
  }
}

/**
 * Filter published blogs by query + category + tag.
 * Empty string on any filter means "no constraint".
 */
export function filterBlogs(blogs: Blog[], filters: BlogFilters): Blog[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return blogs.filter((blog) => {
    if (filters.category && blog.category !== filters.category) return false;

    if (filters.tag && !blog.tags.includes(filters.tag)) return false;

    if (normalizedQuery) {
      const haystack = [
        blog.title,
        blog.excerpt,
        blog.category,
        blog.author.name,
        blog.tags.join(" "),
        blog.content.map(blockText).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/* ---------- Tag cloud support ------------------------------------------------- */

/**
 * The most frequent tags across the dataset — used for the compact tag
 * filter row. Sorted by count then alphabetically, so the output is stable.
 */
export function getPopularTags(blogs: Blog[], limit = 10): string[] {
  const counts = new Map<string, number>();

  for (const blog of blogs) {
    for (const tag of blog.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

/* ---------- Related-article selection ----------------------------------------- */

/**
 * Pick related articles for a detail page (spec §19).
 *
 * Scoring: same category weighs most, overlapping tags add up, and equal
 * scores break by recency so suggestions stay fresh. Excludes the current
 * article. Pure and extracted from the component so it can move server-side
 * (or into a query hook) without UI changes.
 */
export function getRelatedBlogs(
  blogs: Blog[],
  current: Blog,
  count = 3,
): Blog[] {
  const currentTags = new Set(current.tags);

  const scored = blogs
    .filter((blog) => blog.id !== current.id)
    .map((blog) => {
      let score = 0;
      if (blog.category === current.category) score += 2;
      for (const tag of blog.tags) {
        if (currentTags.has(tag)) score += 1;
      }

      return {
        blog,
        score,
        time: new Date(blog.publishedAt).getTime(),
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest first
    });

  return scored.slice(0, count).map((entry) => entry.blog);
}

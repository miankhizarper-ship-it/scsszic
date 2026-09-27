import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Feed CMS body/query validation (Phase 9F) — server-side,
 * authoritative, mirroring the EXACT fields of the existing FeedPost model
 * (client/src/types FeedPost, stored flat in the feed_posts collection).
 * No invented fields and no new content schema: the five existing post
 * types (announcement/project/community/article/event) and their
 * type-specific reference conventions are preserved exactly — project posts
 * carry projectSlug, event posts carry eventSlug, article posts carry
 * blogSlug (the seed data's actual structure). Type-specific requirements
 * are enforced with superRefine.
 *
 * Reference slugs (authorUsername/projectSlug/eventSlug/blogSlug) are
 * format-validated here; EXISTENCE against the members/projects/events/
 * blogs collections is enforced by the controller so no dangling
 * references can be persisted.
 *
 * Conventions follow http/eventSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical FeedPostType union (5 existing types). */
export const FEED_TYPES = ["announcement", "project", "event", "article", "community"] as const;

/** Same shape as the canonical FeedPostStatus union. */
export const FEED_STATUSES = ["published", "archived"] as const;

/** Slugs follow the existing sanitizeSlug pattern (kebab-ish, lowercase). */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required.")
  .max(80, "Slug must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Reference slug — format validated here, existence by the controller. */
const refSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Reference cannot be empty.")
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Full ISO 8601 timestamp (the model's publishedAt shape, e.g. 2026-09-08T13:10:00Z). */
const isoTimestampSchema = z
  .string()
  .trim()
  .min(1, "Publication timestamp is required.")
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }, "Use a valid ISO timestamp (e.g. 2026-09-08T13:10:00Z).");

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tags cannot be empty.")
  .max(40, "Tags must be at most 40 characters.");

/** The full create payload — every FeedPost-model field, nothing more. */
const adminFeedCreateObject = z
  .object({
    slug: slugSchema,
    type: z.enum(FEED_TYPES, { message: "Choose a valid post type." }),
    authorUsername: refSlugSchema.optional(),
    authorName: z.string().trim().min(1, "Author name is required.").max(120),
    title: z.string().trim().min(1, "Title is required.").max(200),
    excerpt: z.string().trim().min(1, "Excerpt is required.").max(500),
    content: z.string().trim().max(20_000).optional(),
    projectSlug: refSlugSchema.optional(),
    eventSlug: refSlugSchema.optional(),
    blogSlug: refSlugSchema.optional(),
    image: z.string().trim().max(500).optional(),
    imageAlt: z.string().trim().max(200).optional(),
    publishedAt: isoTimestampSchema,
    tags: z.array(tagSchema).max(20),
    likes: z.coerce.number().int("Likes must be a whole number.").min(0).max(1_000_000).optional(),
    comments: z.coerce.number().int("Comments must be a whole number.").min(0).max(1_000_000).optional(),
    status: z.enum(FEED_STATUSES, { message: "Choose a valid status." }),
  })
  .strict();

export const adminFeedCreateSchema = adminFeedCreateObject.superRefine((post, ctx) => {
  // Type-specific reference requirements — the seed data's actual
  // structure: project posts reference projects, event posts reference
  // events, article posts reference blogs.
  if (post.type === "project" && !post.projectSlug) {
    ctx.addIssue({ code: "custom", path: ["projectSlug"], message: "Project posts must reference a project." });
  }
  if (post.type === "event" && !post.eventSlug) {
    ctx.addIssue({ code: "custom", path: ["eventSlug"], message: "Event posts must reference an event." });
  }
  if (post.type === "article" && !post.blogSlug) {
    ctx.addIssue({ code: "custom", path: ["blogSlug"], message: "Article posts must reference a blog article." });
  }
});

/**
 * PATCH — same shape, every field optional. System fields never pass.
 * Type-specific invariants are enforced on the MERGED record: the update
 * controller re-validates {...existing, ...input} against the create
 * schema, so a post can never end up as a project/event/article type
 * without its required reference.
 */
export const adminFeedUpdateSchema = adminFeedCreateObject.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminFeedStatusSchema = z.object({
  status: z.enum(FEED_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — only filters backed by actual model fields. */
export const adminFeedListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  type: z.enum(FEED_TYPES).optional(),
  status: z.enum(FEED_STATUSES).optional(),
  authorUsername: refSlugSchema.optional(),
  projectSlug: refSlugSchema.optional(),
  event: refSlugSchema.optional(),
  sort: z
    .enum(["published_desc", "published_asc", "title_asc", "title_desc"])
    .default("published_desc"),
});

/** Feed ids look like "feed-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeFeedId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function feedFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminFeedCreateInput = z.infer<typeof adminFeedCreateSchema>;
export type AdminFeedUpdateInput = z.infer<typeof adminFeedUpdateSchema>;
export type AdminFeedListQuery = z.infer<typeof adminFeedListQuerySchema>;

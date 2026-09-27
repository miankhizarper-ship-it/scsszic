import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Blogs CMS body/query validation (Phase 9D) — server-side,
 * authoritative, mirroring the EXACT fields of the existing Blog model
 * (client/src/types Blog + BlogContentBlock + BlogAuthorProfile). No
 * invented fields; the publication lifecycle (draft/published/archived)
 * and its public-visibility semantics are preserved untouched.
 *
 * Conventions follow http/eventSchemas.ts (Phase 9C): invalid input →
 * 400 with `{ message, errors }` field-level messages.
 */

/* ------------------------------ shared pieces ------------------------------ */

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Slug must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Use a valid calendar date.");

/** Embedded author snapshot — the Blog model stores authors denormalized. */
export const blogAuthorSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1, "Author name is required.").max(120),
  role: z.string().trim().min(1, "Author role is required.").max(120),
  initials: z.string().trim().min(1, "Author initials are required.").max(4),
  avatar: z.string().trim().max(500).optional(),
  avatarAlt: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
});

/** The Blog model's own status lifecycle — unchanged semantics. */
export const BLOG_STATUSES = ["draft", "published", "archived"] as const;

/**
 * Structured content blocks — discriminated on `type`, 1:1 with the
 * canonical BlogContentBlock union the public renderer maps onto markup.
 */
export const blogContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1, "Paragraph text is required.").max(20_000) }),
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: z.string().trim().min(1, "Heading text is required.").max(300) }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().optional(),
    items: z.array(z.string().trim().min(1, "List items cannot be empty.").max(2_000)).min(1, "A list needs at least one item.").max(50),
  }),
  z.object({
    type: z.literal("code"),
    language: z.string().trim().min(1, "Code language is required.").max(40),
    code: z.string().trim().min(1, "Code is required.").max(20_000),
    caption: z.string().trim().max(300).optional(),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().trim().min(1, "Quote text is required.").max(2_000),
    attribution: z.string().trim().max(120).optional(),
  }),
  z.object({
    type: z.literal("callout"),
    variant: z.enum(["takeaway", "tip", "note"], { message: "Choose a valid callout variant." }),
    title: z.string().trim().min(1, "Callout title is required.").max(120),
    text: z.string().trim().min(1, "Callout text is required.").max(2_000),
  }),
]);

export const blogSeoSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

/** The full create payload — every Blog-model field, nothing more. */
export const adminBlogCreateSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1, "Title is required.").max(200),
    excerpt: z.string().trim().min(1, "Excerpt is required.").max(500),
    content: z.array(blogContentBlockSchema).min(1, "An article needs at least one content block.").max(300),
    coverImage: z.string().trim().min(1, "Cover image is required.").max(500),
    coverImageAlt: z.string().trim().min(1, "Cover image alt text is required.").max(200),
    author: blogAuthorSchema,
    category: z.string().trim().min(1, "Category is required.").max(60),
    tags: z.array(z.string().trim().min(1, "Tags cannot be empty.").max(40)).max(20),
    publishedAt: isoDateSchema,
    readingTime: z
      .number({ message: "Reading time must be a number." })
      .int("Reading time must be a whole number of minutes.")
      .min(1, "Reading time must be at least 1 minute.")
      .max(120, "Reading time must be at most 120 minutes."),
    featured: z.boolean().optional(),
    status: z.enum(BLOG_STATUSES, { message: "Choose a valid status." }),
    seo: blogSeoSchema.optional(),
    updatedAt: isoDateSchema.optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminBlogUpdateSchema = adminBlogCreateSchema.partial();

/** Dedicated status transition — draft/published/archived semantics only. */
export const adminBlogStatusSchema = z.object({
  status: z.enum(BLOG_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — practical server-side controls. */
export const adminBlogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(BLOG_STATUSES).optional(),
  category: z.string().trim().max(60).optional(),
  authorId: z.string().trim().max(80).optional(),
  sort: z
    .enum(["published_desc", "published_asc", "title_asc", "title_desc", "updated_desc"])
    .default("published_desc"),
});

/** Blog ids look like "blog-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeBlogId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function blogFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminBlogCreateInput = z.infer<typeof adminBlogCreateSchema>;
export type AdminBlogUpdateInput = z.infer<typeof adminBlogUpdateSchema>;
export type AdminBlogListQuery = z.infer<typeof adminBlogListQuerySchema>;

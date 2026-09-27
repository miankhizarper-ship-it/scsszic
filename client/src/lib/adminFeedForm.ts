import { z } from "zod";

import type { FeedPost } from "@/types";

/**
 * Client-side form schema for the admin Feed form (Phase 9F).
 *
 * Mirrors server/src/http/feedSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative (including reference
 * existence for author/project/event/blog). The five existing post types
 * and their type-specific reference conventions are preserved: project
 * posts reference a project, event posts reference an event, article posts
 * reference a blog — enforced with superRefine so the form's required
 * fields change with the selected type, exactly like the model.
 */

export const FEED_TYPES = ["announcement", "project", "event", "article", "community"] as const;

export const FEED_STATUSES = ["published", "archived"] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

export const feedFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Slug is required.")
      .max(80, "Slug must be at most 80 characters.")
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only."),
    type: z.enum(FEED_TYPES, { message: "Choose a valid post type." }),
    authorUsername: optionalText("Author username", 80),
    authorName: requiredText("Author name", 120),
    title: requiredText("Title", 200),
    excerpt: requiredText("Excerpt", 500),
    content: optionalText("Content", 20000),
    projectSlug: optionalText("Project", 80),
    eventSlug: optionalText("Event", 80),
    blogSlug: optionalText("Blog article", 80),
    image: optionalText("Image path/URL", 500),
    imageAlt: optionalText("Image alt text", 200),
    /** datetime-local value, e.g. 2026-09-08T13:10 — converted to ISO on submit. */
    publishedAtLocal: z
      .string()
      .trim()
      .min(1, "Publication date is required.")
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a valid date and time."),
    tags: z
      .string()
      .trim()
      .max(400, "Tags must be at most 400 characters.")
      .optional()
      .or(z.literal("")),
    likes: z
      .string()
      .trim()
      .refine((value) => {
        if (value === "") return true;
        const n = Number(value);
        return Number.isInteger(n) && n >= 0;
      }, "Likes must be a whole number."),
    comments: z
      .string()
      .trim()
      .refine((value) => {
        if (value === "") return true;
        const n = Number(value);
        return Number.isInteger(n) && n >= 0;
      }, "Comments must be a whole number."),
    status: z.enum(FEED_STATUSES, { message: "Choose a valid status." }),
  })
  .superRefine((post, ctx) => {
    // Type-specific reference requirements — the seed data's actual
    // structure (project → project, event → event, article → blog).
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

export type FeedFormValues = z.infer<typeof feedFormSchema>;

/** "Campus Connect v0.3" → "campus-connect-v03" (same slugify as blogs). */
export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** ISO timestamp → datetime-local value (UTC pinned, minute precision). */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

/** datetime-local value → UTC ISO timestamp (the model's publishedAt shape). */
function toIsoTimestamp(local: string): string {
  return `${local}:00Z`;
}

/** Fetched post → form values. */
export function toFeedFormValues(post: FeedPost): FeedFormValues {
  return {
    slug: post.slug,
    type: post.type,
    authorUsername: post.authorUsername ?? "",
    authorName: post.authorName,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content ?? "",
    projectSlug: post.projectSlug ?? "",
    eventSlug: post.eventSlug ?? "",
    blogSlug: post.blogSlug ?? "",
    image: post.image ?? "",
    imageAlt: post.imageAlt ?? "",
    publishedAtLocal: toLocalInput(post.publishedAt),
    tags: (post.tags ?? []).join(", "),
    likes: String(post.likes ?? 0),
    comments: String(post.comments ?? 0),
    status: post.status,
  };
}

/** Create defaults — published announcement dated now, member fields blank. */
export function feedFormDefaults(): FeedFormValues {
  const now = new Date();
  now.setSeconds(0, 0);
  return {
    slug: "",
    type: "announcement",
    authorUsername: "",
    authorName: "",
    title: "",
    excerpt: "",
    content: "",
    projectSlug: "",
    eventSlug: "",
    blogSlug: "",
    image: "",
    imageAlt: "",
    publishedAtLocal: toLocalInput(now.toISOString()),
    tags: "",
    likes: "",
    comments: "",
    status: "published",
  };
}

/** Form values → API payload (exact FeedPost model shape). */
export function toFeedPayload(values: FeedFormValues): Partial<FeedPost> {
  const tags = (values.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    slug: values.slug,
    type: values.type,
    ...(values.authorUsername ? { authorUsername: values.authorUsername } : {}),
    authorName: values.authorName,
    title: values.title,
    excerpt: values.excerpt,
    ...(values.content ? { content: values.content } : {}),
    ...(values.projectSlug ? { projectSlug: values.projectSlug } : {}),
    ...(values.eventSlug ? { eventSlug: values.eventSlug } : {}),
    ...(values.blogSlug ? { blogSlug: values.blogSlug } : {}),
    ...(values.image ? { image: values.image } : {}),
    ...(values.imageAlt ? { imageAlt: values.imageAlt } : {}),
    publishedAt: toIsoTimestamp(values.publishedAtLocal),
    tags,
    likes: values.likes === "" ? 0 : Number(values.likes),
    comments: values.comments === "" ? 0 : Number(values.comments),
    status: values.status,
  };
}

import { z } from "zod";

import type { Blog, BlogContentBlock } from "@/types";

/**
 * Client-side form schema for the admin Blog form (Phase 9D).
 *
 * Mirrors server/src/http/blogSchemas.ts field-for-field — client validation
 * is UX; the server remains authoritative. The structured content blocks use
 * a FLAT editing shape (one uniform object per block so react-hook-form
 * field arrays work) with a superRefine pass that produces per-type errors;
 * toBlogPayload() converts back into the exact BlogContentBlock union the
 * public renderer consumes. No new block types, no new fields.
 */

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;

export const BLOCK_TYPES = ["paragraph", "heading", "list", "code", "quote", "callout"] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

const isoDate = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).");

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

/** Flat per-block editing shape — the superset of every block's fields. */
const blockShape = z.object({
  type: z.enum(BLOCK_TYPES),
  // paragraph / heading / quote / callout text
  text: optionalText("Text", 20000),
  // heading level (kept as string for the select; converted on submit)
  level: z.enum(["2", "3"]).optional(),
  // list
  ordered: z.boolean().optional(),
  items: optionalText("List items", 100000),
  // code
  language: optionalText("Language", 40),
  code: optionalText("Code", 20000),
  caption: optionalText("Caption", 300),
  // quote
  attribution: optionalText("Attribution", 120),
  // callout
  variant: z.enum(["takeaway", "tip", "note"]).optional(),
  blockTitle: optionalText("Title", 120),
});

export const blogFormSchema = z
  .object({
    title: requiredText("Title", 200),
    excerpt: requiredText("Excerpt", 500),
    category: requiredText("Category", 60),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Tags cannot be empty.")
          .max(40, "Each tag must be at most 40 characters."),
      )
      .max(20, "An article can have at most 20 tags."),
    coverImage: requiredText("Cover image", 500),
    coverImageAlt: requiredText("Cover image alt text", 200),
    authorId: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Author id is required.")
      .max(80)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only."),
    authorName: requiredText("Author name", 120),
    authorRole: requiredText("Author role", 120),
    authorInitials: z
      .string()
      .trim()
      .min(1, "Author initials are required.")
      .max(4, "Initials must be at most 4 characters."),
    authorAvatar: optionalText("Avatar", 500),
    authorBio: optionalText("Author bio", 2000),
    publishedAt: isoDate,
    readingTime: z
      .string()
      .trim()
      .min(1, "Reading time is required.")
      .refine((value) => {
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 120;
      }, "Reading time must be a whole number between 1 and 120."),
    featured: z.boolean(),
    status: z.enum(BLOG_STATUSES, { message: "Choose a valid status." }),
    seoTitle: optionalText("SEO title", 200),
    seoDescription: optionalText("SEO description", 500),
    content: z.array(blockShape).min(1, "An article needs at least one content block.").max(300),
  })
  .superRefine((form, ctx) => {
    form.content.forEach((block, index) => {
      const path = (field: string) => `content.${index}.${field}`;
      switch (block.type) {
        case "paragraph":
        case "quote":
          if (!block.text?.trim()) ctx.addIssue({ code: "custom", path: [path("text")], message: "Text is required." });
          break;
        case "heading":
          if (!block.text?.trim()) ctx.addIssue({ code: "custom", path: [path("text")], message: "Heading text is required." });
          break;
        case "list": {
          const items = (block.items ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
          if (items.length === 0) {
            ctx.addIssue({ code: "custom", path: [path("items")], message: "Add at least one list item (one per line)." });
          }
          break;
        }
        case "code":
          if (!block.language?.trim()) ctx.addIssue({ code: "custom", path: [path("language")], message: "Language is required." });
          if (!block.code?.trim()) ctx.addIssue({ code: "custom", path: [path("code")], message: "Code is required." });
          break;
        case "callout":
          if (!block.blockTitle?.trim()) ctx.addIssue({ code: "custom", path: [path("blockTitle")], message: "Callout title is required." });
          if (!block.text?.trim()) ctx.addIssue({ code: "custom", path: [path("text")], message: "Callout text is required." });
          break;
      }
    });
  });

export type BlogFormValues = z.infer<typeof blogFormSchema>;

/** Flat block → the canonical BlogContentBlock union (public renderer contract). */
function toContentBlock(block: BlogFormValues["content"][number]): BlogContentBlock {
  switch (block.type) {
    case "paragraph":
      return { type: "paragraph", text: block.text ?? "" };
    case "heading":
      return { type: "heading", level: (block.level === "3" ? 3 : 2), text: block.text ?? "" };
    case "list":
      return {
        type: "list",
        ordered: block.ordered ?? false,
        items: (block.items ?? "").split("\n").map((item) => item.trim()).filter(Boolean),
      };
    case "code":
      return {
        type: "code",
        language: block.language ?? "",
        code: block.code ?? "",
        ...(block.caption ? { caption: block.caption } : {}),
      };
    case "quote":
      return {
        type: "quote",
        text: block.text ?? "",
        ...(block.attribution ? { attribution: block.attribution } : {}),
      };
    case "callout":
      return {
        type: "callout",
        variant: block.variant ?? "note",
        title: block.blockTitle ?? "",
        text: block.text ?? "",
      };
  }
}

/** "10:00, Machine Learning" → kebab-case (shared with the events form). */
export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Fetched blog → form values (blocks become flat editable shapes). */
export function toBlogFormValues(blog: Blog): BlogFormValues {
  return {
    title: blog.title,
    excerpt: blog.excerpt,
    category: blog.category,
    tags: blog.tags ?? [],
    coverImage: blog.coverImage,
    coverImageAlt: blog.coverImageAlt,
    authorId: blog.author.id,
    authorName: blog.author.name,
    authorRole: blog.author.role,
    authorInitials: blog.author.initials,
    authorAvatar: blog.author.avatar ?? "",
    authorBio: blog.author.bio ?? "",
    publishedAt: blog.publishedAt,
    readingTime: String(blog.readingTime),
    featured: Boolean(blog.featured),
    status: blog.status,
    seoTitle: blog.seo?.title ?? "",
    seoDescription: blog.seo?.description ?? "",
    content: (blog.content ?? []).map((block) => {
      switch (block.type) {
        case "paragraph":
        case "quote":
          return flatBlock(block.type, { text: block.text });
        case "heading":
          return flatBlock("heading", { text: block.text, level: String(block.level) as "2" | "3" });
        case "list":
          return flatBlock("list", { ordered: Boolean(block.ordered), items: block.items.join("\n") });
        case "code":
          return flatBlock("code", { language: block.language, code: block.code, caption: block.caption ?? "" });
        case "callout":
          return flatBlock("callout", { variant: block.variant, blockTitle: block.title, text: block.text });
      }
    }),
  };
}

function flatBlock(
  type: BlockType,
  fields: Partial<BlogFormValues["content"][number]>,
): BlogFormValues["content"][number] {
  return {
    type,
    text: "",
    ordered: false,
    items: "",
    language: "",
    code: "",
    caption: "",
    attribution: "",
    variant: "note",
    blockTitle: "",
    level: "2",
    ...fields,
  };
}

/** Create defaults — one starter paragraph so the article is never empty. */
export function blogFormDefaults(): BlogFormValues {
  return {
    title: "",
    excerpt: "",
    category: "",
    tags: [],
    coverImage: "",
    coverImageAlt: "",
    authorId: "",
    authorName: "",
    authorRole: "",
    authorInitials: "",
    authorAvatar: "",
    authorBio: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    readingTime: "5",
    featured: false,
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    content: [flatBlock("paragraph", {})],
  };
}

/** Form values → API payload (exact Blog model shape). The slug is
 *  server-generated (Task 16) and never sent from the form. */
export function toBlogPayload(values: BlogFormValues): Partial<Blog> {
  return {
    title: values.title,
    excerpt: values.excerpt,
    content: values.content.map(toContentBlock),
    coverImage: values.coverImage,
    coverImageAlt: values.coverImageAlt,
    author: {
      id: values.authorId,
      name: values.authorName,
      role: values.authorRole,
      initials: values.authorInitials,
      ...(values.authorAvatar ? { avatar: values.authorAvatar } : {}),
      ...(values.authorBio ? { bio: values.authorBio } : {}),
    },
    category: values.category,
    tags: values.tags,
    publishedAt: values.publishedAt,
    readingTime: Number(values.readingTime),
    featured: values.featured,
    status: values.status,
    ...(values.seoTitle || values.seoDescription
      ? {
          seo: {
            ...(values.seoTitle ? { title: values.seoTitle } : {}),
            ...(values.seoDescription ? { description: values.seoDescription } : {}),
          },
        }
      : {}),
  };
}

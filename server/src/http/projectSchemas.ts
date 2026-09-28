import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Projects CMS body/query validation (Phase 9F) — server-side,
 * authoritative, mirroring the EXACT fields of the existing Project model
 * (client/src/types Project). No invented fields: the model's own lifecycle
 * (active/completed/archived) stays the single status dimension, and the
 * PUBLIC repository's active+completed visibility gate is untouched —
 * archived projects remain private while admins see them here.
 *
 * Team roster and event references (ownerUsername / memberUsernames /
 * eventSlug) are format-validated here; EXISTENCE against the members and
 * events collections is enforced by the controller so no dangling
 * references can be persisted.
 *
 * Conventions follow http/eventSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical ProjectStatus union. */
export const PROJECT_STATUSES = ["active", "completed", "archived"] as const;

/** Slugs follow the existing sanitizeSlug pattern (kebab-ish, lowercase). */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required.")
  .max(80, "Slug must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Username reference — format validated here, existence by the controller. */
const usernameRefSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Username cannot be empty.")
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Event slug reference — format validated here, existence by the controller. */
const eventSlugRefSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Event slug cannot be empty.")
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** ISO calendar date (YYYY-MM-DD) that is actually a real date. */
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Use a valid calendar date.");

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tags cannot be empty.")
  .max(40, "Tags must be at most 40 characters.");

const techSchema = z
  .string()
  .trim()
  .min(1, "Technologies cannot be empty.")
  .max(60, "Technologies must be at most 60 characters.");

/** The full create payload — every Project-model field, nothing more.
 *  `slug` is OPTIONAL (Task 16): when absent the controller auto-generates
 *  a unique handle from the title via generateUniqueHandle(). */
export const adminProjectCreateSchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(1, "Title is required.").max(200),
    tagline: z.string().trim().min(1, "Tagline is required.").max(300),
    description: z.string().trim().min(1, "Description is required.").max(20_000),
    coverImage: z.string().trim().min(1, "Cover image is required.").max(500),
    coverImageAlt: z.string().trim().min(1, "Cover image alt text is required.").max(200),
    category: z.string().trim().min(1, "Category is required.").max(60),
    technologies: z.array(techSchema).min(1, "Add at least one technology.").max(30),
    status: z.enum(PROJECT_STATUSES, { message: "Choose a valid status." }),
    ownerUsername: usernameRefSchema,
    memberUsernames: z.array(usernameRefSchema).min(1, "Add at least one team member.").max(30),
    eventSlug: eventSlugRefSchema.optional(),
    startedAt: isoDateSchema,
    updatedAt: isoDateSchema.optional(),
    tags: z.array(tagSchema).max(20),
    repositoryUrl: z.string().trim().max(500).optional(),
    liveUrl: z.string().trim().max(500).optional(),
    featured: z.boolean().optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminProjectUpdateSchema = adminProjectCreateSchema.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — only filters backed by actual model fields. */
export const adminProjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(PROJECT_STATUSES).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  /** Event reference filter (exact eventSlug). */
  event: eventSlugRefSchema.optional(),
  /** Technology filter — case-insensitive exact membership (public formula). */
  technology: z.string().trim().min(1).max(60).optional(),
  sort: z
    .enum(["updated_desc", "started_desc", "started_asc", "title_asc", "title_desc"])
    .default("updated_desc"),
});

/** Project ids look like "proj-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeProjectId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function projectFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminProjectCreateInput = z.infer<typeof adminProjectCreateSchema>;
export type AdminProjectUpdateInput = z.infer<typeof adminProjectUpdateSchema>;
export type AdminProjectListQuery = z.infer<typeof adminProjectListQuerySchema>;

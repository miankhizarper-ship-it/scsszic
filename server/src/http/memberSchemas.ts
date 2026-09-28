import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Members CMS body/query validation (Phase 9E) — server-side,
 * authoritative, mirroring the EXACT fields of the existing Member model
 * (client/src/types Member). No invented fields, no second lifecycle: the
 * model's own directory status (active/alumni/archived) stays the single
 * lifecycle, and the PUBLIC repository's archived-exclusion gate is untouched
 * — archived members remain private (spec §13) while admins see them here.
 *
 * Conventions follow http/eventSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical MemberStatus union. */
export const MEMBER_STATUSES = ["active", "alumni", "archived"] as const;

/** Profile handles follow the existing sanitizeSlug pattern (kebab-ish). */
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Username is required.")
  .max(80, "Username must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Project slug reference — format validated here, existence by the controller. */
const projectSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Project slugs cannot be empty.")
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/** Social map: platform key → href (the model's exact social shape). */
const socialMapSchema = z
  .record(
    z.string().trim().min(1, "Platform key is required.").max(40),
    z.string().trim().min(1, "Link URL is required.").max(500),
  )
  .refine((map) => Object.keys(map).length <= 10, "At most 10 social links are allowed.");

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

/** The full create payload — every Member-model field, nothing more.
 *  `username` is OPTIONAL (Task 16): when absent the controller
 *  auto-generates a unique handle from the name via generateUniqueHandle(). */
export const adminMemberCreateSchema = z
  .object({
    username: usernameSchema.optional(),
    name: z.string().trim().min(1, "Name is required.").max(120),
    initials: z.string().trim().min(1, "Initials are required.").max(4),
    avatar: z.string().trim().max(500).optional(),
    avatarAlt: z.string().trim().max(200).optional(),
    role: z.string().trim().min(1, "Role is required.").max(120),
    company: z.string().trim().max(120).optional(),
    batch: z.string().trim().min(1, "Batch label is required.").max(40),
    batchYear: z.coerce
      .number()
      .int("Batch year must be a whole number.")
      .min(1990, "Batch year must be 1990 or later.")
      .max(2100, "Batch year must be 2100 or earlier."),
    department: z.string().trim().max(120).optional(),
    domain: z.string().trim().min(1, "Domain is required.").max(80),
    location: z.string().trim().max(120).optional(),
    bio: z.string().trim().min(1, "Bio is required.").max(4000),
    skills: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Skills cannot be empty.")
          .max(60, "Skills must be at most 60 characters."),
      )
      .max(30),
    interests: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Interests cannot be empty.")
          .max(60, "Interests must be at most 60 characters."),
      )
      .max(30),
    social: socialMapSchema.optional(),
    projectSlugs: z.array(projectSlugSchema).max(20).optional(),
    joinedAt: isoDateSchema.optional(),
    status: z.enum(MEMBER_STATUSES, { message: "Choose a valid status." }),
    featured: z.boolean().optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminMemberUpdateSchema = adminMemberCreateSchema.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminMemberStatusSchema = z.object({
  status: z.enum(MEMBER_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — only filters backed by actual model fields. */
export const adminMemberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(MEMBER_STATUSES).optional(),
  domain: z.string().trim().min(1).max(80).optional(),
  /** Graduation-year filter — the model's real filter dimension (YYYY). */
  batch: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Use a valid batch year (YYYY).")
    .optional(),
  featured: z
    .enum(["true", "false"], { message: "Featured must be true or false." })
    .optional(),
  sort: z
    .enum(["batch_desc", "batch_asc", "name_asc", "name_desc", "featured_desc"])
    .default("batch_desc"),
});

/** Member ids look like "mem-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeMemberId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function memberFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminMemberCreateInput = z.infer<typeof adminMemberCreateSchema>;
export type AdminMemberUpdateInput = z.infer<typeof adminMemberUpdateSchema>;
export type AdminMemberListQuery = z.infer<typeof adminMemberListQuerySchema>;

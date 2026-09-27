import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Alumni CMS body/query validation (Phase 9E) — server-side,
 * authoritative, mirroring the EXACT fields of the existing Alumnus model
 * (client/src/types Alumnus, serialized socials). No invented fields: the
 * alumni dataset has no draft/archived lifecycle (every alumnus is public,
 * Phase 2 behavior), so there is deliberately NO status schema here.
 *
 * Conventions follow http/eventSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical AlumniField union (7 values). */
export const ALUMNI_FIELDS = [
  "Software Engineering",
  "AI/ML",
  "Data Science",
  "Cybersecurity",
  "Web Development",
  "Research",
  "Entrepreneurship",
] as const;

/** Profile handles follow the existing sanitizeSlug pattern (kebab-ish). */
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Username is required.")
  .max(80, "Username must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

const socialLinkSchema = z.object({
  label: z.string().trim().min(1, "Link label is required.").max(80),
  href: z.string().trim().min(1, "Link URL is required.").max(500),
  icon: z.string().trim().min(1, "Link icon key is required.").max(40),
});

/** The full create payload — every Alumnus-model field, nothing more. */
export const adminAlumniCreateSchema = z
  .object({
    username: usernameSchema,
    name: z.string().trim().min(1, "Name is required.").max(120),
    batch: z.string().trim().min(1, "Batch label is required.").max(40),
    batchYear: z.coerce
      .number()
      .int("Batch year must be a whole number.")
      .min(1990, "Batch year must be 1990 or later.")
      .max(2100, "Batch year must be 2100 or earlier."),
    role: z.string().trim().min(1, "Role is required.").max(120),
    company: z.string().trim().min(1, "Company is required.").max(120),
    achievement: z.string().trim().min(1, "Achievement summary is required.").max(500),
    field: z.enum(ALUMNI_FIELDS, { message: "Choose a valid professional field." }),
    initials: z.string().trim().min(1, "Initials are required.").max(4),
    image: z.string().trim().max(500).optional(),
    imageAlt: z.string().trim().max(200).optional(),
    bio: z.string().trim().max(4000).optional(),
    skills: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Skills cannot be empty.")
          .max(60, "Skills must be at most 60 characters."),
      )
      .max(30)
      .optional(),
    careerHighlights: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Highlights cannot be empty.")
          .max(300, "Highlights must be at most 300 characters."),
      )
      .max(20)
      .optional(),
    socials: z.array(socialLinkSchema).max(10).optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminAlumniUpdateSchema = adminAlumniCreateSchema.partial();

/** Admin list query — only filters backed by actual model fields. */
export const adminAlumniListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  field: z.enum(ALUMNI_FIELDS).optional(),
  /** Graduation-year filter — the model's real filter dimension (YYYY). */
  batch: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Use a valid batch year (YYYY).")
    .optional(),
  sort: z.enum(["batch_desc", "batch_asc", "name_asc", "name_desc"]).default("batch_desc"),
});

/** Alumni ids look like "al-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeAlumniId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function alumniFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminAlumniCreateInput = z.infer<typeof adminAlumniCreateSchema>;
export type AdminAlumniUpdateInput = z.infer<typeof adminAlumniUpdateSchema>;
export type AdminAlumniListQuery = z.infer<typeof adminAlumniListQuerySchema>;

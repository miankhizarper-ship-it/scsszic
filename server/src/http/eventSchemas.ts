import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Events CMS body/query validation (Phase 9C) — server-side,
 * authoritative, mirroring the EXACT fields of the existing Event model
 * (client/src/types SocietyEvent). No invented fields: whatever the public
 * model does not carry, these schemas do not accept.
 *
 * Conventions follow http/querySchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/**
 * Same shape the canonical EventCategory union originally had (7 values).
 * Kept ONLY for tooling/reference since Phase 10C — the create/update/list
 * schemas accept any admin-managed category string, matching blogs/gallery/
 * videos/projects, so the vocabulary can grow without code changes.
 */
export const EVENT_CATEGORIES = [
  "Workshops",
  "Seminars",
  "Hackathons",
  "Competitions",
  "Tech Talks",
  "Community",
  "Career",
] as const;

/** Same shape as the canonical EventStatus union. */
export const EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled"] as const;

/** Slugs follow the existing sanitizeSlug pattern (kebab-ish, lowercase). */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Slug must be at most 80 characters.")
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

/** Display time strings, e.g. "10:00 AM" — free text, bounded. */
const timeSchema = z.string().trim().min(1, "Time is required.").max(20);

const speakerSchema = z.object({
  name: z.string().trim().min(1, "Speaker name is required.").max(120),
  role: z.string().trim().min(1, "Speaker role is required.").max(120),
  organization: z.string().trim().min(1, "Speaker organization is required.").max(120),
  bio: z.string().trim().max(2000).optional(),
  initials: z.string().trim().min(1, "Initials are required.").max(4),
  image: z.string().trim().max(500).optional(),
  imageAlt: z.string().trim().max(200).optional(),
  socials: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Link label is required.").max(80),
        href: z.string().trim().min(1, "Link URL is required.").max(500),
        icon: z.string().trim().min(1).max(40),
      }),
    )
    .max(10)
    .optional(),
});

const scheduleItemSchema = z.object({
  time: timeSchema,
  title: z.string().trim().min(1, "Schedule item title is required.").max(120),
  description: z.string().trim().max(500).optional(),
});

const registrationSchema = z
  .object({
    enabled: z.boolean(),
    label: z.string().trim().max(60).optional(),
    externalUrl: z.string().trim().max(500).optional(),
    capacity: z.number().int("Capacity must be a whole number.").min(1).max(100_000).optional(),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tags cannot be empty.")
  .max(40, "Tags must be at most 40 characters.");

/** The full create payload — every Event-model field, nothing more. */
export const adminEventCreateSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1, "Title is required.").max(200),
    excerpt: z.string().trim().min(1, "Excerpt is required.").max(500),
    description: z.string().trim().min(1, "Description is required.").max(20_000),
    category: z
      .string()
      .trim()
      .min(1, "Category is required.")
      .max(60, "Category must be at most 60 characters."),
    status: z.enum(EVENT_STATUSES, { message: "Choose a valid status." }),
    featured: z.boolean().optional(),
    date: isoDateSchema,
    startTime: timeSchema,
    endTime: timeSchema.optional(),
    location: z.string().trim().min(1, "Location is required.").max(200),
    coverImage: z.string().trim().min(1, "Cover image is required.").max(500),
    coverImageAlt: z.string().trim().min(1, "Cover image alt text is required.").max(200),
    organizer: z.string().trim().max(120).optional(),
    speakers: z.array(speakerSchema).max(20).optional(),
    schedule: z.array(scheduleItemSchema).max(30).optional(),
    registration: registrationSchema.optional(),
    tags: z.array(tagSchema).max(20).optional(),
    gallery: z
      .array(z.string().trim().min(1).max(500))
      .max(50)
      .optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminEventUpdateSchema = adminEventCreateSchema.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — practical server-side controls. */
export const adminEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  // Free string (Phase 10C): the category vocabulary is admin-managed, so
  // the filter can no longer assume the original fixed enum.
  category: z.string().trim().max(60).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  sort: z
    .enum(["date_desc", "date_asc", "title_asc", "title_desc", "created_desc"])
    .default("date_desc"),
});

/** Event ids look like "evt-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeEventId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function eventFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminEventCreateInput = z.infer<typeof adminEventCreateSchema>;
export type AdminEventUpdateInput = z.infer<typeof adminEventUpdateSchema>;
export type AdminEventListQuery = z.infer<typeof adminEventListQuerySchema>;

import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Videos (Watch) CMS body/query validation (Phase 9G) — server-side,
 * authoritative, mirroring the EXACT fields of the existing WatchVideo
 * model (client/src/types WatchVideo). No invented fields: the model's own
 * lifecycle (published/archived) is the only status dimension, and the
 * PUBLIC repository's published-only visibility gate is untouched —
 * archived videos remain private while admins see them here.
 *
 * Terminology (spec §8): the public API/domain calls these "watch videos";
 * the admin surface keeps the intuitive /api/admin/videos route while the
 * payloads stay the exact WatchVideo shape.
 *
 * Media/source fields (spec §7/§9): there is NO upload or transcoding
 * infrastructure — `thumbnail`, `videoUrl`, and `embedUrl` are existing
 * media references (local asset paths or external URLs) and are format-
 * validated here ("path or URL"). `duration` stays the editorial display
 * string; the internal numeric `durationMinutes` is recomputed SERVER-side
 * from it on every write (seed formula) and is never accepted from the
 * client — the strict schema rejects it. Event references (eventSlug) are
 * format-validated here; EXISTENCE against the events collection is
 * enforced by the controller.
 *
 * Conventions follow http/projectSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical VideoStatus union. */
export const VIDEO_STATUSES = ["published", "archived"] as const;

/** Slugs follow the existing sanitizeSlug pattern (kebab-ish, lowercase). */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required.")
  .max(80, "Slug must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.");

/**
 * Media reference — an existing asset path (Vite-served "/src/assets/…")
 * or an absolute http(s) URL. No upload infrastructure exists (spec §7):
 * the CMS manages references to media that already exists.
 */
const mediaRefSchema = z
  .string()
  .trim()
  .min(1, "Media reference is required.")
  .max(500, "Media reference must be at most 500 characters.")
  .regex(/^(\/|https?:\/\/)/, "Enter an existing media path (/…) or http(s) URL.");

/** Event slug reference — format validated here, existence by the controller. */
const eventSlugRefSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Event slug must be at most 80 characters.")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only.")
  .optional()
  .or(z.literal(""));

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

/**
 * Editorial duration display string — "m:ss" or "h:mm:ss" (the model's own
 * format, e.g. "42:18", "1:05:40"). Seconds (and minutes on 3-part forms)
 * must be real; the numeric filter support is derived from this on write.
 */
const durationSchema = z
  .string()
  .trim()
  .min(1, "Duration is required.")
  .max(12, "Duration must look like m:ss or h:mm:ss.")
  .regex(/^\d{1,3}:\d{1,2}(:\d{1,2})?$/, 'Use the "m:ss" or "h:mm:ss" format, e.g. 42:18.')
  .refine((value) => {
    const parts = value.split(":").map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return false;
    const seconds = parts[parts.length - 1];
    if (seconds >= 60) return false;
    if (parts.length === 3 && parts[1] >= 60) return false;
    return true;
  }, "Seconds (and minutes on h:mm:ss) must be below 60.");

/** The full create payload — every WatchVideo-model field, nothing more. */
export const adminVideoCreateSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1, "Title is required.").max(200),
    excerpt: z.string().trim().min(1, "Excerpt is required.").max(500),
    description: z.string().trim().min(1, "Description is required.").max(20_000),
    thumbnail: mediaRefSchema,
    thumbnailAlt: z.string().trim().min(1, "Thumbnail alt text is required.").max(200),
    videoUrl: mediaRefSchema.optional().or(z.literal("")),
    embedUrl: mediaRefSchema.optional().or(z.literal("")),
    duration: durationSchema,
    category: z.string().trim().min(1, "Category is required.").max(60),
    tags: z.array(tagSchema).max(20),
    speaker: z.string().trim().max(120).optional().or(z.literal("")),
    eventSlug: eventSlugRefSchema,
    publishedAt: isoDateSchema,
    featured: z.boolean().optional(),
    status: z.enum(VIDEO_STATUSES, { message: "Choose a valid status." }),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminVideoUpdateSchema = adminVideoCreateSchema.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminVideoStatusSchema = z.object({
  status: z.enum(VIDEO_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — only filters backed by actual model fields. */
export const adminVideoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(VIDEO_STATUSES).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  /** Event reference filter (exact eventSlug). */
  event: eventSlugRefSchema,
  featured: z.enum(["true", "false"]).optional(),
  /**
   * Duration bucket — the EXACT public labels and boundaries, applied to
   * the seed-normalized numeric durationMinutes (never the display string).
   */
  duration: z
    .enum(["Under 15 min", "15–30 min", "30–60 min", "Over 1 hour"])
    .optional(),
  sort: z
    .enum(["published_desc", "published_asc", "title_asc", "title_desc", "duration_desc"])
    .default("published_desc"),
});

/** Video ids look like "vid-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeVideoId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function videoFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminVideoCreateInput = z.infer<typeof adminVideoCreateSchema>;
export type AdminVideoUpdateInput = z.infer<typeof adminVideoUpdateSchema>;
export type AdminVideoListQuery = z.infer<typeof adminVideoListQuerySchema>;

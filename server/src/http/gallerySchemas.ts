import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Gallery CMS body/query validation (Phase 9G) — server-side,
 * authoritative, mirroring the EXACT fields of the existing GalleryAlbum
 * model (client/src/types GalleryAlbum). No invented fields: the model's
 * own lifecycle (published/archived) is the only status dimension, and the
 * PUBLIC repository's published-only visibility gate is untouched —
 * archived albums remain private while admins see them here.
 *
 * Architecture note (spec §2/§4): photos are EMBEDDED inside the album
 * document exactly as the domain type models them — there is no separate
 * photos collection, so there are no separate photo endpoints. The photos
 * array IS the display order (PhotoGrid/Lightbox render it index-order),
 * so reordering is a PATCH that sends the array in the new order; the
 * denormalized `photoCount` is recomputed server-side on every write.
 *
 * Media references (spec §7): the project has NO upload/R2 infrastructure
 * — photos/cover art are existing media references (local asset paths or
 * URLs). They are format-validated here ("must be a path or URL") and the
 * admin form labels them as such. Event references (eventSlug) are
 * format-validated here; EXISTENCE against the events collection is
 * enforced by the controller so no dangling references can be persisted.
 *
 * Conventions follow http/projectSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** Same shape as the canonical GalleryAlbumStatus union. */
export const GALLERY_STATUSES = ["published", "archived"] as const;

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
 * or an absolute http(s) URL. There is no upload infrastructure (spec §7):
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
 * One embedded photo/media entry — the EXACT GalleryPhoto shape (id, src,
 * alt, caption?, videoUrl?, embedUrl?). The client form may omit `id`; the
 * repository then generates a collision-safe one, exactly like album ids.
 * Task 36: videoUrl/embedUrl let album entries carry VIDEO tiles (derived
 * event recordings) beside photos — src then holds the poster frame.
 */
export const galleryPhotoSchema = z
  .object({
    id: z
      .string()
      .trim()
      .max(80, "Photo id must be at most 80 characters.")
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Photo ids use lowercase letters, numbers, and hyphens only.")
      .optional(),
    src: mediaRefSchema,
    alt: z.string().trim().min(1, "Alt text is required.").max(300, "Alt text must be at most 300 characters."),
    caption: z
      .string()
      .trim()
      .max(300, "Captions must be at most 300 characters.")
      .optional()
      .or(z.literal("")),
    videoUrl: mediaRefSchema.optional(),
    embedUrl: mediaRefSchema.optional(),
  })
  .strict();

/** The full create payload — every GalleryAlbum-model field, nothing more.
 *  `slug` is OPTIONAL (Task 16): when absent the controller auto-generates
 *  a unique handle from the title via generateUniqueHandle(). */
export const adminGalleryCreateSchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(1, "Title is required.").max(200),
    description: z.string().trim().min(1, "Description is required.").max(20_000),
    coverImage: mediaRefSchema,
    coverImageAlt: z.string().trim().min(1, "Cover image alt text is required.").max(200),
    category: z.string().trim().min(1, "Category is required.").max(60),
    eventSlug: eventSlugRefSchema,
    date: isoDateSchema,
    location: z.string().trim().max(200).optional().or(z.literal("")),
    photos: z.array(galleryPhotoSchema).max(100, "Albums hold at most 100 photos."),
    /**
     * Task 36 — video clips embedded in the album (poster + videoUrl/
     * embedUrl per entry). Written by the event-media sync for derived
     * albums; admin album forms may stay photo-only. Recomputed videoCount
     * is derived server-side on every write, never accepted from clients.
     */
    videos: z.array(galleryPhotoSchema).max(50, "Albums hold at most 50 videos.").optional(),
    featured: z.boolean().optional(),
    status: z.enum(GALLERY_STATUSES, { message: "Choose a valid status." }),
    tags: z.array(tagSchema).max(20),
    /**
     * Task 33 — server-managed flag marking an album as DERIVED from an
     * event's media (event media sync). The sync overwrites the metadata
     * of autoManaged albums on every event save; admin albums leave it
     * unset and are never touched. Accepted here so the sync can persist
     * it in one write — never required, never displayed as an input.
     */
    autoManaged: z.boolean().optional(),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminGalleryUpdateSchema = adminGalleryCreateSchema.partial();

/** Dedicated status transition — the "safe status update" surface. */
export const adminGalleryStatusSchema = z.object({
  status: z.enum(GALLERY_STATUSES, { message: "Choose a valid status." }),
});

/** Admin list query — only filters backed by actual model fields. */
export const adminGalleryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(GALLERY_STATUSES).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  /** Capture-year filter — the model's own `date` prefix (public formula). */
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Use a four-digit year.")
    .optional(),
  /** Event reference filter (exact eventSlug). */
  event: eventSlugRefSchema,
  featured: z.enum(["true", "false"]).optional(),
  sort: z
    .enum(["date_desc", "date_asc", "title_asc", "title_desc", "photos_desc"])
    .default("date_desc"),
});

/** Album ids look like "alb-001" — lowercase alnum + hyphen, bounded. */
export function sanitizeGalleryId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function galleryFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminGalleryCreateInput = z.infer<typeof adminGalleryCreateSchema>;
export type AdminGalleryUpdateInput = z.infer<typeof adminGalleryUpdateSchema>;
export type AdminGalleryListQuery = z.infer<typeof adminGalleryListQuerySchema>;
export type AdminGalleryPhotoInput = z.infer<typeof galleryPhotoSchema>;

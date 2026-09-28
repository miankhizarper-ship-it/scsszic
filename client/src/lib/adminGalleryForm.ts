import { z } from "zod";

import type { GalleryAlbum, GalleryAlbumWrite } from "@/types";

/**
 * Client-side form schema for the admin Gallery album form (Phase 9G).
 *
 * Mirrors server/src/http/gallerySchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative (including event
 * reference existence). The event reference is selected from REAL MongoDB
 * data via the existing public events query. No new fields: the model's
 * own lifecycle (published/archived) is the only status dimension, and
 * photos stay the model's own embedded GalleryPhoto rows — the form edits
 * them as an ordered list (add / edit caption+alt / reorder / remove);
 * the server recomputes photoCount on every write.
 *
 * Media references (spec §7): there is NO upload infrastructure — src /
 * coverImage are references to existing media (local asset path or URL),
 * validated as such and labeled plainly in the UI.
 */

export const GALLERY_STATUSES = ["published", "archived"] as const;

/** One editable photo row — `id` rides along when the photo already exists. */
export interface GalleryPhotoFormRow {
  id?: string;
  src: string;
  alt: string;
  caption: string;
}

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

/** Existing-media reference — local asset path or http(s) URL. */
const mediaRef = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(500, `${label} must be at most 500 characters.`)
    .regex(/^(\/|https?:\/\/)/, "Enter an existing media path (/…) or http(s) URL.");

export const galleryFormSchema = z.object({
  title: requiredText("Title", 200),
  description: requiredText("Description", 20000),
  coverImage: mediaRef("Cover image"),
  coverImageAlt: requiredText("Cover image alt text", 200),
  category: requiredText("Category", 60),
  eventSlug: optionalText("Event", 80),
  date: z
    .string()
    .trim()
    .min(1, "Capture date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)."),
  location: optionalText("Location", 200),
  status: z.enum(GALLERY_STATUSES, { message: "Choose a valid status." }),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tags cannot be empty.")
        .max(40, "Each tag must be at most 40 characters."),
    )
    .max(20, "An album can have at most 20 tags."),
  featured: z.boolean(),
  photos: z
    .array(
      z.object({
        id: z.string().optional(),
        src: mediaRef("Photo media reference"),
        alt: requiredText("Alt text", 300),
        caption: optionalText("Caption", 300),
      }),
    )
    .max(100, "Albums hold at most 100 photos."),
});

export type GalleryFormValues = z.infer<typeof galleryFormSchema>;

/** Fetched album → form values (photos become editable ordered rows). */
export function toGalleryFormValues(album: GalleryAlbum): GalleryFormValues {
  return {
    title: album.title,
    description: album.description,
    coverImage: album.coverImage,
    coverImageAlt: album.coverImageAlt,
    category: album.category,
    eventSlug: album.eventSlug ?? "",
    date: album.date,
    location: album.location ?? "",
    status: album.status,
    tags: album.tags ?? [],
    featured: Boolean(album.featured),
    photos: (album.photos ?? []).map((photo) => ({
      id: photo.id,
      src: photo.src,
      alt: photo.alt,
      caption: photo.caption ?? "",
    })),
  };
}

/** Create defaults — status published, today's date, one empty photo row. */
export function galleryFormDefaults(): GalleryFormValues {
  return {
    title: "",
    description: "",
    coverImage: "",
    coverImageAlt: "",
    category: "",
    eventSlug: "",
    date: new Date().toISOString().slice(0, 10),
    location: "",
    status: "published",
    tags: [],
    featured: false,
    photos: [{ src: "", alt: "", caption: "" }],
  };
}

/** Form values → API payload (exact GalleryAlbum model shape). */
export function toGalleryPayload(values: GalleryFormValues): Partial<GalleryAlbumWrite> {
  return {
    title: values.title,
    description: values.description,
    coverImage: values.coverImage,
    coverImageAlt: values.coverImageAlt,
    category: values.category,
    ...(values.eventSlug ? { eventSlug: values.eventSlug } : {}),
    date: values.date,
    ...(values.location ? { location: values.location } : {}),
    status: values.status,
    tags: values.tags,
    featured: values.featured,
    // The array order IS the display order — reorder is a plain save.
    // Existing ids ride along; new photos get server-generated ids.
    photos: values.photos.map((photo) => ({
      ...(photo.id ? { id: photo.id } : {}),
      src: photo.src.trim(),
      alt: photo.alt.trim(),
      ...((photo.caption ?? "").trim() ? { caption: (photo.caption ?? "").trim() } : {}),
    })),
  };
}

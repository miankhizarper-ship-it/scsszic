import { z } from "zod";

import type { WatchVideo } from "@/types";

/**
 * Client-side form schema for the admin Watch video form (Phase 9G).
 *
 * Mirrors server/src/http/videoSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative (including event
 * reference existence and the durationMinutes derivation, which the client
 * never sends). The event reference is selected from REAL MongoDB data via
 * the existing public events query. No new fields: the model's own
 * lifecycle (published/archived) is the only status dimension.
 *
 * Media/source fields (spec §7/§9): there is NO upload or transcoding
 * infrastructure — thumbnail/videoUrl/embedUrl are references to existing
 * media (local asset path or external URL), validated as such and labeled
 * plainly in the UI. The public VideoPlayer keeps its existing source
 * priority: videoUrl → native player, else embedUrl → click-to-load
 * iframe, else poster-only.
 */

export const VIDEO_STATUSES = ["published", "archived"] as const;

/** Public duration-bucket labels (exact boundaries live server-side). */
export const DURATION_BUCKETS = [
  "Under 15 min",
  "15–30 min",
  "30–60 min",
  "Over 1 hour",
] as const;

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

export const videoFormSchema = z.object({
  title: requiredText("Title", 200),
  excerpt: requiredText("Excerpt", 500),
  description: requiredText("Description", 20000),
  thumbnail: mediaRef("Thumbnail"),
  thumbnailAlt: requiredText("Thumbnail alt text", 200),
  videoUrl: optionalText("Video URL", 500)
    .refine((value) => !value || /^(\/|https?:\/\/)/.test(value), "Enter an existing media path (/…) or http(s) URL."),
  embedUrl: optionalText("Embed URL", 500)
    .refine((value) => !value || /^(\/|https?:\/\/)/.test(value), "Enter an existing media path (/…) or http(s) URL."),
  duration: z
    .string()
    .trim()
    .min(1, "Duration is required.")
    .max(12, "Duration must look like m:ss or h:mm:ss.")
    .regex(/^\d{1,3}:\d{1,2}(:\d{1,2})?$/, 'Use the "m:ss" or "h:mm:ss" format, e.g. 42:18.'),
  category: requiredText("Category", 60),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tags cannot be empty.")
        .max(40, "Each tag must be at most 40 characters."),
    )
    .max(20, "A video can have at most 20 tags."),
  speaker: optionalText("Speaker", 120),
  eventSlug: optionalText("Event", 80),
  publishedAt: z
    .string()
    .trim()
    .min(1, "Publish date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)."),
  status: z.enum(VIDEO_STATUSES, { message: "Choose a valid status." }),
  featured: z.boolean(),
});

export type VideoFormValues = z.infer<typeof videoFormSchema>;

/** Fetched video → form values (optional fields become "" when absent). */
export function toVideoFormValues(video: WatchVideo): VideoFormValues {
  return {
    title: video.title,
    excerpt: video.excerpt,
    description: video.description,
    thumbnail: video.thumbnail,
    thumbnailAlt: video.thumbnailAlt,
    videoUrl: video.videoUrl ?? "",
    embedUrl: video.embedUrl ?? "",
    duration: video.duration,
    category: video.category,
    tags: video.tags ?? [],
    speaker: video.speaker ?? "",
    eventSlug: video.eventSlug ?? "",
    publishedAt: video.publishedAt,
    status: video.status,
    featured: Boolean(video.featured),
  };
}

/** Create defaults — status published, today's date. */
export function videoFormDefaults(): VideoFormValues {
  return {
    title: "",
    excerpt: "",
    description: "",
    thumbnail: "",
    thumbnailAlt: "",
    videoUrl: "",
    embedUrl: "",
    duration: "",
    category: "",
    tags: [],
    speaker: "",
    eventSlug: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    status: "published",
    featured: false,
  };
}

/** Form values → API payload (exact WatchVideo model shape). The slug is
 *  server-generated (Task 16) and never sent from the form. */
export function toVideoPayload(values: VideoFormValues): Partial<WatchVideo> {
  return {
    title: values.title,
    excerpt: values.excerpt,
    description: values.description,
    thumbnail: values.thumbnail,
    thumbnailAlt: values.thumbnailAlt,
    ...(values.videoUrl ? { videoUrl: values.videoUrl } : {}),
    ...(values.embedUrl ? { embedUrl: values.embedUrl } : {}),
    duration: values.duration,
    category: values.category,
    tags: values.tags,
    ...(values.speaker ? { speaker: values.speaker } : {}),
    ...(values.eventSlug ? { eventSlug: values.eventSlug } : {}),
    publishedAt: values.publishedAt,
    status: values.status,
    featured: values.featured,
  };
}

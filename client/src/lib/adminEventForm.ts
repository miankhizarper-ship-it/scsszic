import { z } from "zod";

/**
 * Client-side form schema for the admin Event form (Phase 9C).
 *
 * Deliberately mirrors server/src/http/eventSchemas.ts field-for-field —
 * client validation is UX (fast, specific messages); the server remains
 * authoritative. Any field the existing Event model does not carry is not
 * accepted here either.
 */

/**
 * Curated default event categories — kept for reference/seed parity only.
 * Since Phase 10C the category vocabulary is admin-managed (see the
 * CategoryField picker), so the form accepts any bounded category string,
 * matching blogs/gallery/videos/projects and the server schema.
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

export const EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled"] as const;

const isoDate = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Use a valid calendar date.");

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

const time = z
  .string()
  .trim()
  .min(1, "Time is required.")
  .max(20, "Time must be at most 20 characters.");

const optionalTime = z
  .string()
  .trim()
  .max(20, "Time must be at most 20 characters.")
  .optional()
  .or(z.literal(""));

export const eventFormSchema = z
  .object({
    title: requiredText("Title", 200),
    category: requiredText("Category", 60),
    status: z.enum(EVENT_STATUSES, { message: "Choose a valid status." }),
    featured: z.boolean(),
    date: isoDate,
    startTime: time,
    endTime: optionalTime,
    location: requiredText("Location", 200),
    organizer: optionalText("Organizer", 120),
    excerpt: requiredText("Excerpt", 500),
    description: requiredText("Description", 20000),
    coverImage: requiredText("Cover image", 500),
    coverImageAlt: requiredText("Cover image alt text", 200),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Tags cannot be empty.")
          .max(40, "Each tag must be at most 40 characters."),
      )
      .max(20, "An event can have at most 20 tags."),
    gallery: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Gallery entries cannot be empty.")
          .max(500, "Gallery entries must be at most 500 characters."),
      )
      .max(50, "An event gallery holds at most 50 items."),
    registrationEnabled: z.boolean(),
    registrationLabel: optionalText("Label", 60),
    registrationExternalUrl: optionalText("Registration URL", 500),
    registrationCapacity: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => {
        if (!value) return true;
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 100_000;
      }, "Capacity must be a whole number between 1 and 100000."),
    registrationNote: optionalText("Note", 300),
    speakers: z
      .array(
        z.object({
          name: requiredText("Speaker name", 120),
          role: requiredText("Speaker role", 120),
          organization: requiredText("Speaker organization", 120),
          initials: z
            .string()
            .trim()
            .min(1, "Initials are required.")
            .max(4, "Initials must be at most 4 characters."),
          bio: optionalText("Speaker bio", 2000),
        }),
      )
      .max(20, "An event can list at most 20 speakers."),
    schedule: z
      .array(
        z.object({
          time,
          title: requiredText("Schedule item title", 120),
          description: optionalText("Description", 500),
        }),
      )
      .max(30, "An event can list at most 30 schedule items."),
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

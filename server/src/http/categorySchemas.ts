import { z } from "zod";

import { CATEGORY_SECTIONS } from "../content/types.js";
import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Category vocabulary + slug availability validation (Phase 10C) —
 * server-side, authoritative, following the project's `{ message, errors }`
 * 400 convention (see http/querySchemas.ts).
 */

/** Zod enum for the five taxonomy sections that carry a `category` field. */
export const categorySectionSchema = z.enum(CATEGORY_SECTIONS, {
  message: "Unknown category section.",
});

/** Category display name — trimmed, 1–60 chars (matches content schemas). */
export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name is required.")
  .max(60, "Category names must be at most 60 characters.");

export const categoryRenameSchema = z.object({ name: categoryNameSchema }).strict();

/** Zod enum for the eight slug-bearing sections (alumni/members → username). */
export const SLUG_CHECK_SECTIONS = [
  "events",
  "blogs",
  "alumni",
  "members",
  "projects",
  "feed",
  "gallery",
  "videos",
] as const;

export const slugCheckQuerySchema = z.object({
  section: z.enum(SLUG_CHECK_SECTIONS, { message: "Unknown section." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required.")
    .max(80, "Slug must be at most 80 characters.")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only."),
  /** Edit forms exclude their own document from the collision check. */
  excludeId: z
    .string()
    .trim()
    .max(64, "Exclude id must be at most 64 characters.")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Invalid id.")
    .optional(),
});

/** Zod error → field→message map (shared with the query layer). */
export function categoryFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type CategorySectionParam = z.infer<typeof categorySectionSchema>;
export type SlugCheckQuery = z.infer<typeof slugCheckQuerySchema>;

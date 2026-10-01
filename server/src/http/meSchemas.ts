import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Task 29 — /api/me/* body validation (the signed-in member's self-service
 * surface). Deliberately NARROW: the member supplies the CONTENT of a feed
 * post; every system-owned field (author identity, type, status, timestamp,
 * slug, engagement counters) is filled server-side by the controller from
 * the linked member record. `.strict()` so extra keys are a visible 400.
 *
 * Conventions follow http/feedSchemas.ts: invalid input → 400 with
 * `{ message, errors }`; nothing internal leaks.
 */

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tags cannot be empty.")
  .max(40, "Tags must be at most 40 characters.");

/**
 * POST /api/me/feed — a community post by the signed-in member.
 * The post type is always "community" (the feed's member voice); project/
 * event/article cross-references stay an admin/editorial concern.
 */
export const memberFeedCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    excerpt: z.string().trim().min(1, "Excerpt is required.").max(500),
    /** Full post body — paragraphs separated by blank lines. */
    content: z.string().trim().max(20_000).optional(),
    /** Optional artwork (https URL or R2-backed /media path). */
    image: z
      .string()
      .trim()
      .max(500)
      .regex(/^(https?:\/\/|\/)[^\s]*$/, "Use a valid image URL (https://…).")
      .optional(),
    imageAlt: z.string().trim().max(200).optional(),
    tags: z.array(tagSchema).max(10, "At most 10 tags are allowed.").default([]),
  })
  .strict();

export function meFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type MemberFeedCreateInput = z.infer<typeof memberFeedCreateSchema>;

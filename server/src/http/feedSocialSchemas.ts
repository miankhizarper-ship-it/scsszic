import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Feed social validation — bodies for the like/comment endpoints.
 *
 *   POST /api/feed/:id/like        no body
 *   GET  /api/feed/:id/comments    no body
 *   POST /api/feed/:id/comments    { body }  (1..1000 chars)
 *   GET  /api/feed/viewer-state    ?ids=comma,separated,postIds
 *
 * Author identity is ALWAYS derived from the verified session (never the
 * request); these schemas only shape what the visitor typed.
 */

/** Comment text — trimmed, bounded; newlines allowed (paragraph breaks). */
export const feedCommentCreateSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Write a comment before posting.")
      .max(1000, "Comments must be at most 1000 characters."),
  })
  .strict();

/**
 * viewer-state ids — comma-separated feed post ids (canonical ids look like
 * "feed-001"; admin-generated ids share the lowercase alnum+hyphen shape).
 * Bounded to 200 ids — one page of posts maximum.
 */
const viewerStateIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Invalid post id.");

export const feedViewerStateQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1, "Provide at least one post id.")
    .max(200 * 65, "Too many post ids."),
});

export function parseViewerStateIds(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > 200) return null;
  for (const id of ids) {
    if (!viewerStateIdSchema.safeParse(id).success) return null;
  }
  return ids;
}

export function feedSocialFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type FeedCommentCreateInput = z.infer<typeof feedCommentCreateSchema>;

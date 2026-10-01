import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Blog social validation — bodies for the article-comment endpoints (Task 30).
 *
 *   GET  /api/blogs/:slug/comments    no body
 *   POST /api/blogs/:slug/comments    { body }  (1..1000 chars)
 *
 * Author identity is ALWAYS derived from the verified session (never the
 * request); these schemas only shape what the visitor typed. The same bounds
 * as feed comments keep moderation expectations identical across surfaces.
 */

/** Comment text — trimmed, bounded; newlines allowed (paragraph breaks). */
export const blogCommentCreateSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Write a comment before posting.")
      .max(1000, "Comments must be at most 1000 characters."),
  })
  .strict();

export function blogSocialFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type BlogCommentCreateInput = z.infer<typeof blogCommentCreateSchema>;

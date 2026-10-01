import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin AI assistant validation (Task 28) — server-side, authoritative.
 *
 * The assistant fills ONE form field at a time. The admin panel sends:
 *   kind    — which field is being generated (drives the prompt + shape)
 *   source  — the raw material the admin pasted into the AI panel (notes,
 *             an outline, a draft, a CV…) — the model works ONLY from this
 *   context — optional page-level hint, e.g. "event" / "blog article"
 *   title   — optional existing title (alt text reads better when it knows
 *             what the image is on; excerpt reads better with a title)
 *
 * Everything is strictly bounded: the source is capped at 8 000 characters
 * (plenty for notes, far below the 1 mb body limit) and every free-text hint
 * at a few hundred. The model's OUTPUT is trimmed server-side too — the
 * client never has to trust it.
 */

/** Every field kind the client's sparkle buttons may request. */
export const AI_FIELD_KINDS = [
  "title",
  "excerpt",
  "tagline",
  "achievement",
  "description",
  "content",
  "bio",
  "tags",
  "technologies",
  "skills",
  "interests",
  "highlights",
  "alt",
  "seoTitle",
  "seoDescription",
] as const;

export type AiFieldKind = (typeof AI_FIELD_KINDS)[number];

/** Kinds whose answer is a LIST of short strings (rendered as chips/tags). */
export const AI_LIST_KINDS: readonly AiFieldKind[] = [
  "tags",
  "technologies",
  "skills",
  "interests",
  "highlights",
];

export function isAiListKind(kind: AiFieldKind): boolean {
  return (AI_LIST_KINDS as readonly string[]).includes(kind);
}

/** POST /api/admin/ai/field body. */
export const aiFieldRequestSchema = z
  .object({
    kind: z.enum(AI_FIELD_KINDS, { message: "Unknown AI field kind." }),
    source: z
      .string()
      .trim()
      .min(3, "Paste some material for the assistant to work from first.")
      .max(8_000, "Source material must be at most 8,000 characters."),
    context: z.string().trim().max(300, "Context must be at most 300 characters.").optional(),
    title: z.string().trim().max(200, "Title must be at most 200 characters.").optional(),
  })
  .strict();

export type AiFieldRequest = z.infer<typeof aiFieldRequestSchema>;

/** Zod error → field→message map (shared with every other admin schema). */
export function aiFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

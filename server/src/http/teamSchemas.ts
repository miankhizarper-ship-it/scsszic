import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Team CMS body/query validation (Phase 12) — server-side,
 * authoritative, mirroring the EXACT fields of the TeamCard model
 * (client/src/types TeamCard). One collection backs the Leadership and
 * Developers card groups (`group` field); cards are public when
 * `status: "published"` and ordered by the manual `order` number.
 *
 * Conventions follow http/memberSchemas.ts: invalid input → 400 with
 * `{ message, errors }` field-level messages; nothing internal leaks.
 */

/* ------------------------------ shared pieces ------------------------------ */

/** The two card groups the home page (and About leadership) render. */
export const TEAM_GROUPS = ["leaders", "developers"] as const;

/** Two-state visibility lifecycle — archived cards stay admin-only. */
export const TEAM_STATUSES = ["published", "archived"] as const;

/** Social links: same serialized shape as the alumni model (icon = key). */
const socialSchema = z.object({
  label: z.string().trim().min(1, "Link label is required.").max(80),
  href: z.string().trim().min(1, "Link URL is required.").max(500),
  icon: z.string().trim().min(1, "Icon key is required.").max(40),
});

/** The full create payload — every TeamCard-model field, nothing more. */
export const adminTeamCreateSchema = z
  .object({
    group: z.enum(TEAM_GROUPS, { message: "Choose a group: leaders or developers." }),
    name: z.string().trim().min(1, "Name is required.").max(120),
    position: z.string().trim().min(1, "Position is required.").max(120),
    description: z.string().trim().max(500).optional(),
    initials: z
      .string()
      .trim()
      .min(1, "Initials are required.")
      .max(4, "Initials must be at most 4 characters."),
    image: z.string().trim().max(500).optional(),
    imageAlt: z.string().trim().max(200).optional(),
    socials: z.array(socialSchema).max(6, "At most 6 social links are allowed.").optional(),
    order: z.coerce
      .number()
      .int("Order must be a whole number.")
      .min(0, "Order must be 0 or later.")
      .max(999, "Order must be 999 or earlier.")
      .optional(),
    status: z.enum(TEAM_STATUSES, { message: "Choose a valid status." }),
  })
  .strict();

/** PATCH — same shape, every field optional. System fields never pass. */
export const adminTeamUpdateSchema = adminTeamCreateSchema.partial();

/** Admin list query — only filters backed by actual model fields. */
export const adminTeamListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  group: z.enum(TEAM_GROUPS).optional(),
  status: z.enum(TEAM_STATUSES).optional(),
  sort: z.enum(["order_asc", "name_asc", "name_desc", "newest"]).default("order_asc"),
});

/** Team ids look like "team-…" — lowercase alnum + hyphen, bounded. */
export function sanitizeTeamId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function teamFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminTeamCreateInput = z.infer<typeof adminTeamCreateSchema>;
export type AdminTeamUpdateInput = z.infer<typeof adminTeamUpdateSchema>;
export type AdminTeamListQuery = z.infer<typeof adminTeamListQuerySchema>;

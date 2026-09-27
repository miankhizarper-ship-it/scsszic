import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Users CMS validation (Phase 9H) — server-side, authoritative, over
 * the EXISTING auth user model (auth/types.ts AuthUser). No invented fields:
 * the model has exactly `displayName`, `role` ("member" | "admin") and no
 * account-status dimension, so the management surface supports displayName +
 * role updates and deletion with final-admin safeguards — nothing else.
 *
 * Deliberately NOT part of this schema: username/email edits (they interact
 * with the login identity and the AuthUser → member profile link) and any
 * password handling (creation is the existing signup flow's job; there is no
 * POST /api/admin/users). Invalid input → 400 with `{ message, errors }`.
 */

export const ADMIN_USER_ROLES = ["member", "admin"] as const;

/** Server-side sort options for the admin users management table. */
export const ADMIN_USER_SORTS = [
  "created_desc",
  "created_asc",
  "username_asc",
  "username_desc",
  "name_asc",
  "name_desc",
] as const;

/** The full update payload — role + displayName are the model's editable fields. */
export const adminUserUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required.")
      .max(120, "Display name must be at most 120 characters."),
    role: z.enum(ADMIN_USER_ROLES, { message: "Choose a valid role." }),
  })
  .partial()
  .strict()
  .refine(
    (value) => value.displayName !== undefined || value.role !== undefined,
    "Provide a display name or a role to update.",
  );

/** Admin list query — only filters backed by actual model fields. */
export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  role: z.enum(ADMIN_USER_ROLES).optional(),
  sort: z.enum(ADMIN_USER_SORTS).default("created_desc"),
});

/**
 * Account ids are opaque strings (UUIDs today). Bounded lowercase
 * alnum + hyphen — malformed ids fail safely as "not found", never throw.
 */
export function sanitizeAdminUserId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{7,127}$/.test(value) ? value : null;
}

/** Zod error → field→message map (shared with the query layer). */
export function userFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

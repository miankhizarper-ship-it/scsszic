import { z } from "zod";

import { ADMIN_PERMISSIONS } from "../auth/types.js";
import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Users CMS validation (Phase 9H, extended Phase 10B) — server-side,
 * authoritative, over the EXISTING auth user model (auth/types.ts AuthUser).
 * The model carries displayName, role and (Phase 10B) per-user CMS
 * `permissions`; username/email edits and password handling stay out of this
 * surface (login identity + signup flow own those). Invalid input → 400 with
 * `{ message, errors }`.
 */

export const ADMIN_USER_ROLES = ["member", "manage", "admin"] as const;

/**
 * Permissions are accepted ONLY as exact section keys, deduplicated and
 * re-ordered into the canonical ADMIN_PERMISSIONS order by the controller
 * (normalizeAdminPermissions) so stored arrays stay deterministic.
 */
export const adminPermissionsSchema = z
  .array(z.enum(ADMIN_PERMISSIONS, { message: "Unknown CMS section." }))
  .max(ADMIN_PERMISSIONS.length, "Too many permissions requested.");

/** Server-side sort options for the admin users management table. */
export const ADMIN_USER_SORTS = [
  "created_desc",
  "created_asc",
  "username_asc",
  "username_desc",
  "name_asc",
  "name_desc",
] as const;

/** The full update payload — role, displayName and per-user permissions. */
export const adminUserUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required.")
      .max(120, "Display name must be at most 120 characters."),
    role: z.enum(ADMIN_USER_ROLES, { message: "Choose a valid role." }),
    /** Phase 10B — CMS sections granted to THIS account. Only meaningful for
     *  the "manage" role; the controller clears them for member/admin. */
    permissions: adminPermissionsSchema,
  })
  .partial()
  .strict()
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.role !== undefined ||
      value.permissions !== undefined,
    "Provide a display name, a role, or permissions to update.",
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

/**
 * Normalize a validated permissions array: dedupe + canonical order. Returns
 * a NEW array; safe to call with untrusted arrays that passed the enum check.
 */
export function normalizeAdminPermissions(value: readonly string[]): typeof ADMIN_PERMISSIONS[number][] {
  const set = new Set(value);
  return ADMIN_PERMISSIONS.filter((permission) => set.has(permission));
}

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

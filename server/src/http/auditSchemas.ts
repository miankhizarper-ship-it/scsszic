import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Admin Audit log API validation (Phase 9H) — read-only listing over the
 * server-generated audit trail. Only filters backed by real indexed fields:
 * actor (username snapshot), action, resourceType, free-text search, and an
 * inclusive from/to date range (YYYY-MM-DD, UTC). Ordering is FIXED to
 * newest-first — there is deliberately no sort parameter.
 */

/** ISO calendar date (YYYY-MM-DD) that is actually a real date. */
const isoDaySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Use a valid calendar date.");

export const adminAuditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().trim().max(200).default(""),
    /** Actor username snapshot (facet value from the list itself). */
    actor: z.string().trim().min(1).max(80).optional(),
    /** Dotted action filter, e.g. "event.created". */
    action: z.string().trim().min(1).max(80).optional(),
    /** Resource family filter, e.g. "event". */
    resourceType: z.string().trim().min(1).max(40).optional(),
    /** Inclusive range start (UTC day). */
    from: isoDaySchema.optional(),
    /** Inclusive range end (UTC day). */
    to: isoDaySchema.optional(),
  })
  .refine(
    (value) => !(value.from && value.to && value.from > value.to),
    "`from` must not be after `to`.",
  );

/** Zod error → field→message map (shared with the query layer). */
export function auditFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

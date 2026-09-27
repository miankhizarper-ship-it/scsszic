import { z } from "zod";

import type { ContentQuery } from "../repositories/content/listRepository.js";

/**
 * Query-parameter validation (spec §19) — server-side, authoritative.
 *
 * Every content endpoint parses `req.query` through one of these schemas
 * BEFORE any repository runs. Unknown params are ignored; invalid values
 * become HTTP 400 with field-level messages in the API's existing
 * `{ message, errors }` convention. Frontend validation is UX only.
 */

const pagination = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(200),
  /** Small-list limit for featured/preview style requests. */
  limit: z.coerce.number().int().min(1).max(24).optional(),
  search: z.string().trim().max(200).default(""),
  featured: z
    .enum(["true", "1", "false", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
};

const slugish = z.string().trim().min(1).max(80);

/** Extract field→message from a zod error without leaking internals. */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "query";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Schema output → repository ContentQuery. Only non-empty, defined values
 * land in `filters`, so repositories can treat absence as "no constraint".
 */
function toContentQuery(
  parsed: Record<string, unknown>,
  filterKeys: string[],
): ContentQuery {
  const filters: ContentQuery["filters"] = {};
  for (const key of filterKeys) {
    const value = parsed[key];
    if (value === undefined || value === "" || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    filters[key] = value as string | number | boolean | string[];
  }
  return {
    page: parsed.page as number,
    pageSize: parsed.pageSize as number,
    search: (parsed.search as string) ?? "",
    filters,
    limit: parsed.limit as number | undefined,
  };
}

/** Parse + convert in one step; returns null when validation fails. */
export function parseQuery<T extends Record<string, unknown>>(
  raw: unknown,
  schema: z.ZodType<T>,
  filterKeys: string[],
): { ok: true; query: ContentQuery } | { ok: false; errors: Record<string, string> } {
  const result = schema.safeParse(raw ?? {});
  if (!result.success) {
    return { ok: false, errors: fieldErrorsFromZod(result.error) };
  }
  return { ok: true, query: toContentQuery(result.data as Record<string, unknown>, filterKeys) };
}

/* ------------------------------ Per-domain schemas ------------------------------ */

const eventsSchema = z.object({
  ...pagination,
  category: z.string().trim().max(40).optional(),
  // Single status or comma-separated list ("upcoming,ongoing").
  status: z.string().trim().max(60).optional(),
  date: z.enum(["This Month", "Next Month", "Past"]).optional(),
});

const blogsSchema = z.object({
  ...pagination,
  category: z.string().trim().max(40).optional(),
  tag: z.string().trim().max(40).optional(),
});

const gallerySchema = z.object({
  ...pagination,
  category: z.string().trim().max(40).optional(),
  year: z.string().trim().regex(/^\d{4}$/, "Invalid year").optional(),
});

const watchSchema = z.object({
  ...pagination,
  category: z.string().trim().max(40).optional(),
  duration: z
    .enum(["Under 15 min", "15–30 min", "30–60 min", "Over 1 hour"])
    .optional(),
});

const alumniSchema = z.object({
  ...pagination,
  batch: z.string().trim().regex(/^\d{4}$/, "Invalid batch year").optional(),
  field: z.string().trim().max(40).optional(),
});

const membersSchema = z.object({
  ...pagination,
  batch: z.string().trim().regex(/^\d{4}$/, "Invalid batch year").optional(),
  domain: z.string().trim().max(40).optional(),
  /** Comma-separated username batch lookups (project rosters). */
  usernames: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => /^[a-z0-9_-]{1,32}$/.test(entry))
            .slice(0, 50)
        : undefined,
    ),
});

const projectsSchema = z.object({
  ...pagination,
  category: z.string().trim().max(40).optional(),
  technology: z.string().trim().max(40).optional(),
  status: z.enum(["active", "completed"]).optional(),
  memberUsername: slugish.optional(),
});

const feedSchema = z.object({
  ...pagination,
  type: z
    .enum(["announcement", "project", "event", "article", "community"])
    .optional(),
  tag: z.string().trim().max(40).optional(),
  authorUsername: slugish.optional(),
  projectSlug: slugish.optional(),
});

/** Related-count validation (?count=1..12, default 3). */
export const relatedCountSchema = z.coerce.number().int().min(1).max(12).default(3);

/** Slug/route-param safety — malformed ids fail as "not found", never throw. */
export function sanitizeSlug(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value) ? value : null;
}

export const QUERY_SCHEMAS = {
  events: { schema: eventsSchema, filterKeys: ["category", "status", "date", "featured"] },
  blogs: { schema: blogsSchema, filterKeys: ["category", "tag", "featured"] },
  gallery: { schema: gallerySchema, filterKeys: ["category", "year", "featured"] },
  watch: { schema: watchSchema, filterKeys: ["category", "duration", "featured"] },
  alumni: { schema: alumniSchema, filterKeys: ["batch", "field"] },
  members: { schema: membersSchema, filterKeys: ["batch", "domain", "featured", "usernames"] },
  projects: { schema: projectsSchema, filterKeys: ["category", "technology", "status", "memberUsername", "featured"] },
  feed: { schema: feedSchema, filterKeys: ["type", "tag", "authorUsername", "projectSlug"] },
} as const;

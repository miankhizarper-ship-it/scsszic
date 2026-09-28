import type { NextFunction, Request, RequestHandler, Response } from "express";

import { QUERY_SCHEMAS, fieldErrorsFromZod, parseQuery, relatedCountSchema, sanitizeSlug } from "../../http/querySchemas.js";
import { categorySectionSchema } from "../../http/categorySchemas.js";
import { isConnectionError } from "../../db/errors.js";
import { logger } from "../../utils/logger.js";
import { inUseCategoryNames, listCategories } from "../../repositories/content/categoriesRepository.js";
import { siteSettingsRepository } from "../../repositories/content/siteSettingsRepository.js";
import type { ListResult } from "../../repositories/content/listRepository.js";
import type { EnrichedFeedPost } from "../../repositories/content/feedRepository.js";

/**
 * Content API controllers (Phase 8) — request/response boundary for the
 * public content endpoints.
 *
 * Response contracts (existing API convention preserved):
 *   collections  → 200 { data: [...], meta: { total, page, pageSize, facets } }
 *   single items → 200 { data: {...} }
 *   errors       → 400 { message, errors? } · 404 { message }
 *                  · 503 when the database is unreachable · 500 otherwise
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

/**
 * Wrap an async handler: DB-down → 503, everything else → central 500.
 * `scope` only names the surface in server logs; shared with the Phase 9B
 * admin dashboard controller so every API area keeps the same convention.
 */
export function withErrorBoundary(handler: RequestHandler, scope = "content"): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      if (isConnectionError(error)) {
        logger.error(`[${scope}] database unavailable:`, error);
        res.status(503).json({
          message: "The service is temporarily unavailable. Please try again shortly.",
        });
        return;
      }
      next(error);
    }
  };
}

interface ListRepoLike<Domain> {
  list(query: import("../../repositories/content/listRepository.js").ContentQuery): Promise<ListResult<Domain>>;
}

/** GET collection — validated query → { data, meta }. */
export function createListHandler<Domain>(
  domain: keyof typeof QUERY_SCHEMAS,
  repo: ListRepoLike<Domain>,
): RequestHandler {
  const { schema, filterKeys } = QUERY_SCHEMAS[domain];
  return withErrorBoundary((req, res) => {
    const parsed = parseQuery(req.query, schema, [...filterKeys]);
    if (!parsed.ok) {
      res.status(400).json({ message: "Invalid query parameters.", errors: parsed.errors });
      return;
    }
    return repo.list(parsed.query).then((result) => {
      res.status(200).json({ data: result.items, meta: result.meta });
    });
  });
}

interface DetailRepoLike<Domain> {
  getBySlug(slug: string): Promise<Domain | null>;
}

/** GET single by slug — 404 for unknown OR malformed slugs. */
export function createDetailHandler<Domain>(
  repo: DetailRepoLike<Domain>,
  notFoundMessage: string,
): RequestHandler {
  return withErrorBoundary((req, res) => {
    const slug = sanitizeSlug(req.params.slug);
    if (!slug) {
      res.status(404).json({ message: notFoundMessage });
      return;
    }
    return repo.getBySlug(slug).then((item) => {
      if (!item) {
        res.status(404).json({ message: notFoundMessage });
        return;
      }
      res.status(200).json({ data: item });
    });
  });
}

interface UsernameRepoLike<Domain> {
  getByUsername(username: string): Promise<Domain | null>;
}

/** GET single by username (members/alumni profiles). */
export function createUsernameDetailHandler<Domain>(
  repo: UsernameRepoLike<Domain>,
  notFoundMessage: string,
): RequestHandler {
  return withErrorBoundary((req, res) => {
    const username = sanitizeSlug(req.params.username);
    if (!username) {
      res.status(404).json({ message: notFoundMessage });
      return;
    }
    return repo.getByUsername(username).then((item) => {
      if (!item) {
        res.status(404).json({ message: notFoundMessage });
        return;
      }
      res.status(200).json({ data: item });
    });
  });
}

interface RelatedRepoLike<Domain> {
  load(slug: string): Promise<Domain | null>;
  related(current: Domain, count: number): Promise<Domain[]>;
}

/**
 * GET related for a slug/username — related items for detail pages.
 * `load` is provided per domain (slug vs username lookups).
 */
export function createRelatedHandler<Domain>(
  repo: RelatedRepoLike<Domain>,
  notFoundMessage: string,
): RequestHandler {
  return withErrorBoundary((req, res) => {
    const slug = sanitizeSlug(req.params.slug);
    if (!slug) {
      res.status(404).json({ message: notFoundMessage });
      return;
    }
    // Phase 9I hardening: when the client SUPPLIES ?count=, an invalid value
    // is a query-validation failure (400) — the same convention every list
    // endpoint follows. Absent ?count= keeps its documented default of 3;
    // the previous silent fallback masked malformed input as "3 items".
    if (req.query.count !== undefined) {
      const count = relatedCountSchema.safeParse(req.query.count);
      if (!count.success) {
        res.status(400).json({
          message: "Invalid query parameters.",
          errors: fieldErrorsFromZod(count.error),
        });
        return;
      }
      return repo.load(slug).then(async (current) => {
        if (!current) {
          res.status(404).json({ message: notFoundMessage });
          return;
        }
        const items = await repo.related(current, count.data);
        res.status(200).json({ data: items });
      });
    }

    return repo.load(slug).then(async (current) => {
      if (!current) {
        res.status(404).json({ message: notFoundMessage });
        return;
      }
      const related = await repo.related(current, 3);
      res.status(200).json({ data: related });
    });
  });
}

interface FeedRepoLike {
  listEnriched(query: import("../../repositories/content/listRepository.js").ContentQuery): Promise<{
    items: EnrichedFeedPost[];
    meta: ListResult<EnrichedFeedPost>["meta"];
  }>;
}

/** GET /api/feed — listing WITH batched cross-reference enrichment. */
export function createFeedListHandler(repo: FeedRepoLike): RequestHandler {
  const { schema, filterKeys } = QUERY_SCHEMAS.feed;
  return withErrorBoundary((req, res) => {
    const parsed = parseQuery(req.query, schema, [...filterKeys]);
    if (!parsed.ok) {
      res.status(400).json({ message: "Invalid query parameters.", errors: parsed.errors });
      return;
    }
    return repo.listEnriched(parsed.query).then((result) => {
      res.status(200).json({ data: result.items, meta: result.meta });
    });
  });
}

/* ------------------------- Feed refs type re-export ------------------------- */
export type { FeedPostRefs, FeedAuthorSummary, FeedRefSummary } from "../../repositories/content/feedRepository.js";

/* ----------------------------- Categories (10C) ----------------------------- */

/**
 * GET /api/categories?section=… — public category vocabulary for the
 * listing filter chips. Returns the managed vocabulary ordered as the
 * admins maintain it, UNION the values actually in use (so legacy content
 * with a category that was since removed from the vocabulary remains
 * reachable through the filters). No auth — this is public site data.
 */
export const getPublicCategories: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = categorySectionSchema.safeParse(
      typeof req.query.section === "string" ? req.query.section : "",
    );
    if (!parsed.success) {
      res.status(400).json({ message: "Unknown category section." });
      return;
    }

    const section = parsed.data;
    const [managed, inUse] = await Promise.all([listCategories(section), inUseCategoryNames(section)]);
    const seen = new Set(managed.map((entry) => entry.name.toLowerCase()));
    const merged = [...managed.map((entry) => entry.name)];
    for (const name of inUse) {
      if (!seen.has(name.toLowerCase())) {
        merged.push(name);
        seen.add(name.toLowerCase());
      }
    }
    res.status(200).json({ data: { section, categories: merged } });
  },
  "public-categories",
);

/**
 * GET /api/settings (Task 15) — public site configuration: the footer
 * social links the admin manages under Admin → Settings. No auth, read-
 * only; returns the DEFAULT empty list before the first admin save (the
 * footer then renders its curated placeholder set, unchanged behavior).
 */
export const getPublicSettings: RequestHandler = withErrorBoundary(
  async (_req: Request, res: Response) => {
    const settings = await siteSettingsRepository.get();
    res.status(200).json({ data: settings });
  },
  "public-settings",
);

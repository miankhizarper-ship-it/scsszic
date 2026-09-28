import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminProjectsRepository } from "../../repositories/content/adminProjectsRepository.js";
import {
  adminProjectCreateSchema,
  adminProjectListQuerySchema,
  adminProjectStatusSchema,
  adminProjectUpdateSchema,
  projectFieldErrors,
  sanitizeProjectId,
} from "../../http/projectSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";
import { collections } from "../../db/collections.js";

/**
 * Admin Projects controllers (Phase 9F) — request/response boundary for
 * /api/admin/projects. The route layer has already enforced requireAdmin,
 * so every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation / unknown references)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate slug)
 *             503 when the database is unreachable
 *
 * Reference integrity (no dangling references): ownerUsername,
 * memberUsernames, and eventSlug are checked against the members and
 * events collections before persistence. Existence (any lifecycle state)
 * is the rule — visibility filtering stays the public repositories' read-
 * time concern, exactly as the enrichment/feed architecture already treats
 * it. Referenced records are never modified.
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Project not found.";
const DUPLICATE = "A project with this slug already exists.";
const DUPLICATE_FIELD = "This slug is already taken — choose another.";

/** Member usernames that do not exist (any status counts as existing). */
async function unknownMemberUsernames(usernames: string[]): Promise<string[]> {
  const unique = [...new Set(usernames.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await collections
    .members()
    .find({ username: { $in: unique } }, { projection: { username: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.username));
  return unique.filter((username) => !known.has(username));
}

/** Event slugs that do not exist. */
async function unknownEventSlugs(slugs: string[]): Promise<string[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await collections
    .events()
    .find({ slug: { $in: unique } }, { projection: { slug: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.slug));
  return unique.filter((slug) => !known.has(slug));
}

/** Builds the 400 body when project references don't resolve. */
async function projectReferenceErrors(input: {
  ownerUsername?: string;
  memberUsernames?: string[];
  eventSlug?: string;
}): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};

  const team = [
    ...(input.ownerUsername ? [input.ownerUsername] : []),
    ...(input.memberUsernames ?? []),
  ];
  const missingMembers = await unknownMemberUsernames(team);
  if (missingMembers.length > 0) {
    const ownerMissing = input.ownerUsername ? missingMembers.includes(input.ownerUsername) : false;
    const teamMissing = (input.memberUsernames ?? []).filter((u) => missingMembers.includes(u));
    if (ownerMissing) errors.ownerUsername = `Unknown member reference: ${input.ownerUsername}.`;
    if (teamMissing.length > 0) {
      errors.memberUsernames = `Unknown member reference: ${teamMissing.join(", ")}.`;
    }
  }

  if (input.eventSlug) {
    const missingEvents = await unknownEventSlugs([input.eventSlug]);
    if (missingEvents.length > 0) {
      errors.eventSlug = `Unknown event reference: ${input.eventSlug}.`;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** GET /api/admin/projects — search/filter/sort/paginate the management table. */
export const listAdminProjects: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminProjectListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: projectFieldErrors(parsed.error) });
      return;
    }
    const result = await adminProjectsRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-projects",
);

/** GET /api/admin/projects/:id — single project (any status), 404 when unknown. */
export const getAdminProject: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const project = await adminProjectsRepository.getById(id);
    if (!project) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: project });
  },
  "admin-projects",
);

/** POST /api/admin/projects — create; dangling refs → 400, duplicate slug → 409. */
export const createAdminProject: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminProjectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: projectFieldErrors(parsed.error) });
      return;
    }

    // Field-level reference validation runs BEFORE the slug conflict check
    // so a payload with both problems reports the validation error (400).
    const refErrors = await projectReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    // Task 16 — the admin forms no longer send a slug: the backend derives
    // a unique handle from the title (collisions become clean -2 variants).
    const slug = parsed.data.slug ?? (await generateUniqueHandle("projects", parsed.data.title));

    if (await adminProjectsRepository.slugExists(slug)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const project = await adminProjectsRepository.create({ ...parsed.data, slug });
      await recordAudit(req, {
        action: "project.created",
        resourceType: "project",
        resourceId: project.id,
        resourceLabel: project.title,
        metadata: { slug: project.slug, status: project.status },
      });
      res.status(201).json({ data: project });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { slug: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-projects",
);

/** PATCH /api/admin/projects/:id — partial update with the same guarantees. */
export const updateAdminProject: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminProjectUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: projectFieldErrors(parsed.error) });
      return;
    }

    const refErrors = await projectReferenceErrors(parsed.data);
    if (refErrors) {
      res.status(400).json({ message: "Please fix the highlighted fields.", errors: refErrors });
      return;
    }

    if (parsed.data.slug && (await adminProjectsRepository.slugExists(parsed.data.slug, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { slug: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const project = await adminProjectsRepository.update(id, parsed.data);
      if (!project) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "project.updated",
        resourceType: "project",
        resourceId: project.id,
        resourceLabel: project.title,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: project });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { slug: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-projects",
);

/** PATCH /api/admin/projects/:id/status — safe lifecycle transition. */
export const updateAdminProjectStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminProjectStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: projectFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminProjectsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const project = await adminProjectsRepository.updateStatus(id, parsed.data.status);
    if (!project) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "project.status.updated",
      resourceType: "project",
      resourceId: project.id,
      resourceLabel: project.title,
      metadata: { from: existing.status, to: project.status },
    });
    res.status(200).json({ data: project });
  },
  "admin-projects",
);

/** DELETE /api/admin/projects/:id — explicit single-record deletion. */
export const deleteAdminProject: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminProjectsRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const deleted = await adminProjectsRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "project.deleted",
      resourceType: "project",
      resourceId: id,
      resourceLabel: existing.title,
      metadata: { slug: existing.slug },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-projects",
);

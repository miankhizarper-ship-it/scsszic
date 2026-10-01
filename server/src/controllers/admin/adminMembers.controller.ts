import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminMembersRepository } from "../../repositories/content/adminMembersRepository.js";
import { adminUsersRepository } from "../../repositories/adminUsersRepository.js";
import { userRepository } from "../../auth/store.js";
import { MEMBER_ROLE, USER_ROLE } from "../../auth/types.js";
import {
  adminMemberCreateSchema,
  adminMemberListQuerySchema,
  adminMemberStatusSchema,
  adminMemberUpdateSchema,
  memberFieldErrors,
  sanitizeMemberId,
} from "../../http/memberSchemas.js";
import { isDuplicateKeyError } from "../../db/errors.js";
import { collections } from "../../db/collections.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import { generateUniqueHandle } from "../../repositories/content/slugAvailabilityRepository.js";

/**
 * Admin Members controllers (Phase 9E) — request/response boundary for
 * /api/admin/members. The route layer has already enforced requireAdmin, so
 * every request here carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation / unknown projectSlugs)
 *             404 { message } (unknown/malformed id)
 *             409 { message, errors } (duplicate username)
 *             503 when the database is unreachable
 *
 * Status transitions use the model's OWN directory lifecycle
 * (active/alumni/archived). Archiving a member here hides it from the
 * public directory/profile (the public repository's existing gate) — the
 * admin surface keeps seeing it. Public visibility rules are untouched.
 *
 * Raw Mongo errors and stack traces NEVER reach clients.
 */

const NOT_FOUND = "Member profile not found.";
const DUPLICATE = "A member with this username already exists.";
const DUPLICATE_FIELD = "This username is already taken — choose another.";
const USER_NOT_FOUND = "The selected account does not exist.";
const USER_ALREADY_LINKED = "This account already has a member record.";

/**
 * Member-handle pattern — mirrors the public profile URL rules. Account
 * usernames allow underscores; member handles don't, so derived handles are
 * sanitized (underscore → hyphen) before use.
 */
const MEMBER_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * Task 29 — derive the directory handle from the account username so the
 * public profile lives at the handle the account already owns (the account
 * page links by handle match, and members self-edit at /profile/<handle>).
 * Falls back to the name-based generator when the sanitized username is not
 * usable or already taken.
 */
async function deriveMemberUsername(accountUsername: string, name: string): Promise<string> {
  const sanitized = accountUsername
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .slice(0, 80);
  if (sanitized.length > 0 && MEMBER_HANDLE_PATTERN.test(sanitized)) {
    const taken = await adminMembersRepository.usernameExists(sanitized);
    if (!taken) return sanitized;
  }
  return generateUniqueHandle("members", name);
}

/**
 * Project cross-reference check — projectSlugs reference the projects
 * showcase (member profiles list their builds). Unknown slugs → 400 with a
 * field error; the referenced projects themselves are never modified.
 */
async function unknownProjectSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const found = await collections
    .projects()
    .find({ slug: { $in: slugs } }, { projection: { slug: 1 } })
    .toArray();
  const known = new Set(found.map((doc) => doc.slug));
  return slugs.filter((slug) => !known.has(slug));
}

/** GET /api/admin/members — search/filter/sort/paginate the management table. */
export const listAdminMembers: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminMemberListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: memberFieldErrors(parsed.error) });
      return;
    }
    const result = await adminMembersRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-members",
);

/** GET /api/admin/members/:id — single member (any status), 404 when unknown. */
export const getAdminMember: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeMemberId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const member = await adminMembersRepository.getById(id);
    if (!member) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: member });
  },
  "admin-members",
);

/**
 * GET /api/admin/members/candidates — accounts WITHOUT a member record
 * (Task 29's user-first creation flow). Registered BEFORE /:id in the
 * router. Safe fields only, bounded page.
 */
export const listAdminMemberCandidates: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const limitRaw = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : 10;
    const limit = Number.isFinite(limitRaw) ? limitRaw : 10;
    const candidates = await adminUsersRepository.listCandidates({ search, limit });
    res.status(200).json({
      data: candidates.map((candidate) => ({
        id: candidate.id,
        username: candidate.username,
        email: candidate.email,
        displayName: candidate.displayName,
        role: candidate.role,
        createdAt: candidate.createdAt,
      })),
      meta: { count: candidates.length },
    });
  },
  "admin-members",
);

/** POST /api/admin/members — create FROM an existing account (Task 29):
 *  duplicate usernames → 409, unknown project refs → 400, unknown/linked
 *  account → 400, and the account gains the "member" role on success. */
export const createAdminMember: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminMemberCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: memberFieldErrors(parsed.error) });
      return;
    }

    // Task 29 linkage — the account must exist and must not already own a
    // member record. Checked BEFORE content validation so a wrong account
    // is reported first (the picker is step one of the flow).
    const account = await userRepository.findById(parsed.data.userId);
    if (!account) {
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: { userId: USER_NOT_FOUND },
      });
      return;
    }
    const existingLink = await adminMembersRepository.findByUserId(parsed.data.userId);
    if (existingLink) {
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: { userId: USER_ALREADY_LINKED },
      });
      return;
    }

    // Field-level validation (unknown project references) runs BEFORE the
    // uniqueness pre-check so a payload with both problems reports the
    // validation error (400), not the conflict (409).
    const missing = await unknownProjectSlugs(parsed.data.projectSlugs ?? []);
    if (missing.length > 0) {
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: { projectSlugs: `Unknown project reference: ${missing.join(", ")}.` },
      });
      return;
    }

    // Task 16 — the admin forms no longer send a username: the backend
    // derives a unique handle from the account (Task 29) or the name, so
    // the public profile inherits the account's identity.
    const username =
      parsed.data.username ?? (await deriveMemberUsername(account.username, parsed.data.name));

    if (await adminMembersRepository.usernameExists(username)) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { username: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const member = await adminMembersRepository.create({ ...parsed.data, username });
      // Grant the society-member role — the account now owns this record.
      await userRepository.setRole(account.id, MEMBER_ROLE);
      await recordAudit(req, {
        action: "member.created",
        resourceType: "member",
        resourceId: member.id,
        resourceLabel: member.name,
        metadata: {
          username: member.username,
          status: member.status,
          linkedAccount: account.username,
        },
      });
      res.status(201).json({ data: member });
    } catch (error) {
      // Race between the pre-check and insert — still a clean 409.
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { username: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-members",
);

/** PATCH /api/admin/members/:id — partial update with the same guarantees. */
export const updateAdminMember: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeMemberId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminMemberUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: memberFieldErrors(parsed.error) });
      return;
    }

    // Same ordering as create: reference validation before the conflict check.
    const missing = await unknownProjectSlugs(parsed.data.projectSlugs ?? []);
    if (missing.length > 0) {
      res.status(400).json({
        message: "Please fix the highlighted fields.",
        errors: { projectSlugs: `Unknown project reference: ${missing.join(", ")}.` },
      });
      return;
    }

    if (parsed.data.username && (await adminMembersRepository.usernameExists(parsed.data.username, id))) {
      res.status(409).json({
        message: DUPLICATE,
        errors: { username: DUPLICATE_FIELD },
      });
      return;
    }

    try {
      const member = await adminMembersRepository.update(id, parsed.data);
      if (!member) {
        res.status(404).json({ message: NOT_FOUND });
        return;
      }
      await recordAudit(req, {
        action: "member.updated",
        resourceType: "member",
        resourceId: member.id,
        resourceLabel: member.name,
        metadata: { fields: changedFields(parsed.data) },
      });
      res.status(200).json({ data: member });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({
          message: DUPLICATE,
          errors: { username: DUPLICATE_FIELD },
        });
        return;
      }
      throw error;
    }
  },
  "admin-members",
);

/** PATCH /api/admin/members/:id/status — safe directory-status transition. */
export const updateAdminMemberStatus: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeMemberId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminMemberStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: memberFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminMembersRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const member = await adminMembersRepository.updateStatus(id, parsed.data.status);
    if (!member) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    await recordAudit(req, {
      action: "member.status.updated",
      resourceType: "member",
      resourceId: member.id,
      resourceLabel: member.name,
      metadata: { from: existing.status, to: member.status },
    });
    res.status(200).json({ data: member });
  },
  "admin-members",
);

/** DELETE /api/admin/members/:id — explicit single-record deletion. The
 *  linked account (if any) is demoted back to "user": member powers come
 *  from owning a directory record, so the role can never outlive it. */
export const deleteAdminMember: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeMemberId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const existing = await adminMembersRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    // Read the linkage BEFORE the delete (the doc is gone afterwards).
    const link = await adminMembersRepository.getLinkById(id);

    const deleted = await adminMembersRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    // Demote ONLY a real member-role account; manage/admin roles are
    // independent grants that must survive a record deletion.
    if (link?.userId) {
      const account = await userRepository.findById(link.userId);
      if (account && account.role === MEMBER_ROLE) {
        await userRepository.setRole(account.id, USER_ROLE);
      }
    }

    await recordAudit(req, {
      action: "member.deleted",
      resourceType: "member",
      resourceId: id,
      resourceLabel: existing.name,
      metadata: {
        username: existing.username,
        ...(link?.userId ? { unlinkedAccount: link.userId } : {}),
      },
    });
    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-members",
);

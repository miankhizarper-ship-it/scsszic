import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { adminUsersRepository } from "../../repositories/adminUsersRepository.js";
import {
  adminUserListQuerySchema,
  adminUserUpdateSchema,
  sanitizeAdminUserId,
  userFieldErrors,
} from "../../http/userSchemas.js";
import { sessionStore } from "../../auth/store.js";
import { recordAudit } from "../../audit/auditLogger.js";

/**
 * Admin Users controllers (Phase 9H) — request/response boundary for
 * /api/admin/users. The route layer has already enforced requireAdmin, so
 * every request carries a verified admin session.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: [...], meta: { total, page, pageSize, totalPages, facets } }
 *   single  → 200 { data: {...} }
 *   errors  → 400 { message, errors } (validation)
 *             404 { message } (unknown/malformed id)
 *             409 { message }  (final-admin / self safeguards)
 *             503 when the database is unreachable
 *
 * FINAL-ADMIN SAFEGUARDS (spec §3) — enforced HERE, server-side, never
 * merely hidden in the UI:
 *   - the last administrator can never be demoted or deleted by any actor,
 *     including themselves;
 *   - a signed-in administrator can never delete their own account (a
 *     self-delete while the session is live is always unsafe; stepping down
 *     via a role change IS allowed when another administrator remains);
 *   - messages are clear and generic — no implementation details leak.
 *
 * Only safe fields ever leave this module (the repository's SafeAdminUser
 * projection): passwordHash/session internals cannot be returned because
 * they are never mapped.
 */

const NOT_FOUND = "User not found.";
const LAST_ADMIN =
  "This action would leave the society without an administrator. Promote another administrator first.";
const SELF_DELETE = "You cannot delete the account you are signed in with.";

/** GET /api/admin/users — search/filter/sort/paginate the accounts table. */
export const listAdminUsers: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const parsed = adminUserListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters.", errors: userFieldErrors(parsed.error) });
      return;
    }
    const result = await adminUsersRepository.list(parsed.data);
    res.status(200).json({ data: result.items, meta: result.meta });
  },
  "admin-users",
);

/** GET /api/admin/users/:id — single account (safe fields), 404 when unknown. */
export const getAdminUser: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAdminUserId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    const user = await adminUsersRepository.getById(id);
    if (!user) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }
    res.status(200).json({ data: user });
  },
  "admin-users",
);

/**
 * PATCH /api/admin/users/:id — displayName and/or role update with the
 * final-admin safeguard. A role change audit entry distinguishes the
 * sensitive dimension (user.role.updated) from an ordinary profile edit.
 */
export const updateAdminUser: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAdminUserId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    const parsed = adminUserUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: userFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminUsersRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    // Safeguard: demoting the LAST administrator (self or anyone) is always
    // rejected. Self-demotion with another admin present is allowed — that
    // is a deliberate handover, and the other admin retains access.
    const demotesSelfToMember = req.user?.id === id && parsed.data.role === "member";
    if (
      existing.role === "admin" &&
      parsed.data.role === "member" &&
      (await adminUsersRepository.countOtherAdmins(id)) === 0
    ) {
      res.status(409).json({
        message: demotesSelfToMember
          ? "You are the only administrator — promote another administrator before stepping down."
          : LAST_ADMIN,
        errors: { role: LAST_ADMIN },
      });
      return;
    }

    const user = await adminUsersRepository.update(id, parsed.data);
    if (!user) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    if (parsed.data.role !== undefined && parsed.data.role !== existing.role) {
      await recordAudit(req, {
        action: "user.role.updated",
        resourceType: "user",
        resourceId: id,
        resourceLabel: user.username,
        metadata: { from: existing.role, to: parsed.data.role },
      });
    }
    await recordAudit(req, {
      action: "user.updated",
      resourceType: "user",
      resourceId: id,
      resourceLabel: user.username,
      metadata: { fields: Object.keys(parsed.data).sort().join(", ") },
    });

    res.status(200).json({ data: user });
  },
  "admin-users",
);

/**
 * DELETE /api/admin/users/:id — explicit single-account deletion with both
 * safeguards (never the last admin, never the signed-in account). All of
 * the deleted account's sessions are invalidated server-side so the change
 * takes effect immediately.
 */
export const deleteAdminUser: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const id = sanitizeAdminUserId(req.params.id);
    if (!id) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    if (req.user?.id === id) {
      res.status(409).json({ message: SELF_DELETE });
      return;
    }

    const existing = await adminUsersRepository.getById(id);
    if (!existing) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    // Safeguard: deleting the LAST administrator is always rejected.
    if (existing.role === "admin" && (await adminUsersRepository.countOtherAdmins(id)) === 0) {
      res.status(409).json({ message: LAST_ADMIN });
      return;
    }

    const deleted = await adminUsersRepository.remove(id);
    if (!deleted) {
      res.status(404).json({ message: NOT_FOUND });
      return;
    }

    // The deleted account must lose access immediately — drop its sessions.
    await sessionStore.invalidateAllForUser(id);

    await recordAudit(req, {
      action: "user.deleted",
      resourceType: "user",
      resourceId: id,
      resourceLabel: existing.username,
      metadata: { role: existing.role },
    });

    res.status(200).json({ data: { id, deleted: true } });
  },
  "admin-users",
);

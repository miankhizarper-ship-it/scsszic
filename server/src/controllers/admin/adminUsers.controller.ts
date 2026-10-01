import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import type { AdminPermission } from "../../auth/types.js";
import { adminUsersRepository } from "../../repositories/adminUsersRepository.js";
import { adminMembersRepository } from "../../repositories/content/adminMembersRepository.js";
import {
  adminUserListQuerySchema,
  adminUserUpdateSchema,
  normalizeAdminPermissions,
  sanitizeAdminUserId,
  userFieldErrors,
} from "../../http/userSchemas.js";
import type { AdminUserUpdateInput } from "../../http/userSchemas.js";
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
 * PATCH /api/admin/users/:id — displayName, role and/or per-user permissions
 * update (Phase 10B extends the Phase 9H surface) with the final-admin
 * safeguard. Audit entries distinguish the sensitive dimensions
 * (user.role.updated / user.permissions.updated) from an ordinary edit.
 *
 * Permission policy (server-side, authoritative):
 *   - the effective role AFTER this update decides the stored grants;
 *   - "manage" keeps/sets the requested (validated, deduped, canonically
 *     ordered) permission list;
 *   - switching to member/admin CLEARS the stored list — stale manage grants
 *     can never linger on an account that no longer has the manage role;
 *     admins bypass permission checks anyway, so their stored list stays [].
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

    const effectiveRole = parsed.data.role ?? existing.role;

    // Task 29 — a society member's role comes from the member-record
    // linkage (members.userId). Changing it here would strand the record
    // (or the role), so role edits on linked accounts are refused: delete
    // the member record first (Members CMS), or re-link via "Add to
    // members". displayName/permissions edits stay allowed.
    if (parsed.data.role !== undefined && parsed.data.role !== existing.role) {
      const ownedRecord = await adminMembersRepository.findByUserId(id);
      if (ownedRecord) {
        res.status(409).json({
          message:
            "This account owns a member record, so its role comes from that linkage. Delete the member record first to change the account's role.",
          errors: { role: "Remove the linked member record before changing this role." },
        });
        return;
      }
    }

    // Safeguard: demoting the LAST administrator (to member OR manage —
    // anything that strips the admin role) is always rejected, self or
    // anyone. Self-demotion with another admin present is allowed — that is
    // a deliberate handover, and the other admin retains access.
    const demotesSelf = req.user?.id === id && effectiveRole !== "admin";
    if (
      existing.role === "admin" &&
      effectiveRole !== "admin" &&
      (await adminUsersRepository.countOtherAdmins(id)) === 0
    ) {
      res.status(409).json({
        message: demotesSelf
          ? "You are the only administrator — promote another administrator before stepping down."
          : LAST_ADMIN,
        errors: { role: LAST_ADMIN },
      });
      return;
    }

    // Permissions normalization: only "manage" accounts carry grants.
    let permissions: AdminPermission[] | undefined;
    if (parsed.data.permissions !== undefined) {
      permissions =
        effectiveRole === "manage"
          ? normalizeAdminPermissions(parsed.data.permissions)
          : []; // stale grants cleared when the role is not manage
    } else if (parsed.data.role !== undefined && existing.role === "manage" && effectiveRole !== "manage") {
      // Role switched AWAY from manage without an explicit permissions key —
      // clear proactively so revoked managers keep no dormant grants.
      permissions = [];
    }

    const update: AdminUserUpdateInput = {
      ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(permissions !== undefined ? { permissions } : {}),
    };

    const user = await adminUsersRepository.update(id, update);
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

    const before = existing.permissions ?? [];
    const after = user.permissions ?? [];
    const permissionsChanged =
      permissions !== undefined &&
      (before.length !== after.length || before.some((entry) => !after.includes(entry)));
    if (permissionsChanged) {
      const added = after.filter((entry) => !before.includes(entry));
      const removed = before.filter((entry) => !after.includes(entry));
      await recordAudit(req, {
        action: "user.permissions.updated",
        resourceType: "user",
        resourceId: id,
        resourceLabel: user.username,
        metadata: {
          ...(added.length > 0 ? { added: added.join(", ") } : {}),
          ...(removed.length > 0 ? { removed: removed.join(", ") } : {}),
          total: after.length,
        },
      });
    }

    await recordAudit(req, {
      action: "user.updated",
      resourceType: "user",
      resourceId: id,
      resourceLabel: user.username,
      metadata: { fields: Object.keys(update).sort().join(", ") },
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

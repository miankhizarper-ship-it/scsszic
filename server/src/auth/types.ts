/**
 * Authentication domain types (server-side).
 *
 * Phase 7 — Authentication Foundation:
 *   AuthUser       the full server-side record, INCLUDING passwordHash.
 *                  Never leaves the server, never enters logs.
 *   PublicAuthUser the client-safe DTO. This is the ONLY shape that may be
 *                  attached to requests, responses, or the session context.
 *
 * Phase 8 replaces the in-memory repository behind these types with MongoDB —
 * the shapes are already document-oriented (string ids, ISO date strings) so
 * Mongoose models can adopt them without touching route handlers.
 */

/**
 * Task 29 roles. "user" is the DEFAULT role for every signup — an account
 * from OUTSIDE the society directory that can browse, like, and comment.
 * "member" is a society member: the account owns a LINKED member-directory
 * record (members.userId == account id) and gains the community powers —
 * creating feed posts and editing its own public profile — but NEVER admin
 * panel access. "manage" is the content-manager role: no user management,
 * no audit access — only the CMS sections explicitly granted to that account
 * via `permissions` (admin always bypasses permission checks).
 *
 * Legacy accounts created before Task 29 carry role "member" without any
 * linked record — the repository mapping + the boot migration
 * (normalizeLegacyMemberRoles) treat those as plain "user" accounts.
 */
export type AuthUserRole = "user" | "member" | "manage" | "admin";

/** Role granted to an account when a member record is linked to it. */
export const MEMBER_ROLE: AuthUserRole = "member";
/** Role of every fresh signup (and of accounts demoted from "member"). */
export const USER_ROLE: AuthUserRole = "user";

/**
 * Phase 10B granular CMS permissions + Phase 12 "team" — the admin content
 * sections. Permissions belong to INDIVIDUAL users (no role-wide grants):
 * a manage user may access /api/admin/<section> only when their own
 * `permissions` array includes that section. Server-side enforcement is the
 * only security boundary (requireAdminOrPermission); UI visibility is UX only.
 */
export const ADMIN_PERMISSIONS = [
  "events",
  "blogs",
  "alumni",
  "members",
  "projects",
  "feed",
  "gallery",
  "videos",
  "team",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** Runtime guard — filters anything unrecognised out of a permissions array. */
export function toAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is AdminPermission =>
    (ADMIN_PERMISSIONS as readonly string[]).includes(entry),
  );
}

/** Full user record — SECRET-CONTAINING, server-only. */
export interface AuthUser {
  id: string;
  username: string;
  /** Lowercase-normalized, used for uniqueness + login lookup. */
  email: string;
  /** bcrypt hash — NEVER returned by any API response. Google-OAuth-only
   *  accounts have NO password: the field is absent and password login is
   *  refused with the generic invalid-credentials answer. */
  passwordHash?: string;
  displayName: string;
  role: AuthUserRole;
  /** Phase 10B — per-user CMS sections for the "manage" role. Admins bypass
   *  permission checks entirely; members have none. Normalized to [] by the
   *  repository mapping when absent, so pre-10B documents need no migration. */
  permissions: AdminPermission[];
  /** Email verification. Absent in pre-verification documents — those are
   *  legacy accounts which the repository mapping treats as VERIFIED so the
   *  feature can ship without any migration. */
  isVerified: boolean;
  /** Google account subject id (the stable `sub` claim) for accounts created
   *  or linked through "Continue with Google". Absent on password accounts. */
  googleId?: string;
  /** Google account avatar URL — captured at OAuth time and refreshed on
   *  every linked login. Only https URLs are ever stored (see googleOAuth);
   *  shown back to the account owner on /account. Absent on password
   *  accounts and when Google reports no avatar. */
  picture?: string;
  /** Phase 6 Member (`data/members.ts`) this account can claim as its
   *  public community profile. Optional until accounts and member records
   *  are formally linked (Phase 8, MongoDB-backed). */
  memberProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Client-safe user representation — no passwordHash, no session data. */
export interface PublicAuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: AuthUserRole;
  /** Phase 10B — CMS sections this account may manage (empty unless role
   *  is "manage" with grants; the admin role bypasses permission checks). */
  permissions: AdminPermission[];
  /** Whether the account's email address is verified. Legacy accounts
   *  (created before verification existed) are always true. */
  isVerified: boolean;
  /** The account owner's Google avatar, when the account uses Google
   *  sign-in and Google reports one — displayed only to the owner. */
  picture?: string;
  memberProfileId?: string;
  createdAt: string;
}

/** Strip all secrets from an AuthUser before it crosses any boundary. */
export function toPublicUser(user: AuthUser): PublicAuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    permissions: toAdminPermissions(user.permissions),
    isVerified: user.isVerified,
    ...(user.picture ? { picture: user.picture } : {}),
    ...(user.memberProfileId ? { memberProfileId: user.memberProfileId } : {}),
    createdAt: user.createdAt,
  };
}

/** Normalized + validated signup payload (output of validation.ts). */
export interface ValidatedSignup {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

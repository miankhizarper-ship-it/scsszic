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

export type AuthUserRole = "member" | "admin";

/** Full user record — SECRET-CONTAINING, server-only. */
export interface AuthUser {
  id: string;
  username: string;
  /** Lowercase-normalized, used for uniqueness + login lookup. */
  email: string;
  /** bcrypt hash — NEVER returned by any API response. */
  passwordHash: string;
  displayName: string;
  role: AuthUserRole;
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

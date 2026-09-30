import { randomUUID } from "node:crypto";

import type { AdminPermission, AuthUser, AuthUserRole } from "./types.js";
import { toAdminPermissions } from "./types.js";

/**
 * Temporary user repository — Phase 7 development-only persistence.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  PHASE 8: MongoDB replaces the in-memory Map with a Mongoose-backed     │
 * │  implementation of the SAME interface. Route handlers, middleware and   │
 * │  session code never import this file directly — they receive the        │
 * │  repository, so the swap is a one-file change plus wiring.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Why async signatures on an in-memory store? MongoDB (and every real
 * repository) is I/O-backed. Keeping the interface async from day one means
 * Phase 8 introduces zero call-site churn.
 *
 * Rules enforced here (not in route handlers):
 *  - emails stored + compared lowercase (case-insensitive uniqueness)
 *  - usernames stored as given, compared lowercase (case-insensitive
 *    uniqueness); the display casing is preserved for the profile handle
 *  - ids are opaque strings (UUID today, ObjectId.toHexString in Phase 8)
 */

/** Data needed to create a user — password arrives pre-hashed. Google
 *  OAuth accounts omit passwordHash entirely (no password exists). */
export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  role?: AuthUserRole;
  /** Phase 10B — optional per-user CMS grants (normalized/validated). */
  permissions?: AdminPermission[];
  memberProfileId?: string;
  /** Google subject id for OAuth-created accounts (never exposed publicly). */
  googleId?: string;
  /** Email verification. Default true (legacy/demo accounts pre-date the
   *  flow); the signup controller passes false explicitly when the Brevo
   *  verification flow is enabled. */
  isVerified?: boolean;
}

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  /** Store (or replace) the pending verification token hash + expiry. */
  setEmailVerification(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Find the user holding this pending token hash, WITH its expiry so the
   *  caller can distinguish valid from expired links. */
  findByVerificationTokenHash(tokenHash: string): Promise<VerificationTarget | null>;
  /** Flip isVerified to true and remove the pending token. */
  markEmailVerified(userId: string): Promise<void>;
  /** Drop a stale/expired pending token without verifying. */
  clearEmailVerification(userId: string): Promise<void>;
}

/** A user + the expiry of their pending verification token (null = none). */
export interface VerificationTarget {
  user: AuthUser;
  expiresAt: Date | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Usernames are case-insensitive unique handles; keep original casing for display. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

interface PendingVerification {
  tokenHash: string;
  expiresAt: Date;
}

export class InMemoryUserRepository implements UserRepository {
  /** Keyed by id. Demo seed data lives only for the process lifetime. */
  private readonly users = new Map<string, AuthUser>();
  private readonly emails = new Set<string>();
  private readonly usernames = new Set<string>();

  async findByEmail(email: string): Promise<AuthUser | null> {
    const normalized = normalizeEmail(email);
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  async findByUsername(username: string): Promise<AuthUser | null> {
    const normalized = normalizeUsername(username);
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === normalized) return user;
    }
    return null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    if (this.emails.has(email)) {
      throw new DuplicateUserError("email");
    }
    const username = normalizeUsername(input.username);
    if (this.usernames.has(username)) {
      throw new DuplicateUserError("username");
    }

    const now = new Date().toISOString();
    const user: AuthUser = {
      id: randomUUID(),
      username: input.username.trim(),
      email,
      ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
      ...(input.googleId ? { googleId: input.googleId } : {}),
      displayName: input.displayName.trim(),
      role: input.role ?? "member",
      permissions: toAdminPermissions(input.permissions),
      isVerified: input.isVerified ?? true,
      ...(input.memberProfileId ? { memberProfileId: input.memberProfileId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    this.emails.add(email);
    this.usernames.add(username);
    return user;
  }

  async setEmailVerification(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    (user as AuthUser & { emailVerification?: PendingVerification }).emailVerification =
      { tokenHash, expiresAt };
  }

  async findByVerificationTokenHash(tokenHash: string): Promise<VerificationTarget | null> {
    for (const user of this.users.values()) {
      const pending = (user as AuthUser & { emailVerification?: PendingVerification })
        .emailVerification;
      if (pending?.tokenHash === tokenHash) {
        return { user, expiresAt: pending.expiresAt ?? null };
      }
    }
    return null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    user.isVerified = true;
    delete (user as AuthUser & { emailVerification?: unknown }).emailVerification;
  }

  async clearEmailVerification(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    delete (user as AuthUser & { emailVerification?: unknown }).emailVerification;
  }
}

/** Thrown by createUser — mapped to HTTP 409 by the controller, never leaked further. */
export class DuplicateUserError extends Error {
  readonly field: "email" | "username";

  constructor(field: "email" | "username") {
    super(`A user with this ${field} already exists`);
    this.name = "DuplicateUserError";
    this.field = field;
  }
}

import { randomUUID } from "node:crypto";

import type { AuthUser, AuthUserRole } from "./types.js";

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

/** Data needed to create a user — password arrives pre-hashed. */
export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role?: AuthUserRole;
  memberProfileId?: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Usernames are case-insensitive unique handles; keep original casing for display. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
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
      passwordHash: input.passwordHash,
      displayName: input.displayName.trim(),
      role: input.role ?? "member",
      ...(input.memberProfileId ? { memberProfileId: input.memberProfileId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    this.emails.add(email);
    this.usernames.add(username);
    return user;
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

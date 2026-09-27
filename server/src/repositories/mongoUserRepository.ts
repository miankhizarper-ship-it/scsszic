import { randomUUID } from "node:crypto";

import { collections } from "../db/collections.js";
import { duplicateKeyField, isDuplicateKeyError } from "../db/errors.js";
import type { AuthUser } from "../auth/types.js";
import type { CreateUserInput, UserRepository } from "../auth/userRepository.js";
import { DuplicateUserError, normalizeEmail, normalizeUsername } from "../auth/userRepository.js";
import type { UserDoc } from "../db/collections.js";

/**
 * MongoDB-backed UserRepository (Phase 8).
 *
 * Implements the Phase 7 interface EXACTLY — call sites (auth controller,
 * middleware, session resolution) are unchanged:
 *
 *   findByEmail   case-insensitive (normalizedEmail unique index)
 *   findByUsername case-insensitive (normalizedUsername unique index)
 *   findById      opaque string id (== document _id)
 *   createUser    DB-level uniqueness; E11000 → DuplicateUserError so the
 *                 existing controller maps races to a clean HTTP 409
 *
 * Preserved Phase 7 semantics:
 *  - emails stored lowercase; usernames stored as-given with lowercase
 *    normalization for lookup/uniqueness (display casing preserved)
 *  - password hashes stored verbatim (already bcrypt-hashed upstream) and
 *    NEVER included in any mapping output
 *  - `memberProfileId` passthrough for the AuthUser → Member link
 */
export class MongoUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<AuthUser | null> {
    const doc = await collections.users().findOne({
      normalizedEmail: normalizeEmail(email),
    });
    return doc ? toAuthUser(doc) : null;
  }

  async findByUsername(username: string): Promise<AuthUser | null> {
    const doc = await collections.users().findOne({
      normalizedUsername: normalizeUsername(username),
    });
    return doc ? toAuthUser(doc) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    // Guard against malformed ids reaching a Mongo query (spec §20 —
    // malformed identifiers fail safely, never throw).
    if (typeof id !== "string" || id.length < 8 || id.length > 128) return null;
    const doc = await collections.users().findOne({ _id: id });
    return doc ? toAuthUser(doc) : null;
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    const username = input.username.trim();
    const now = new Date().toISOString();

    const doc: UserDoc = {
      _id: randomUUID(),
      id: "",
      username,
      normalizedUsername: normalizeUsername(username),
      email,
      normalizedEmail: email,
      passwordHash: input.passwordHash,
      displayName: input.displayName.trim(),
      role: input.role ?? "member",
      ...(input.memberProfileId ? { memberProfileId: input.memberProfileId } : {}),
      createdAt: now,
      updatedAt: now,
    };
    doc.id = doc._id;

    try {
      await collections.users().insertOne(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        // The application-level pre-checks in the controller narrow this to
        // email/username; the DB index is the authoritative guarantee.
        throw new DuplicateUserError(
          duplicateKeyField(error) === "email" ? "email" : "username",
        );
      }
      throw error;
    }

    return toAuthUser(doc);
  }
}

/**
 * Document → AuthUser mapping. This is the ONLY place user records are
 * shaped; passwordHash stays on the record (the auth layer needs it to
 * verify logins) but NEVER reaches a response — controllers emit
 * toPublicUser(user) exclusively.
 */
function toAuthUser(doc: UserDoc): AuthUser {
  return {
    id: doc.id || doc._id,
    username: doc.username,
    email: doc.email,
    passwordHash: doc.passwordHash,
    displayName: doc.displayName,
    role: doc.role,
    ...(doc.memberProfileId ? { memberProfileId: doc.memberProfileId } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/*
 * DuplicateUserError is re-exported from the Phase 7 repository module so
 * the controller's existing `instanceof` handling keeps working untouched.
 */
export { DuplicateUserError } from "../auth/userRepository.js";

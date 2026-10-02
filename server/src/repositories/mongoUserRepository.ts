import { randomUUID } from "node:crypto";

import { collections } from "../db/collections.js";
import { duplicateKeyField, isDuplicateKeyError } from "../db/errors.js";
import type { AuthUser, AuthUserRole } from "../auth/types.js";
import { toAdminPermissions } from "../auth/types.js";
import type { CreateUserInput, UserRepository, VerificationTarget } from "../auth/userRepository.js";
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
      ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
      ...(input.googleId ? { googleId: input.googleId } : {}),
      ...(input.picture ? { picture: input.picture } : {}),
      displayName: input.displayName.trim(),
      role: input.role ?? "user",
      permissions: toAdminPermissions(input.permissions),
      isVerified: input.isVerified ?? true,
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

  async setEmailVerification(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return;
    await collections.users().updateOne(
      { _id: userId },
      {
        $set: { emailVerification: { tokenHash, expiresAt }, updatedAt: new Date().toISOString() },
      },
    );
  }

  async findByVerificationTokenHash(tokenHash: string): Promise<VerificationTarget | null> {
    if (typeof tokenHash !== "string" || tokenHash.length !== 64) return null;
    const doc = await collections.users().findOne({
      "emailVerification.tokenHash": tokenHash,
    });
    if (!doc) return null;
    const rawExpiry = doc.emailVerification?.expiresAt;
    const expiresAt = rawExpiry ? new Date(rawExpiry) : null;
    return { user: toAuthUser(doc), expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null };
  }

  async markEmailVerified(userId: string): Promise<void> {
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return;
    await collections.users().updateOne(
      { _id: userId },
      {
        $set: { isVerified: true, updatedAt: new Date().toISOString() },
        $unset: { emailVerification: "" },
      },
    );
  }

  async clearEmailVerification(userId: string): Promise<void> {
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return;
    await collections.users().updateOne(
      { _id: userId },
      { $unset: { emailVerification: "" }, $set: { updatedAt: new Date().toISOString() } },
    );
  }

  async updateGooglePicture(userId: string, picture: string): Promise<void> {
    // Same id plausibility guard as findById — malformed ids fail safely.
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return;
    if (typeof picture !== "string" || !picture.startsWith("https://") || picture.length > 500) {
      return;
    }
    await collections.users().updateOne(
      { _id: userId },
      { $set: { picture, updatedAt: new Date().toISOString() } },
    );
  }

  async setRole(userId: string, role: AuthUserRole): Promise<void> {
    // Same id plausibility guard as findById — malformed ids fail safely.
    if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) return;
    // The linkage marker travels with the role: only the member-linkage
    // flow grants "member", and it always pairs the role with the flag so
    // the read mapping can tell real members from legacy defaults.
    await collections.users().updateOne(
      { _id: userId },
      {
        $set: {
          role,
          memberLinked: role === "member",
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }
}

/**
 * Task 29 boot migration — pre-Task-29 accounts defaulted to role "member"
 * WITHOUT any linked directory record. Under the new semantics that role
 * means "society member with a linked record", so legacy documents are
 * normalized to "user" once at startup. Accounts genuinely promoted to
 * members AFTER this deployment carry the linkage (members.userId) and are
 * re-granted by the linkage flow, never by this migration.
 *
 * Task 33 fix — the filter must mirror the read-mapping's predicate
 * (role === "member" && memberLinked !== true): a LINKED member account
 * carries role "member" + memberLinked true, and this migration runs on
 * EVERY server start, so an unqualified { role: "member" } match demoted
 * every real member back to "user" on each restart/redeploy.
 *
 * Idempotent by construction: after the first run no document matches.
 */
export async function normalizeLegacyMemberRoles(): Promise<number> {
  const result = await collections.users().updateMany(
    { role: "member", memberLinked: { $ne: true } },
    { $set: { role: "user", updatedAt: new Date().toISOString() } },
  );
  return result.modifiedCount ?? 0;
}

/**
 * Document → AuthUser mapping. This is the ONLY place user records are
 * shaped; passwordHash stays on the record (the auth layer needs it to
 * verify logins) but NEVER reaches a response — controllers emit
 * toPublicUser(user) exclusively.
 *
 * Task 29 — the legacy default role "member" (pre-linkage accounts) is
 * mapped to "user" on read as defense in depth alongside the boot
 * migration: a document written by a stale pre-deploy server instance
 * between migration and cutover still resolves to the correct role.
 */
function toAuthUser(doc: UserDoc): AuthUser {
  return {
    id: doc.id || doc._id,
    username: doc.username,
    email: doc.email,
    ...(doc.passwordHash !== undefined ? { passwordHash: doc.passwordHash } : {}),
    ...(doc.googleId ? { googleId: doc.googleId } : {}),
    ...(doc.picture ? { picture: doc.picture } : {}),
    displayName: doc.displayName,
    // Task 29 — "member" is only real when the linkage flow set its marker;
    // a bare legacy "member" (pre-Task-29 default, never linked) reads as
    // "user". Defense in depth alongside the boot migration.
    role: doc.role === "member" && doc.memberLinked !== true ? "user" : doc.role,
    // Pre-10B documents have no permissions field — normalize to [] so the
    // auth middleware can always treat it as an array. Existing users need
    // no migration (spec: existing users must remain valid).
    permissions: toAdminPermissions(doc.permissions),
    // Pre-verification documents have no isVerified field — those are legacy
    // accounts, treated as VERIFIED so this feature ships without migration.
    isVerified: doc.isVerified ?? true,
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

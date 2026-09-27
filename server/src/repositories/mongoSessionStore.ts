import { randomBytes } from "node:crypto";

import { collections } from "../db/collections.js";
import { env } from "../config/env.js";
import type { SessionRecord, SessionStore } from "../auth/session.js";

/**
 * MongoDB-backed SessionStore (Phase 8).
 *
 * Replaces the in-memory Map behind the UNCHANGED Phase 7 interface:
 *   sessionId → { userId, expiresAt }
 *
 * Preserved behavior:
 *  - 7-day TTL (env.sessionTtlHours)
 *  - lazy expiry: expired-but-not-yet-collected sessions are dead on read
 *    (and deleted then) — the TTL index is the background sweeper
 *  - logout invalidation deletes the server-side session document
 *  - signed cookie token / SESSION_SECRET behavior lives in session.ts and
 *    is untouched
 *
 * Sessions are stored OPAQUELY: no PII beyond the userId reference, no
 * secrets. Session ids never appear in API responses — only inside the
 * HTTP-only cookie.
 */
export class MongoSessionStore implements SessionStore {
  private readonly ttlMs = env.sessionTtlHours * 60 * 60 * 1000;

  async create(userId: string): Promise<SessionRecord> {
    const record: SessionRecord = {
      sessionId: randomBytes(32).toString("base64url"),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };

    await collections.sessions().insertOne({
      _id: record.sessionId,
      userId: record.userId,
      expiresAt: new Date(record.expiresAt),
      createdAt: new Date(),
    });

    return record;
  }

  async find(sessionId: string): Promise<SessionRecord | null> {
    // Session ids are 32-byte base64url strings — anything else is garbage
    // from a forged/garbled cookie; fail safely without a DB round-trip.
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(sessionId)) return null;

    const doc = await collections.sessions().findOne({ _id: sessionId });
    if (!doc) return null;

    if (doc.expiresAt.getTime() <= Date.now()) {
      // Lazy expiration — mirror of the Phase 7 in-memory behavior. The TTL
      // index would collect it eventually; delete now so reads stay truthful.
      await collections.sessions().deleteOne({ _id: sessionId });
      return null;
    }

    return {
      sessionId: doc._id,
      userId: doc.userId,
      expiresAt: doc.expiresAt.getTime(),
    };
  }

  async invalidate(sessionId: string): Promise<void> {
    await collections.sessions().deleteOne({ _id: sessionId });
  }

  /** Drop every session belonging to a user (kept for Phase 7 parity). */
  async invalidateAllForUser(userId: string): Promise<void> {
    await collections.sessions().deleteMany({ userId });
  }
}

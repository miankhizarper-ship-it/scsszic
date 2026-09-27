import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import type { AuthUser } from "./types.js";

/**
 * Session store — Phase 7 in-memory implementation.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  PHASE 8: replace InMemorySessionStore with a MongoDB/collection-backed │
 * │  store implementing the same SessionStore interface (or a managed Redis │
 * │  if the deployment calls for it). Call sites do not change.             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Design:
 *   sessionId (128-bit random) ──► { userId, expiresAt }
 *
 * The cookie carries `sessionId.signature`, where the signature is an
 * HMAC-SHA256 over the id keyed by SESSION_SECRET. A forged or garbage
 * cookie fails signature verification before the store is ever consulted,
 * and a stolen-but-valid id still expires server-side.
 *
 * The browser never receives user data — only the opaque signed session id
 * inside an HTTP-only cookie. No tokens in localStorage/sessionStorage.
 */

export interface SessionRecord {
  sessionId: string;
  userId: string;
  /** Epoch ms. Expired sessions are dead even if still present in memory. */
  expiresAt: number;
}

export interface SessionStore {
  create(userId: string): Promise<SessionRecord>;
  find(sessionId: string): Promise<SessionRecord | null>;
  invalidate(sessionId: string): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly ttlMs = env.sessionTtlHours * 60 * 60 * 1000;

  constructor() {
    // Periodic sweep so expired entries do not accumulate in long-running
    // dev processes. Unref'd so it never keeps the event loop alive.
    const sweep = setInterval(() => this.sweepExpired(), 60 * 60 * 1000);
    sweep.unref?.();
  }

  async create(userId: string): Promise<SessionRecord> {
    const record: SessionRecord = {
      sessionId: randomBytes(32).toString("base64url"),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };
    this.sessions.set(record.sessionId, record);
    return record;
  }

  async find(sessionId: string): Promise<SessionRecord | null> {
    const record = this.sessions.get(sessionId);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId); // lazy expiration
      return null;
    }
    return record;
  }

  async invalidate(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /** Drop every session belonging to a user (used if an account is removed). */
  async invalidateAllForUser(userId: string): Promise<void> {
    for (const [id, record] of this.sessions) {
      if (record.userId === userId) this.sessions.delete(id);
    }
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [id, record] of this.sessions) {
      if (record.expiresAt <= now) this.sessions.delete(id);
    }
  }
}

/* ---------------- Signed cookie token helpers ---------------- */

function sign(value: string): string {
  return createHmac("sha256", env.sessionSecret).update(value).digest("base64url");
}

/** Build the signed token stored in the session cookie. */
export function createSessionToken(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

/**
 * Verify the signed cookie token and return the raw session id.
 * Returns null for anything malformed, forged, or expired-secret — callers
 * treat null as "anonymous".
 */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const sessionId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(sessionId);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sessionId;
}

/** Resolve a signed cookie token to a live session (or null). */
export async function resolveSession(
  store: SessionStore,
  token: string | undefined,
): Promise<SessionRecord | null> {
  const sessionId = verifySessionToken(token);
  if (!sessionId) return null;
  return store.find(sessionId);
}

/** Load the user behind a signed session cookie — null when anything is off. */
export async function getUserFromToken(
  store: SessionStore,
  users: { findById(id: string): Promise<AuthUser | null> },
  token: string | undefined,
): Promise<AuthUser | null> {
  const session = await resolveSession(store, token);
  if (!session) return null;
  return users.findById(session.userId);
}

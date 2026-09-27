import { randomBytes } from "node:crypto";

import type { Request } from "express";

import { collections, type AuditLogDoc } from "../db/collections.js";
import { describeMongoError } from "../db/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Centralized audit logging (Phase 9H) — ONE server-side function every
 * privileged mutation goes through. Controllers call `recordAudit(req, …)`
 * AFTER their mutation has succeeded; the actor is derived from the verified
 * session on the request (`req.user`, set by requireAuth) — never from any
 * client-supplied field — so audit records cannot be forged through the API.
 *
 * Security properties (spec §6):
 *  - actor identity comes from the HTTP-only session, server-side
 *  - metadata is an explicit, small, scalar-only map authored by the
 *    controller (changed fields / from→to / slug) — raw request bodies are
 *    NEVER logged, and a defensive scrub drops any key that even looks
 *    secret-shaped (password/token/session/cookie/secret/authorization)
 *  - values are truncated and stringified, so nothing bulky or structured
 *    sneaks into the trail
 *  - an audit failure must never break a successful mutation: it is logged
 *    server-side and the request still returns its real result
 *
 * Action naming convention (consistent across all CMS surfaces):
 *   <resource>.created · <resource>.updated · <resource>.status.updated ·
 *   <resource>.deleted · user.role.updated
 * Resource families: event, blog, alumnus, member, project, post, album,
 * video, user (matching the existing admin route semantics).
 */

/** Keys that must never appear in audit metadata even by accident. */
const FORBIDDEN_KEY_PATTERN =
  /(password|passphrase|hash|secret|token|session|cookie|authorization|credential)/i;

/** Hard cap per metadata value — audit entries stay concise by construction. */
const MAX_METADATA_VALUE_LENGTH = 200;
const MAX_METADATA_KEYS = 12;

/** Scalar-only metadata: strings/numbers/booleans, scrubbed and truncated. */
export type AuditMetadata = Record<string, string | number | boolean>;

function scrubMetadata(metadata: AuditMetadata | undefined): AuditMetadata | undefined {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata)
    .filter(([key]) => !FORBIDDEN_KEY_PATTERN.test(key))
    .slice(0, MAX_METADATA_KEYS)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.slice(0, MAX_METADATA_VALUE_LENGTH)] as const;
      }
      return [key, value] as const;
    });
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function generateAuditId(): string {
  return `audit-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

interface RecordAuditInput {
  /** Dotted action — e.g. "event.created", "user.role.updated". */
  action: string;
  /** Resource family — e.g. "event", "user". */
  resourceType: string;
  /** Canonical id of the affected record. */
  resourceId: string;
  /** Concise human label (title/name/username) — truncated defensively. */
  resourceLabel?: string;
  /** Small scalar-only metadata map (changed fields, from/to, slug…). */
  metadata?: AuditMetadata;
}

/**
 * Persist one audit record for a successful privileged mutation.
 * `req.user` is the session-derived safe actor (requireAuth/requireAdmin
 * have already run on every route that can reach this).
 */
export async function recordAudit(req: Request, input: RecordAuditInput): Promise<void> {
  const actor = req.user;

  try {
    const metadata = scrubMetadata(input.metadata);
    const doc: AuditLogDoc = {
      _id: generateAuditId(),
      actorId: actor?.id ?? "system",
      actorUsername: actor?.username ?? "system",
      actorRole: actor?.role ?? "admin",
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ...(input.resourceLabel
        ? { resourceLabel: input.resourceLabel.slice(0, 200) }
        : {}),
      outcome: "success",
      ...(metadata ? { metadata } : {}),
      createdAt: new Date().toISOString(),
    };

    await collections.auditLogs().insertOne(doc);
  } catch (error) {
    // A mutation already succeeded — audit persistence problems must not
    // turn it into a client-visible error. Log server-side, respond normal.
    logger.error("[audit] failed to persist audit record:", describeMongoError(error));
  }
}

/** List of changed fields from a validated PATCH body (joined for metadata). */
export function changedFields(input: Record<string, unknown>): string {
  return Object.keys(input).sort().join(", ");
}

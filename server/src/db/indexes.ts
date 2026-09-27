import type { Db } from "mongodb";

import { logger } from "../utils/logger.js";

/**
 * Database indexes — created explicitly at startup (idempotent) and by the
 * seed tooling. Index choices follow ACTUAL query patterns (spec §18):
 *
 *   detail lookups  slug / username  → unique (also a DB-level guard)
 *   visibility      status           → every listing filters archived/draft
 *   listing filters category/field/domain/type → equality filters
 *   ordering        date/publishedAt/updatedAt → every listing sorts
 *   cross-refs      authorUsername/projectSlug/eventSlug/userId → $in joins
 *   sessions        expiresAt TTL    → automatic expiry + userId lookups
 *   users           normalizedEmail/normalizedUsername unique → the ONLY
 *                    uniqueness guarantee is DB-level, per spec §6
 *
 * Deliberately NOT indexed: text-adjacent free-text fields (title/excerpt)
 * — the dataset is small; case-insensitive regex search over an index-less
 * field is correct and avoids premature over-indexing. A $text/Atlas Search
 * index becomes worthwhile only with real content volume.
 */

export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  // ---- users ------------------------------------------------------------
  await db.collection("users").createIndexes([
    { key: { normalizedEmail: 1 }, unique: true, name: "uniq_normalizedEmail" },
    { key: { normalizedUsername: 1 }, unique: true, name: "uniq_normalizedUsername" },
  ]);

  // ---- sessions ---------------------------------------------------------
  await db.collection("sessions").createIndexes([
    // expireAfterSeconds: 0 → MongoDB deletes each doc AT expiresAt.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "ttl_expiresAt" },
    { key: { userId: 1 }, name: "by_userId" },
  ]);

  // ---- audit logs (Phase 9H) --------------------------------------------
  // Every admin listing sorts newest-first; the compound indexes serve the
  // audit page's actor/action/resource filters with the same sort order.
  await db.collection("audit_logs").createIndexes([
    { key: { createdAt: -1 }, name: "by_createdAt_desc" },
    { key: { actorId: 1, createdAt: -1 }, name: "by_actorId_createdAt" },
    { key: { actorUsername: 1, createdAt: -1 }, name: "by_actorUsername_createdAt" },
    { key: { action: 1, createdAt: -1 }, name: "by_action_createdAt" },
    { key: { resourceType: 1, createdAt: -1 }, name: "by_resourceType_createdAt" },
    { key: { resourceId: 1, createdAt: -1 }, name: "by_resourceId_createdAt" },
  ]);

  // ---- events -----------------------------------------------------------
  await db.collection("events").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { category: 1 }, name: "by_category" },
    { key: { date: 1 }, name: "by_date" },
    { key: { featured: 1 }, name: "by_featured" },
  ]);

  // ---- blogs ------------------------------------------------------------
  await db.collection("blogs").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { publishedAt: -1 }, name: "by_publishedAt_desc" },
    { key: { category: 1 }, name: "by_category" },
    { key: { "author.id": 1 }, name: "by_authorId" },
  ]);

  // ---- alumni -----------------------------------------------------------
  await db.collection("alumni").createIndexes([
    { key: { username: 1 }, unique: true, name: "uniq_username" },
    { key: { batchYear: -1 }, name: "by_batchYear_desc" },
    { key: { field: 1 }, name: "by_field" },
  ]);

  // ---- gallery albums ---------------------------------------------------
  await db.collection("gallery_albums").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { category: 1 }, name: "by_category" },
    { key: { date: -1 }, name: "by_date_desc" },
  ]);

  // ---- watch videos -----------------------------------------------------
  await db.collection("videos").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { category: 1 }, name: "by_category" },
    { key: { publishedAt: -1 }, name: "by_publishedAt_desc" },
    { key: { durationMinutes: 1 }, name: "by_durationMinutes" },
  ]);

  // ---- members ----------------------------------------------------------
  await db.collection("members").createIndexes([
    { key: { username: 1 }, unique: true, name: "uniq_username" },
    { key: { status: 1 }, name: "by_status" },
    { key: { domain: 1 }, name: "by_domain" },
    { key: { batchYear: -1 }, name: "by_batchYear_desc" },
  ]);

  // ---- projects ---------------------------------------------------------
  await db.collection("projects").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { category: 1 }, name: "by_category" },
    { key: { updatedAt: -1 }, name: "by_updatedAt_desc" },
    { key: { memberUsernames: 1 }, name: "by_memberUsername" },
  ]);

  // ---- feed posts -------------------------------------------------------
  await db.collection("feed_posts").createIndexes([
    { key: { slug: 1 }, unique: true, name: "uniq_slug" },
    { key: { status: 1 }, name: "by_status" },
    { key: { publishedAt: -1 }, name: "by_publishedAt_desc" },
    { key: { type: 1 }, name: "by_type" },
    { key: { authorUsername: 1 }, name: "by_authorUsername" },
    { key: { projectSlug: 1 }, name: "by_projectSlug" },
  ]);

  logger.info("[db] indexes verified/created");
}

import type { Collection } from "mongodb";

import { getDatabase } from "./client.js";
import type { AdminPermission } from "../auth/types.js";
import type {
  Alumnus,
  Blog,
  CategorySection,
  FeedPost,
  GalleryAlbum,
  Member,
  Project,
  SerializedAlumnus,
  SerializedEvent,
  SocietyEvent,
  WatchVideo,
} from "../content/types.js";

/**
 * MongoDB document types — Phase 8 persistence.
 *
 * Document shapes mirror the canonical domain types (single source of truth:
 * `client/src/types/index.ts`, bridged via `content/types.ts`) so repository
 * mapping is a mechanical `_id` strip, not a reshaping. The canonical `id`
 * (stable seed ids like "evt-01") is ALSO used as `_id`, which keeps seeding
 * deterministic/upsert-safe and cross-references readable.
 *
 * Internal-only fields (never exposed through the API):
 *  - users:  normalizedEmail / normalizedUsername (DB-level uniqueness)
 *  - videos: durationMinutes (numeric filter/index support for duration
 *            buckets; the API still exposes the editorial `duration` string)
 */

/* ---------- Auth (Phase 7 shapes, Phase 8 persistence) ---------- */

export interface UserDoc {
  _id: string;
  id: string;
  username: string;
  /** Case-insensitive uniqueness — indexed unique. */
  normalizedUsername: string;
  /** Already-lowercase (same as `email`), kept explicit for the unique index. */
  normalizedEmail: string;
  email: string;
  /** bcrypt hash — server-only, never returned or logged. */
  passwordHash: string;
  displayName: string;
  role: "member" | "manage" | "admin";
  /** Phase 10B — per-user CMS grants for the "manage" role. Optional in the
   *  document so pre-10B records stay valid without any migration; the
   *  repository mapping normalizes absence to []. */
  permissions?: AdminPermission[];
  memberProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDoc {
  /** The raw session id (the cookie carries `sessionId.signature`). */
  _id: string;
  userId: string;
  /** TTL index — MongoDB removes expired sessions automatically. */
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Category vocabulary document (Phase 10C) — one entry per category name
 * per taxonomy section. The client merges these with its curated defaults;
 * renaming a category rewrites the section's content documents so stored
 * data and the vocabulary never drift apart.
 */
export interface CategoryDoc {
  _id: string;
  section: CategorySection;
  /** Display name — trimmed, bounded to 60 chars by the validation layer. */
  name: string;
  /** Lowercased name — unique per section (DB-level guard). */
  normalizedName: string;
  createdAt: string;
}

/**
 * Audit log document (Phase 9H) — server-generated record of every
 * successful privileged mutation. Written ONLY by the server's centralized
 * audit logger (actor derived from the authenticated session, never from
 * client input); the admin audit API reads a strict safe projection of it.
 *
 * Concise by design: no raw request bodies, no secrets — just who did what
 * to which record, when, with a small scalar-only metadata map.
 */
export interface AuditLogDoc {
  _id: string;
  /** Actor user id — snapshot from the verified session (not client input). */
  actorId: string;
  /** Actor identity snapshot — readable even if the account changes/deletes. */
  actorUsername: string;
  actorRole: "member" | "manage" | "admin";
  /** Dotted action, e.g. "event.created" / "user.role.updated". */
  action: string;
  /** Resource family, e.g. "event" / "blog" / "user" / "gallery". */
  resourceType: string;
  /** Canonical id of the affected record (stable seed id or generated id). */
  resourceId: string;
  /** Concise human label (title/name/username) for the management table. */
  resourceLabel?: string;
  /** "success" today — the schema leaves room for explicit failure records. */
  outcome: "success";
  /** Small scalar-only map (changed fields, from/to, slug…). Never bodies. */
  metadata?: Record<string, string | number | boolean>;
  /** ISO timestamp — string-sorted identically to the other collections. */
  createdAt: string;
}

/* ---------- Content documents ---------- */

export type EventDoc = SerializedEvent & { _id: string };
export type BlogDoc = Blog & { _id: string };
export type AlumnusDoc = SerializedAlumnus & { _id: string };
export type GalleryAlbumDoc = GalleryAlbum & { _id: string };
export type VideoDoc = WatchVideo & { _id: string; durationMinutes: number };
export type MemberDoc = Member & { _id: string };
export type ProjectDoc = Project & { _id: string };
export type FeedPostDoc = FeedPost & { _id: string };

/* ---------- Typed collection accessors ---------- */

/**
 * Lazily resolved, typed collection handles. Each accessor calls
 * getDatabase() at call time so repositories can be constructed at module
 * load (composition root) while the connection happens during startup.
 */
export const collections = {
  users: (): Collection<UserDoc> => getDatabase().collection("users"),
  sessions: (): Collection<SessionDoc> => getDatabase().collection("sessions"),
  auditLogs: (): Collection<AuditLogDoc> => getDatabase().collection("audit_logs"),

  events: (): Collection<EventDoc> => getDatabase().collection("events"),
  blogs: (): Collection<BlogDoc> => getDatabase().collection("blogs"),
  alumni: (): Collection<AlumnusDoc> => getDatabase().collection("alumni"),
  galleryAlbums: (): Collection<GalleryAlbumDoc> =>
    getDatabase().collection("gallery_albums"),
  videos: (): Collection<VideoDoc> => getDatabase().collection("videos"),
  members: (): Collection<MemberDoc> => getDatabase().collection("members"),
  projects: (): Collection<ProjectDoc> => getDatabase().collection("projects"),
  feedPosts: (): Collection<FeedPostDoc> => getDatabase().collection("feed_posts"),
  categories: (): Collection<CategoryDoc> => getDatabase().collection("categories"),
} as const;

/** Canonical SCS collection names (used by indexes + seed tooling). */
export const COLLECTION_NAMES = [
  "users",
  "sessions",
  "audit_logs",
  "events",
  "blogs",
  "alumni",
  "gallery_albums",
  "videos",
  "members",
  "projects",
  "feed_posts",
  "categories",
] as const;

/* Re-export domain shapes for repository/controller convenience. */
export type { Alumnus, Blog, FeedPost, GalleryAlbum, Member, Project, SocietyEvent, WatchVideo };

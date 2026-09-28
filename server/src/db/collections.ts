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
  SerializedSocialLink,
  SocietyEvent,
  TeamCard,
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

/**
 * A real comment on a feed post (community engagement). Seed data carries
 * only demo COUNTS on the post itself — real comments live in their own
 * collection and are counted separately, so seeded content and member
 * activity never overwrite each other.
 */
export interface FeedCommentDoc {
  _id: string;
  /** The feed post this comment belongs to (feed_posts._id). */
  postId: string;
  /** Author account id — snapshot from the verified session. */
  userId: string;
  /** Account username at posting time (profile links resolve client-side). */
  authorUsername: string;
  /** Display-name snapshot — stays readable even if the account changes. */
  authorName: string;
  body: string;
  createdAt: string;
}

export type EventDoc = SerializedEvent & { _id: string };
export type BlogDoc = Blog & { _id: string };
export type AlumnusDoc = SerializedAlumnus & { _id: string };
export type GalleryAlbumDoc = GalleryAlbum & { _id: string };
export type VideoDoc = WatchVideo & { _id: string; durationMinutes: number };
export type MemberDoc = Member & { _id: string };
export type ProjectDoc = Project & { _id: string };
/**
 * TeamCardDoc — admin-managed Leadership/Developers cards (Phase 12). Adds
 * the repository-computed `searchText` haystack (name/position/description)
 * the admin management search matches against. On the WIRE (and in Mongo)
 * social `icon` values are registry keys, so the doc type overrides the
 * domain's component-typed socials with the serialized shape — the repos
 * map to the domain TeamCard exactly like the alumni repos do.
 */
export type TeamDoc = Omit<TeamCard, "socials"> & {
  _id: string;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  socials?: SerializedSocialLink[];
};
/**
 * FeedPostDoc — adds the internal real-likes ledger. `likedBy` holds account
 * ids; it is stripped from every API payload (see strip.ts) and the count is
 * folded into the displayed `likes` (baseline + real). Optional so existing
 * documents stay valid with zero migration.
 */
export type FeedPostDoc = FeedPost & { _id: string; likedBy?: string[] };

/**
 * Contact-form submission — persisted by the public POST /api/contact
 * endpoint. Never exposed through any listing API in this phase; the
 * society reads them directly in the database (an admin inbox is a
 * possible later addition).
 */
export interface ContactMessageDoc {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

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
  team: (): Collection<TeamDoc> => getDatabase().collection("team"),
  projects: (): Collection<ProjectDoc> => getDatabase().collection("projects"),
  feedPosts: (): Collection<FeedPostDoc> => getDatabase().collection("feed_posts"),
  feedComments: (): Collection<FeedCommentDoc> =>
    getDatabase().collection("feed_comments"),
  contactMessages: (): Collection<ContactMessageDoc> =>
    getDatabase().collection("contact_messages"),
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
  "team",
  "projects",
  "feed_posts",
  "feed_comments",
  "contact_messages",
  "categories",
] as const;

/* Re-export domain shapes for repository/controller convenience. */
export type { Alumnus, Blog, FeedPost, GalleryAlbum, Member, Project, SocietyEvent, WatchVideo };

/**
 * Shared domain types for the SCS platform.
 *
 * These describe the shape of data returned by the (future) backend API.
 * Phase 1 mock data in `src/data` conforms to these interfaces, so swapping
 * mock arrays for TanStack Query hooks in Phase 2 requires no UI changes.
 */

import type { LucideIcon } from "lucide-react";

/* ---------- Navigation ---------- */

export interface NavLink {
  label: string;
  to: string;
  /** Optional sub-navigation — renders as a dropdown (desktop) / expandable group (mobile). */
  children?: NavLink[];
}

export interface SocialLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

/* ---------- Stats ---------- */

export interface Stat {
  id: string;
  /** Display value, e.g. "150" (suffix rendered separately, e.g. "+") */
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/* ---------- Events ---------- */

/**
 * Event categories — originally the fixed filter dimension; Phase 10C made
 * the vocabulary admin-managed, so events carry any category string and
 * this union only types the curated DEFAULT filter options.
 */
export type EventCategory =
  | "Workshops"
  | "Seminars"
  | "Hackathons"
  | "Competitions"
  | "Tech Talks"
  | "Community"
  | "Career";

/** Lifecycle status — rendered with an icon + text label, never color alone. */
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface EventSpeaker {
  name: string;
  role: string;
  organization: string;
  bio?: string;
  initials: string;
  /** Local placeholder portrait; replaced by an R2 media URL in a later phase. */
  image?: string;
  imageAlt?: string;
  socials?: ProfileSocialLink[];
}

export interface EventScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventRegistrationInfo {
  enabled: boolean;
  /** Custom CTA text. When disabled, carries the reason label
   *  ("Registration Closed" / "Registration Not Required"). */
  label?: string;
  /** External registration URL (used in a later phase). */
  externalUrl?: string;
  capacity?: number;
  /** Short supporting note shown under the CTA. */
  note?: string;
}

export interface SocietyEvent {
  id: string;
  slug: string;
  title: string;
  /** Short card description. */
  excerpt: string;
  /** Long-form description for the detail page. */
  description: string;
  /** Admin-managed category (Phase 10C) — free string, not the fixed union. */
  category: string;
  status: EventStatus;
  /** Marks the event highlighted on /events (exactly one in mock data). */
  featured?: boolean;
  /** ISO 8601 date string (UTC). */
  date: string;
  /** Display times, e.g. "10:00 AM". */
  startTime: string;
  endTime?: string;
  location: string;
  /** Local cover artwork; replaced by an R2 media URL in a later phase. */
  coverImage: string;
  coverImageAlt: string;
  organizer?: string;
  speakers?: EventSpeaker[];
  schedule?: EventScheduleItem[];
  registration?: EventRegistrationInfo;
  tags?: string[];
  /** Ordered image URLs for the detail-page gallery (R2-ready). */
  gallery?: string[];
  /** ISO 8601 timestamp — ordering/debug aid for the future API. */
  createdAt: string;
}

/* ---------- Blog ---------- */

export type BlogStatus = "draft" | "published" | "archived";

/**
 * Author snapshot embedded in each blog (denormalized document style —
 * exactly how MongoDB would store or `$lookup` it). Definitions live in
 * `data/authors.ts`; `avatar` becomes an R2 media URL in a later phase.
 */
export interface BlogAuthorProfile {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatar?: string;
  avatarAlt?: string;
  bio?: string;
}

/**
 * Structured content block — the CMS-friendly unit of article body copy.
 *
 * Rendering is a pure mapping (components/blogs/BlogContent.tsx). The union
 * maps 1:1 onto future Markdown / rich-text / CMS payloads, so swapping the
 * storage format never touches the page components:
 *
 *   paragraph → <p> (with inline [text](url) links and `inline code`)
 *   heading   → <h2> / <h3>
 *   list      → <ul> / <ol>
 *   code      → CodeBlock (navy theme, horizontally scrollable)
 *   quote     → <blockquote>
 *   callout   → ArticleCallout (Key Takeaway / Tip / Note)
 */
export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "quote"; text: string; attribution?: string }
  | {
      type: "callout";
      variant: "takeaway" | "tip" | "note";
      title: string;
      text: string;
    };

export interface BlogSeo {
  title?: string;
  description?: string;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  /** Short card description. */
  excerpt: string;
  /** Structured article body. */
  content: BlogContentBlock[];
  /** Local cover artwork; replaced by an R2 media URL in a later phase. */
  coverImage: string;
  coverImageAlt: string;
  author: BlogAuthorProfile;
  category: string;
  tags: string[];
  /** ISO 8601 date string (UTC). */
  publishedAt: string;
  updatedAt?: string;
  /** Editorial reading time in minutes — displayed, never recalculated. */
  readingTime: number;
  /** Marks the article highlighted on /blogs (exactly one published). */
  featured?: boolean;
  /** Only "published" articles appear on public pages. */
  status: BlogStatus;
  seo?: BlogSeo;
}

/* ---------- Community feed ---------- */

/** Post kinds — also the feed-page filter dimension. */
export type FeedPostType = "announcement" | "project" | "event" | "article" | "community";

/** Feed lifecycle — archived posts never appear publicly (API-enforced). */
export type FeedPostStatus = "published" | "archived";

/** JSON-safe social link — `icon` is a registry key resolved client-side. */
export interface SerializedSocialLink {
  label: string;
  href: string;
  icon: string;
}

/** Cross-reference summaries resolved server-side onto each feed post. */
export interface FeedRefSummary {
  slug: string;
  title: string;
}

export interface FeedAuthorSummary {
  username: string;
  name: string;
  initials: string;
  avatar?: string;
  avatarAlt?: string;
  batch: string;
}

export interface FeedPostRefs {
  author?: FeedAuthorSummary;
  project?: FeedRefSummary;
  event?: FeedRefSummary;
  blog?: FeedRefSummary;
}

/**
 * A community feed post.
 *
 * Cross-references arrive PRE-RESOLVED on `refs` — the API batches
 * author/project/event/blog lookups per page (no per-card requests), and
 * unknown/archived entities simply omit their ref so cards can never
 * render dead links. `likes`/`comments` counts = seeded baseline + real
 * member activity (likes toggle via POST /api/feed/:id/like, comments via
 * the /comments endpoints).
 */
export interface FeedPost {
  id: string;
  slug: string;
  type: FeedPostType;
  authorUsername?: string;
  authorName: string;
  title: string;
  excerpt: string;
  /** Full post body (paragraphs separated by blank lines). */
  content?: string;
  projectSlug?: string;
  eventSlug?: string;
  blogSlug?: string;
  /** Optional post artwork (R2-ready URL string). */
  image?: string;
  imageAlt?: string;
  /** ISO 8601 timestamp. */
  publishedAt: string;
  tags: string[];
  likes: number;
  comments: number;
  status: FeedPostStatus;
  refs?: FeedPostRefs;
}

/**
 * A real comment on a feed post (server-persisted, Phase community-engagement).
 *
 * Author identity is a server-side snapshot (display name + account
 * username at posting time). `liked` state never rides on the post — the
 * batched viewer-state endpoint supplies the viewer's liked ids per page.
 */
export interface FeedComment {
  id: string;
  postId: string;
  authorUsername: string;
  authorName: string;
  body: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/* ---------- Members ---------- */

/** Directory lifecycle — archived members are excluded at the query layer. */
export type MemberStatus = "active" | "alumni" | "archived";

/**
 * A community member (student directory profile).
 *
 * `social` maps platform keys ("github", "linkedin", …) to href strings —
 * icons resolve client-side through lib/socialIcons, mirroring the seed
 * serialization boundary. `projectSlugs` cross-references the projects
 * showcase so profile pages can list a member's builds.
 */
export interface Member {
  id: string;
  /** URL handle for /profile/:username (unique, lowercase). */
  username: string;
  name: string;
  initials: string;
  avatar?: string;
  avatarAlt?: string;
  /** Society role for active members ("President"), job role for alumni. */
  role: string;
  /** Company/organization — present on alumni-status members. */
  company?: string;
  /** Display batch label, e.g. "Batch 2026". */
  batch: string;
  /** Numeric batch (graduation) year — filter/sort dimension. */
  batchYear: number;
  department?: string;
  /** Primary technical domain — directory filter dimension. */
  domain: string;
  location?: string;
  bio: string;
  skills: string[];
  interests: string[];
  /** Platform key → href ("github" → "https://github.com/…"). */
  social?: Record<string, string>;
  /** Slugs of the projects this member owns or builds on. */
  projectSlugs?: string[];
  /** ISO date the member joined the society. */
  joinedAt?: string;
  status: MemberStatus;
  /** Members highlighted on /members. */
  featured?: boolean;
}

/* ---------- Projects ---------- */

/** Project lifecycle — archived builds stay private (API-enforced). */
export type ProjectStatus = "active" | "completed" | "archived";

/**
 * A student-built project in the showcase.
 *
 * The team roster is username-based (ownerUsername + memberUsernames) and
 * resolves through ONE batched members request — the join MongoDB would
 * $lookup, kept explicit so the UI controls its own batching.
 */
export interface Project {
  id: string;
  slug: string;
  title: string;
  /** One-line pitch shown under the title. */
  tagline: string;
  /** Long-form overview (paragraphs separated by blank lines). */
  description: string;
  /** Cover artwork (R2-ready URL string). */
  coverImage: string;
  coverImageAlt: string;
  /** Also the showcase filter dimension. */
  category: string;
  technologies: string[];
  status: ProjectStatus;
  /** Team roster (lowercase usernames). */
  memberUsernames: string[];
  ownerUsername: string;
  /** Event where the project started, when one exists. */
  eventSlug?: string;
  /** ISO dates. */
  startedAt: string;
  updatedAt: string;
  tags: string[];
  repositoryUrl?: string;
  liveUrl?: string;
  featured?: boolean;
}

/* ---------- Alumni ---------- */

/** Professional field — also the alumni directory filter dimension. */
export type AlumniField =
  | "Software Engineering"
  | "AI/ML"
  | "Data Science"
  | "Cybersecurity"
  | "Web Development"
  | "Research"
  | "Entrepreneurship";

/** Social link on a profile — `icon` is resolved at the data layer. */
export interface ProfileSocialLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface Alumnus {
  id: string;
  /** URL slug for /alumni/:slug. */
  username: string;
  name: string;
  /** Display label, e.g. "Batch 2023". */
  batch: string;
  /** Numeric graduation year — used for filtering/sorting. */
  batchYear: number;
  /** Current role, e.g. "Senior Software Engineer". */
  role: string;
  /** Organization / company. */
  company: string;
  /** Short card description. */
  achievement: string;
  field: AlumniField;
  initials: string;
  /** Local placeholder portrait; replaced by an R2 media URL in a later phase. */
  image?: string;
  imageAlt?: string;
  /* Detail-page fields (optional so card-only listings stay lightweight) */
  bio?: string;
  skills?: string[];
  careerHighlights?: string[];
  socials?: ProfileSocialLink[];
}

/* ---------- Team ---------- */

export interface TeamMember {
  id: string;
  name: string;
  /** Position/role in the society, e.g. "President". */
  position: string;
  description: string;
  initials: string;
  /** Local placeholder portrait; replaced by an R2 media URL in a later phase. */
  image?: string;
  imageAlt?: string;
  socials?: ProfileSocialLink[];
}

/**
 * Admin-managed team cards (Phase 12) — the Leadership and Developers
 * sections on the home page (and the About page's leadership strip) are
 * backed by this ONE collection, split by `group`.
 */
export const TEAM_GROUPS = ["leaders", "developers"] as const;
export type TeamGroup = (typeof TEAM_GROUPS)[number];

/** Team cards have a two-state visibility lifecycle (no drafts). */
export type TeamCardStatus = "published" | "archived";

export interface TeamCard {
  id: string;
  group: TeamGroup;
  name: string;
  /** Role title shown as the card chip, e.g. "President" / "Backend Lead". */
  position: string;
  /** One-liner under the name (optional). */
  description: string;
  initials: string;
  /** Portrait URL (R2 public URL or any https URL) — monogram fallback when absent. */
  image?: string;
  imageAlt?: string;
  /** Resolved social links (icon = Lucide component) — the domain shape. */
  socials?: ProfileSocialLink[];
  /** Manual display order — lower numbers appear first. */
  order: number;
  status: TeamCardStatus;
}

/* ---------- Gallery ---------- */

/** Album lifecycle — archived albums never appear in public listings. */
export type GalleryAlbumStatus = "published" | "archived";

/** A single photo inside an album. `src` becomes an R2 media URL later. */
export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
  /** Optional short caption shown in the lightbox. */
  caption?: string;
}

/**
 * A photo album — the gallery's unit of content (an event, ceremony, or
 * community moment). Photos are embedded document-style, exactly how
 * MongoDB would store them; `src` values are plain URL strings so
 * Cloudflare R2 CDN URLs drop in later without UI changes.
 */
export interface GalleryAlbum {
  id: string;
  /** URL slug for /gallery/:albumSlug. */
  slug: string;
  title: string;
  description: string;
  /** Local cover artwork; replaced by an R2 media URL in a later phase. */
  coverImage: string;
  coverImageAlt: string;
  /** Also the gallery-page filter dimension. */
  category: string;
  /** Links the album to a society event (/events/:eventSlug) when one exists. */
  eventSlug?: string;
  /** ISO 8601 date string (UTC) — when the moment was captured. */
  date: string;
  location?: string;
  /** Denormalized photo count (photoCount === photos.length) for cards/API. */
  photoCount: number;
  photos: GalleryPhoto[];
  /** Marks the album highlighted on /gallery (exactly one published). */
  featured?: boolean;
  /** Only "published" albums appear on public pages. */
  status: GalleryAlbumStatus;
  tags: string[];
}

/* ---------- Watch ---------- */

/** Video lifecycle — archived videos never appear in public listings. */
export type VideoStatus = "published" | "archived";

/**
 * A media-hub video (talk recording, workshop session, showcase…).
 *
 * Source strategy — architecture-ready for every future host:
 *   videoUrl → native <video> (Cloudflare R2 / any MP4 CDN URL)
 *   embedUrl → privacy-mode iframe (YouTube / Vimeo embed)
 *   neither  → poster-only fallback state
 *
 * Demo entries point `videoUrl` at tiny locally-bundled demo clips; real
 * recordings replace the URL strings in a later phase with zero UI changes.
 */
export interface WatchVideo {
  id: string;
  /** URL slug for /watch/:videoSlug. */
  slug: string;
  title: string;
  /** Short card description. */
  excerpt: string;
  /** Long-form description for the detail page. */
  description: string;
  /** Local thumbnail artwork; replaced by an R2 media URL in a later phase. */
  thumbnail: string;
  thumbnailAlt: string;
  /** Direct media URL (R2-ready). */
  videoUrl?: string;
  /** Embeddable player URL (YouTube-nocookie style), used when no videoUrl. */
  embedUrl?: string;
  /** Display duration, e.g. "42:18" or "1:05:40" — editorial, not computed. */
  duration: string;
  /** Also the watch-page filter dimension. */
  category: string;
  tags: string[];
  /** Display speaker name (fictional demo personas for now). */
  speaker?: string;
  /** Links the video to a society event (/events/:eventSlug) when one exists. */
  eventSlug?: string;
  /** ISO 8601 date string (UTC). */
  publishedAt: string;
  /** Marks the video highlighted on /watch (exactly one published). */
  featured?: boolean;
  /** Only "published" videos appear on public pages. */
  status: VideoStatus;
}

/* ---------- Highlights ---------- */

export interface Highlight {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/* ---------- CTA ---------- */

export interface CtaAction {
  label: string;
  to: string;
}

/* ---------- Page metadata (SEO) ---------- */

export interface PageMetadata {
  title?: string;
  description?: string;
}

/* ---------- API list plumbing (Phase 8) ---------- */

/** One facet entry — a distinct value with its (optional) count. */
export interface FacetEntry {
  value: string | number;
  n?: number;
}

/** Facet block returned with every collection listing. */
export interface ListFacets {
  /** Count over the visibility gate only (ignores filters) — hero stats. */
  total: number;
  [key: string]: unknown;
}

/** Collection envelope metadata. */
export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
  facets: ListFacets;
}

/** The standard collection response envelope. */
export interface ListEnvelope<T> {
  data: T[];
  meta: ListMeta;
}

/* ---------- Auth (Phase 7) ---------- */

/** Phase 10B — "manage" is the content-manager role (per-user CMS grants). */
export type AuthUserRole = "member" | "manage" | "admin";

/**
 * Phase 10B + 12 — the CMS sections a "manage" user can be granted,
 * matching the server's ADMIN_PERMISSIONS (auth/types.ts). Permissions belong
 * to individual users; the admin role bypasses permission checks entirely.
 * Server-side requireAdminOrPermission is the security boundary — client
 * filtering of navigation/routes is UX only.
 */
export const ADMIN_PERMISSIONS = [
  "events",
  "blogs",
  "alumni",
  "members",
  "projects",
  "feed",
  "gallery",
  "videos",
  "team",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** Human labels for the permission editor, keyed by section. */
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  events: "Events",
  blogs: "Blogs",
  alumni: "Alumni",
  members: "Members",
  projects: "Projects",
  feed: "Feed",
  gallery: "Gallery",
  videos: "Videos",
  team: "Team cards",
};

/* ---------- Category vocabulary + slug availability (Phase 10C) ---------- */

/**
 * The five CMS sections whose content carries a `category` field and thus a
 * managed vocabulary (matching server CATEGORY_SECTIONS). Alumni/members key
 * their directory by field/domain and the feed by type — those lists stay
 * curated code constants, not part of the category manager.
 */
export const CATEGORY_SECTIONS = ["events", "blogs", "gallery", "videos", "projects"] as const;
export type CategorySection = (typeof CATEGORY_SECTIONS)[number];

/** One managed category entry — stable id for rename/delete operations. */
export interface AdminCategory {
  id: string;
  name: string;
}

/** Envelope payload of the admin category endpoints. */
export interface AdminCategoryList {
  section: CategorySection;
  categories: AdminCategory[];
}

/** Payload of GET /api/admin/slug-check (search-first availability check). */
export interface SlugAvailability {
  available: boolean;
  slug: string;
  suggestion: string;
}

/** Client-safe account representation from /api/auth/* — never contains
 *  password hashes or session internals (the session is an HTTP-only cookie). */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: AuthUserRole;
  /** Phase 10B — CMS sections this account may manage ([] unless role is
   *  "manage" with grants; admins bypass permission checks server-side). */
  permissions: AdminPermission[];
  /** Phase 6 Member profile this account can claim, when linked. */
  memberProfileId?: string;
  createdAt: string;
}

/** Field → message map surfaced by 400/409 auth responses. */
export interface AuthFieldErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  identifier?: string;
}

/* ---------- Admin dashboard (Phase 9B) ---------- */

/**
 * The eight content sections surfaced on the admin dashboard — keyed exactly
 * like the admin routes (ROUTES.admin.*) so cards/links never drift.
 */
export type AdminContentSection =
  | "events"
  | "blogs"
  | "alumni"
  | "gallery"
  | "videos"
  | "members"
  | "projects"
  | "feed";

/** Real count for one section — total plus the model's own status breakdown. */
export interface AdminSectionCount {
  total: number;
  /**
   * Group-by-status counts when the underlying model exposes a
   * publication/lifecycle state (blogs: draft/published/archived; members:
   * active/alumni/archived; events: upcoming/…/cancelled). Empty object when
   * the model has no status dimension at all (alumni). No values invented.
   */
  statuses: Record<string, number>;
}

/** Type label for one recent-content row on the dashboard. */
export type AdminRecentItemType =
  | "event"
  | "blog"
  | "alumnus"
  | "album"
  | "video"
  | "member"
  | "project"
  | "post";

/**
 * One recent content record — a strict allow-list projection (id, title,
 * date, status, slug). Internal fields (searchText, bodies, emails, hashes)
 * are never part of this shape.
 */
export interface AdminRecentItem {
  id: string;
  type: AdminRecentItemType;
  title: string;
  /** ISO date when the model carries a meaningful one; null otherwise. */
  date: string | null;
  /** Lifecycle/publication state; null when the model has none (alumni). */
  status: string | null;
  /** Public handle (slug or username) where one exists. */
  slug: string | null;
}

/** GET /api/admin/dashboard response payload (admin-only, real MongoDB data). */
export interface AdminDashboardData {
  counts: Record<AdminContentSection, AdminSectionCount>;
  recent: AdminRecentItem[];
  /** ISO timestamp when the snapshot was computed (server clock). */
  generatedAt: string;
}

/* ---------- Admin Events CMS (Phase 9C) ---------- */

/** Server-side sort options for the admin events management table. */
export type AdminEventSort =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"
  | "created_desc";

/** Query params accepted by GET /api/admin/events. */
export interface AdminEventListParams {
  page: number;
  pageSize: number;
  search: string;
  category?: string;
  status?: string;
  sort: AdminEventSort;
}

/** One facet entry — a real distinct value with its document count. */
export interface AdminEventFacetEntry {
  value: string;
  n: number;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/category distributions that feed the filter chips.
 */
export interface AdminEventListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    categories: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin events listing. */
export interface AdminEventListEnvelope {
  data: SocietyEvent[];
  meta: AdminEventListMeta;
}

/* ---------- Admin Blogs CMS (Phase 9D) ---------- */

/** Server-side sort options for the admin blogs management table. */
export type AdminBlogSort =
  | "published_desc"
  | "published_asc"
  | "title_asc"
  | "title_desc"
  | "updated_desc";

/** Query params accepted by GET /api/admin/blogs. */
export interface AdminBlogListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  category?: string;
  authorId?: string;
  sort: AdminBlogSort;
}

/** One distinct contributor for the author filter — real author snapshots. */
export interface AdminBlogAuthorFacet {
  id: string;
  name: string;
  n: number;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/category/author distributions that feed the filters.
 */
export interface AdminBlogListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    categories: AdminEventFacetEntry[];
    authors: AdminBlogAuthorFacet[];
  };
}

/** Standard collection envelope for the admin blogs listing. */
export interface AdminBlogListEnvelope {
  data: Blog[];
  meta: AdminBlogListMeta;
}

/* ---------- Admin Alumni CMS (Phase 9E) ---------- */

/**
 * Admin/API write-and-read shape of an alumnus — identical to the domain
 * Alumnus except social icons stay registry KEYS (strings). The public
 * alumni service resolves them to Lucide components at its boundary; the
 * admin CMS works directly with the serialized shape.
 */
export type AlumnusWrite = Omit<Alumnus, "socials"> & {
  socials?: SerializedSocialLink[];
};

/** Server-side sort options for the admin alumni management table. */
export type AdminAlumniSort =
  | "batch_desc"
  | "batch_asc"
  | "name_asc"
  | "name_desc";

/** Query params accepted by GET /api/admin/alumni. */
export interface AdminAlumniListParams {
  page: number;
  pageSize: number;
  search: string;
  field?: string;
  batch?: string;
  sort: AdminAlumniSort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered field/batch distributions that feed the filter chips.
 * (The alumni model has no status lifecycle — hence no status facet.)
 */
export interface AdminAlumniListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    fields: AdminEventFacetEntry[];
    batches: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin alumni listing. */
export interface AdminAlumniListEnvelope {
  data: AlumnusWrite[];
  meta: AdminAlumniListMeta;
}

/* ---------- Admin Team CMS (Phase 12) ---------- */

/**
 * Admin/API write-and-read shape of a team card — identical to the domain
 * TeamCard except social icons stay registry KEYS (strings), exactly like
 * AlumnusWrite. The public team service resolves them to Lucide components
 * at its boundary; the admin CMS works directly with the serialized shape.
 */
export type TeamCardWrite = Omit<TeamCard, "socials"> & {
  socials?: SerializedSocialLink[];
};

/** Server-side sort options for the admin team management table. */
export type AdminTeamSort = "order_asc" | "name_asc" | "name_desc" | "newest";

/** Query params accepted by GET /api/admin/team. */
export interface AdminTeamListParams {
  page: number;
  pageSize: number;
  search: string;
  group?: TeamGroup;
  status?: TeamCardStatus;
  sort: AdminTeamSort;
}

/** Management-table metadata — filtered totals plus unfiltered distributions. */
export interface AdminTeamListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    groups: AdminEventFacetEntry[];
    statuses: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin team listing. */
export interface AdminTeamListEnvelope {
  data: TeamCardWrite[];
  meta: AdminTeamListMeta;
}

/* ---------- Admin Members CMS (Phase 9E) ---------- */

/** Server-side sort options for the admin members management table. */
export type AdminMemberSort =
  | "batch_desc"
  | "batch_asc"
  | "name_asc"
  | "name_desc"
  | "featured_desc";

/** Query params accepted by GET /api/admin/members. */
export interface AdminMemberListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  domain?: string;
  batch?: string;
  featured?: "true" | "false";
  sort: AdminMemberSort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/domain/batch distributions that feed the filters.
 * Admins see archived members here; the public directory still excludes them.
 */
export interface AdminMemberListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    domains: AdminEventFacetEntry[];
    batches: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin members listing. */
export interface AdminMemberListEnvelope {
  data: Member[];
  meta: AdminMemberListMeta;
}

/* ---------- Admin Projects CMS (Phase 9F) ---------- */

/** Server-side sort options for the admin projects management table. */
export type AdminProjectSort =
  | "updated_desc"
  | "started_desc"
  | "started_asc"
  | "title_asc"
  | "title_desc";

/** Query params accepted by GET /api/admin/projects. */
export interface AdminProjectListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  category?: string;
  event?: string;
  technology?: string;
  sort: AdminProjectSort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/category distributions that feed the filter chips.
 * Admins see archived projects here; the public showcase still excludes them.
 */
export interface AdminProjectListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    categories: AdminEventFacetEntry[];
    events: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin projects listing. */
export interface AdminProjectListEnvelope {
  data: Project[];
  meta: AdminProjectListMeta;
}

/* ---------- Admin Feed CMS (Phase 9F) ---------- */

/** Server-side sort options for the admin feed management table. */
export type AdminFeedSort =
  | "published_desc"
  | "published_asc"
  | "title_asc"
  | "title_desc";

/** Query params accepted by GET /api/admin/feed. */
export interface AdminFeedListParams {
  page: number;
  pageSize: number;
  search: string;
  type?: string;
  status?: string;
  authorUsername?: string;
  projectSlug?: string;
  event?: string;
  sort: AdminFeedSort;
}

/** One distinct post author for the author filter — real author snapshots. */
export interface AdminFeedAuthorFacet {
  username: string;
  name: string;
  n: number;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered type/status/author distributions that feed the filters.
 * Admins see archived posts here; the public feed still excludes them.
 */
export interface AdminFeedListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    types: AdminEventFacetEntry[];
    statuses: AdminEventFacetEntry[];
    authors: AdminFeedAuthorFacet[];
    projects: AdminEventFacetEntry[];
  };
}

/**
 * Standard collection envelope for the admin feed listing. Posts are the
 * FLAT document shape (projectSlug/eventSlug/blogSlug on the record) — the
 * public API's refs enrichment stays a read-time concern of the public feed
 * endpoint and is deliberately not duplicated for the management table.
 */
export interface AdminFeedListEnvelope {
  data: FeedPost[];
  meta: AdminFeedListMeta;
}

/* ---------- Admin Gallery CMS (Phase 9G) ---------- */

/**
 * Admin write shape of an embedded photo — `id` is optional: rows added in
 * the CMS form get a collision-safe server-generated id on save, while
 * existing photos keep theirs (reorder-safe).
 */
export type GalleryPhotoWrite = Omit<GalleryPhoto, "id"> & { id?: string };

/** Admin write shape of an album — same as the domain shape, writeable photos. */
export type GalleryAlbumWrite = Omit<GalleryAlbum, "photos"> & {
  photos?: GalleryPhotoWrite[];
};

/** Server-side sort options for the admin gallery management table. */
export type AdminGallerySort =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"
  | "photos_desc";

/** Query params accepted by GET /api/admin/gallery. */
export interface AdminGalleryListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  category?: string;
  year?: string;
  event?: string;
  featured?: "true" | "false";
  sort: AdminGallerySort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/category/event distributions that feed the filter
 * chips. Admins see archived albums here; the public gallery still
 * excludes them (published-only gate untouched).
 */
export interface AdminGalleryListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    categories: AdminEventFacetEntry[];
    events: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin gallery listing. */
export interface AdminGalleryListEnvelope {
  data: GalleryAlbum[];
  meta: AdminGalleryListMeta;
}

/* ---------- Admin Videos CMS (Phase 9G) ---------- */

/** Server-side sort options for the admin videos management table. */
export type AdminVideoSort =
  | "published_desc"
  | "published_asc"
  | "title_asc"
  | "title_desc"
  | "duration_desc";

/** Query params accepted by GET /api/admin/videos. */
export interface AdminVideoListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  category?: string;
  event?: string;
  featured?: "true" | "false";
  /** Public duration-bucket label — exact boundaries, numeric field. */
  duration?: string;
  sort: AdminVideoSort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered status/category/event distributions that feed the filter
 * chips. Admins see archived videos here; the public Watch hub still
 * excludes them (published-only gate untouched).
 */
export interface AdminVideoListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: AdminEventFacetEntry[];
    categories: AdminEventFacetEntry[];
    events: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin videos listing. */
export interface AdminVideoListEnvelope {
  data: WatchVideo[];
  meta: AdminVideoListMeta;
}

/* ---------- Admin Users CMS (Phase 9H) ---------- */

/**
 * Safe admin view of an auth account — exactly the fields the server's
 * SafeAdminUser projection emits. passwordHash/session internals are never
 * part of this shape (the server never maps them), and the client treats
 * the absence as the contract.
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: "member" | "manage" | "admin";
  /** Phase 10B — per-user CMS grants ([] for member/admin accounts). */
  permissions: AdminPermission[];
  memberProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Write payload for PATCH /api/admin/users/:id — the model's editable fields. */
export interface AdminUserUpdate {
  displayName?: string;
  role?: AdminUser["role"];
  /** Phase 10B — CMS sections granted to this account. Only meaningful for
   *  the "manage" role; the server clears grants for member/admin. */
  permissions?: AdminPermission[];
}

/** Server-side sort options for the admin users management table. */
export type AdminUserSort =
  | "created_desc"
  | "created_asc"
  | "username_asc"
  | "username_desc"
  | "name_asc"
  | "name_desc";

/** Query params accepted by GET /api/admin/users. */
export interface AdminUserListParams {
  page: number;
  pageSize: number;
  search: string;
  role?: string;
  sort: AdminUserSort;
}

/**
 * Management-table metadata — filtered totals/pagination plus the
 * UNfiltered role distribution that feeds the filter chips. The user model
 * has no status dimension, so there is deliberately no status facet.
 */
export interface AdminUserListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    roles: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin users listing. */
export interface AdminUserListEnvelope {
  data: AdminUser[];
  meta: AdminUserListMeta;
}

/* ---------- Admin Audit Log (Phase 9H) ---------- */

/**
 * One server-generated audit record — actor snapshot (from the verified
 * session), dotted action, resource reference, and concise scalar metadata.
 * The audit API is read-only: clients can list but never write these.
 */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  outcome: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

/** Query params accepted by GET /api/admin/audit. */
export interface AdminAuditListParams {
  page: number;
  pageSize: number;
  search: string;
  actor?: string;
  action?: string;
  resourceType?: string;
  /** Inclusive UTC day bounds (YYYY-MM-DD). */
  from?: string;
  to?: string;
}

/**
 * Audit-table metadata — filtered totals/pagination plus the UNfiltered
 * actor/action/resource distributions that feed the filter chips.
 */
export interface AdminAuditListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    actors: AdminEventFacetEntry[];
    actions: AdminEventFacetEntry[];
    resourceTypes: AdminEventFacetEntry[];
  };
}

/** Standard collection envelope for the admin audit listing. */
export interface AdminAuditListEnvelope {
  data: AuditLogEntry[];
  meta: AdminAuditListMeta;
}

/**
 * Server-side content type bridge (Phase 8).
 *
 * The canonical domain types live in `client/src/types/index.ts` — the API
 * deliberately re-uses them (type-only import) so database documents,
 * endpoint payloads, and the frontend consume ONE set of shapes with zero
 * duplication. Do not redefine domain structures here.
 *
 * The only intentional differences are serialization boundaries:
 *  - Profile social links arrive from the database with an `icon` KEY
 *    (e.g. "linkedin") instead of a Lucide component reference — components
 *    cannot cross a JSON API. The client service layer resolves the key
 *    back to the icon component, so UI code never changes.
 *  - Watch videos carry an internal `durationSeconds` (seed-computed) that
 *    the API strips before responding.
 */

import type {
  Alumnus,
  Blog,
  EventSpeaker,
  FeedPost,
  GalleryAlbum,
  Member,
  ProfileSocialLink,
  Project,
  SocietyEvent,
  WatchVideo,
} from "../../../client/src/types/index.js";

/** JSON-safe social link — `icon` is a registry key resolved client-side. */
export interface SerializedSocialLink {
  label: string;
  href: string;
  icon: string;
}

/**
 * Taxonomy sections that carry a `category` field (Phase 10C). Each maps
 * onto exactly one MongoDB collection; admin users can add/rename/remove
 * the category vocabulary per section (see categoriesRepository).
 */
export const CATEGORY_SECTIONS = ["events", "blogs", "gallery", "videos", "projects"] as const;
export type CategorySection = (typeof CATEGORY_SECTIONS)[number];

export type SerializedEventSpeaker = Omit<EventSpeaker, "socials"> & {
  socials?: SerializedSocialLink[];
};

/**
 * API/database shape of an event — identical to the client `SocietyEvent`
 * except speakers' social icons are registry keys, not components.
 */
export type SerializedEvent = Omit<SocietyEvent, "speakers"> & {
  speakers?: SerializedEventSpeaker[];
};

/** API/database shape of an alumnus — social icons are registry keys. */
export type SerializedAlumnus = Omit<Alumnus, "socials"> & {
  socials?: SerializedSocialLink[];
};

export type { Alumnus, Blog, FeedPost, GalleryAlbum, Member, Project, SocietyEvent, WatchVideo };
export type { ProfileSocialLink };

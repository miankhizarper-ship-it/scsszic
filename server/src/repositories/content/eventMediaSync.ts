import type { Filter } from "mongodb";

import { collections, type GalleryAlbumDoc, type VideoDoc } from "../../db/collections.js";
import type { SerializedEvent } from "../../content/types.js";
import { logger } from "../../utils/logger.js";
import { adminGalleryRepository } from "./adminGalleryRepository.js";
import { adminVideosRepository } from "./adminVideosRepository.js";
import { generateUniqueHandle } from "./slugAvailabilityRepository.js";

/**
 * Event media sync (Task 33) — when an admin saves an event whose `gallery`
 * carries photos and/or video clips, the platform keeps two DERIVED records
 * in step automatically:
 *
 *   1. ONE gallery album per event (keyed by eventSlug, `autoManaged: true`)
 *      holding the event's photo refs in order — so every event with media
 *      is represented on /gallery as the event's own album, carrying the
 *      event's title, category, date, location, and tags.
 *   2. ONE watch video per video ref in the event gallery — direct files
 *      (.mp4/.webm/…) AND YouTube/Vimeo links — so every event recording is
 *      represented on /watch, linked to the event via eventSlug and titled
 *      "<Event> — Recording". File refs become videoUrl (native player);
 *      YouTube/Vimeo refs become embedUrl (privacy-mode iframe player).
 *
 * Design rules:
 *  - Derived docs are flagged `autoManaged: true`. Albums/videos that an
 *    admin created manually and merely LINKED to an event (eventSlug set
 *    through the gallery/video forms) are NEVER touched by this sync.
 *  - Album photos are merged BY SRC on every save: an admin-captioned or
 *    admin-re-titled photo keeps its id/alt/caption for as long as the same
 *    URL stays on the event; removed URLs drop out; new URLs join the end.
 *  - Video metadata (title/excerpt/description/thumbnail/category/tags/
 *    publishedAt) is refreshed from the event, but `duration`, `status`,
 *    `featured`, and `speaker` stay admin-owned — the sync cannot measure
 *    durations, so new recordings default to the honest "0:00" display
 *    ("Recording" label on the site).
 *  - Removing media from the event removes the derived records; deleting
 *    the event removes them all (removeEventMedia). Re-slugging an event
 *    re-points its derived docs to the new slug first.
 *  - Sync failures never fail the event save that triggered them — they are
 *    logged server-side and surfaced through the audit trail (the same
 *    philosophy as audit logging).
 */

/** Video refs are recognised end-to-end (Task 34): direct video FILES by
 *  extension (storage issues .mp4/.webm, but admins may paste .mov/.m4v
 *  exports produced elsewhere) and YouTube/Vimeo LINKS by host — those play
 *  through the watch player's embed path, never a native <video>. */
const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|ogv|avi|mkv)(\?|#|$)/i;

const VIDEO_EMBED_HOST_RE =
  /^(www\.)?(youtube\.com|m\.youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)$/i;

export function isVideoMediaRef(src: string): boolean {
  const value = src.trim();
  if (VIDEO_FILE_RE.test(value)) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return VIDEO_EMBED_HOST_RE.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Where one video ref lives on the derived watch video document. Direct
 * files go to `videoUrl` (native player); YouTube/Vimeo links go to
 * `embedUrl` (the watch player normalizes every share form at render time
 * and prefers it only when videoUrl is absent). Storing the ORIGINAL ref
 * (not a pre-normalized embed URL) keeps re-save matching stable — a
 * youtube.com/watch link always finds the doc it created before.
 */
function videoSourceFields(ref: string): { videoUrl: string; embedUrl: string } {
  return VIDEO_FILE_RE.test(ref.trim())
    ? { videoUrl: ref, embedUrl: "" }
    : { videoUrl: "", embedUrl: ref };
}

/** What one sync pass did — scalar-only, audit-metadata shaped. */
export interface EventMediaSyncResult {
  album: "created" | "updated" | "removed" | "none" | "failed";
  videosCreated: number;
  videosUpdated: number;
  videosRemoved: number;
}

const IDLE_SYNC: EventMediaSyncResult = {
  album: "none",
  videosCreated: 0,
  videosUpdated: 0,
  videosRemoved: 0,
};

/** Fields the derived records take straight from the event. */
type EventMediaSource = Pick<
  SerializedEvent,
  "slug" | "title" | "excerpt" | "category" | "date" | "location" | "coverImage" | "coverImageAlt" | "tags"
>;

/**
 * Tags for the derived records: the event's own category + tags, deduped
 * case-insensitively, capped at the model's 20-tag limit. This is how the
 * event is "represented with tag or title" on gallery/watch surfaces.
 */
function derivedTags(event: EventMediaSource): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of [event.category, ...(event.tags ?? [])]) {
    const value = (raw ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(value);
    if (tags.length >= 20) break;
  }
  return tags;
}

/* ------------------------------ album sync ------------------------------ */

async function syncEventAlbum(
  event: SerializedEvent,
  images: string[],
): Promise<EventMediaSyncResult["album"]> {
  const existing = await collections
    .galleryAlbums()
    .findOne({ eventSlug: event.slug, autoManaged: true } as Filter<GalleryAlbumDoc>);

  if (images.length === 0) {
    if (!existing) return "none";
    await adminGalleryRepository.remove(existing.id);
    return "removed";
  }

  // Merge by src: admin-polished photo entries (id/alt/caption) survive
  // every re-save of the event for as long as the URL stays on it.
  const previous = existing?.photos ?? [];
  const photos = images.map((src, index) => {
    const kept = previous.find((photo) => photo.src === src);
    if (kept) return kept;
    return { src, alt: `${event.title} — event photo ${index + 1}` };
  });

  const payload = {
    title: event.title,
    description: `Photo highlights from ${event.title} — ${event.excerpt}`,
    coverImage: photos[0].src,
    coverImageAlt: photos[0].alt,
    category: event.category,
    eventSlug: event.slug,
    date: event.date,
    ...(event.location ? { location: event.location } : {}),
    photos,
    status: "published" as const,
    tags: derivedTags(event),
  };

  if (existing) {
    await adminGalleryRepository.update(existing.id, payload);
    return "updated";
  }

  const slug = await generateUniqueHandle("gallery", event.title);
  await adminGalleryRepository.create({ ...payload, slug, autoManaged: true });
  return "created";
}

/* ------------------------------ videos sync ----------------------------- */

async function syncEventVideos(
  event: SerializedEvent,
  videos: string[],
): Promise<{ videosCreated: number; videosUpdated: number; videosRemoved: number }> {
  const existingDocs = await collections
    .videos()
    .find({ eventSlug: event.slug, autoManaged: true } as Filter<VideoDoc>)
    .toArray();

  let videosCreated = 0;
  let videosUpdated = 0;
  const keptIds = new Set<string>();

  for (let index = 0; index < videos.length; index += 1) {
    const ref = videos[index];
    const source = videoSourceFields(ref);
    const title =
      videos.length === 1 ? `${event.title} — Recording` : `${event.title} — Recording ${index + 1}`;
    const description = `Recording from the event "${event.title}" — ${event.excerpt}`;

    // Match on EITHER source field: a doc created from a file ref carries
    // videoUrl, one from a YouTube/Vimeo ref carries embedUrl (original
    // share form — see videoSourceFields).
    const doc = existingDocs.find(
      (candidate) => candidate.videoUrl === ref || candidate.embedUrl === ref,
    );
    if (doc) {
      keptIds.add(doc.id);
      // duration/status/featured/speaker are deliberately NOT in the
      // payload — admin-owned fields the sync must never clobber.
      await adminVideosRepository.update(doc.id, {
        title,
        excerpt: event.excerpt,
        description,
        thumbnail: event.coverImage,
        thumbnailAlt: event.coverImageAlt,
        videoUrl: source.videoUrl,
        embedUrl: source.embedUrl,
        category: event.category,
        tags: derivedTags(event),
        publishedAt: event.date,
      });
      videosUpdated += 1;
    } else {
      const slug = await generateUniqueHandle("videos", title);
      await adminVideosRepository.create({
        slug,
        title,
        excerpt: event.excerpt,
        description,
        thumbnail: event.coverImage,
        thumbnailAlt: event.coverImageAlt,
        videoUrl: source.videoUrl,
        embedUrl: source.embedUrl,
        duration: "0:00",
        category: event.category,
        tags: derivedTags(event),
        eventSlug: event.slug,
        publishedAt: event.date,
        status: "published",
        autoManaged: true,
      });
      videosCreated += 1;
    }
  }

  const stale = existingDocs.filter((doc) => !keptIds.has(doc.id));
  for (const doc of stale) {
    await adminVideosRepository.remove(doc.id);
  }

  return { videosCreated, videosUpdated, videosRemoved: stale.length };
}

/* ------------------------------ entry points ---------------------------- */

/**
 * Sync one event's gallery into the derived gallery album + watch videos.
 * `options.previousSlug` carries the event's slug BEFORE a PATCH — when the
 * slug changed, the previously derived docs are re-pointed to the new slug
 * first so the sync finds (updates) instead of duplicate (creates) them.
 */
export async function syncEventMedia(
  event: SerializedEvent,
  options: { previousSlug?: string } = {},
): Promise<EventMediaSyncResult> {
  try {
    const previousSlug = options.previousSlug;
    if (previousSlug && previousSlug !== event.slug) {
      await collections.galleryAlbums().updateMany(
        { eventSlug: previousSlug, autoManaged: true } as Filter<GalleryAlbumDoc>,
        { $set: { eventSlug: event.slug } },
      );
      await collections.videos().updateMany(
        { eventSlug: previousSlug, autoManaged: true } as Filter<VideoDoc>,
        { $set: { eventSlug: event.slug } },
      );
    }

    // Dedupe while preserving order — PhotoGrid keys and video matching
    // both assume unique refs.
    const seen = new Set<string>();
    const refs = (event.gallery ?? [])
      .map((ref) => ref.trim())
      .filter((ref) => {
        if (!ref || seen.has(ref)) return false;
        seen.add(ref);
        return true;
      });

    const images = refs.filter((ref) => !isVideoMediaRef(ref));
    const videos = refs.filter(isVideoMediaRef);

    const album = await syncEventAlbum(event, images);
    const videoCounts = await syncEventVideos(event, videos);
    return { album, ...videoCounts };
  } catch (error) {
    logger.error("[event-media-sync] failed for event", event.slug, ":", error);
    return { ...IDLE_SYNC, album: "failed" };
  }
}

/**
 * Remove every derived record of a deleted event. Manual albums/videos that
 * merely link the event are never touched. Failures are logged, never thrown
 * — the event deletion itself has already succeeded.
 */
export async function removeEventMedia(
  eventSlug: string,
): Promise<{ albumRemoved: boolean; videosRemoved: number }> {
  try {
    const album = await collections
      .galleryAlbums()
      .deleteOne({ eventSlug, autoManaged: true } as Filter<GalleryAlbumDoc>);
    const videos = await collections
      .videos()
      .deleteMany({ eventSlug, autoManaged: true } as Filter<VideoDoc>);
    return { albumRemoved: album.deletedCount === 1, videosRemoved: videos.deletedCount };
  } catch (error) {
    logger.error("[event-media-sync] cleanup failed for event", eventSlug, ":", error);
    return { albumRemoved: false, videosRemoved: 0 };
  }
}

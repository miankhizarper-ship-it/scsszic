/**
 * Media-reference classification (Task 34).
 *
 * Event gallery entries are plain media references — local asset paths,
 * R2/CDN URLs, or pasted links. Task 16/33 only recognised direct video
 * FILES (.mp4/.webm); anything else (a YouTube share link, a .mov export)
 * fell through as an "image" and rendered a broken <img> tile with the
 * "Preview unavailable" message, and the event-media sync pushed it into
 * the derived gallery album instead of creating a watch recording.
 *
 * One classifier now serves every surface — the admin event form's gallery
 * editor, the public event media grid, the lightbox, and (server-side, its
 * own copy) the media sync — so a video is a video everywhere:
 *
 *   "video-file"   direct playable file (.mp4 .webm .mov .m4v .ogv .avi .mkv)
 *   "video-embed"  YouTube / Vimeo share or player URL (iframe playback)
 *   "image"        everything else (photos, and non-media garbage — which
 *                  the <img>/onError paths still surface honestly)
 */

export type MediaKind = "image" | "video-file" | "video-embed";

/** Direct video files — the storage layer issues .mp4/.webm, but admins may
 *  paste references produced elsewhere (e.g. .mov exports from a camera). */
const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|ogv|avi|mkv)(\?|#|$)/i;

/** Hosts whose URLs play through an iframe embed, never a native <video>. */
const EMBED_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
]);

/** http(s) hostname of a reference, or null when it is not an absolute URL. */
function urlHost(ref: string): string | null {
  try {
    const url = new URL(ref);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Classify one media reference for rendering + sync purposes. */
export function classifyMediaRef(ref: string): MediaKind {
  const value = ref.trim();
  if (!value) return "image";
  if (VIDEO_FILE_RE.test(value)) return "video-file";
  const host = urlHost(value);
  if (host !== null && EMBED_HOSTS.has(host)) return "video-embed";
  return "image";
}

/** True for anything that should play as a video (file OR embed). */
export function isVideoMediaRef(ref: string): boolean {
  return classifyMediaRef(ref) !== "image";
}

/**
 * YouTube thumbnail for an embed link — i.ytimg.com serves these without
 * any API key, giving embed tiles a real poster frame. Null for Vimeo
 * (their thumbnails need an API call — those tiles fall back to a film
 * placeholder) and for anything that is not a YouTube video URL.
 */
export function youtubeThumbUrl(ref: string): string | null {
  const value = ref.trim();
  const host = urlHost(value);
  if (host === null) return null;
  // "m.youtube.com" / "youtube-nocookie.com" also end with "youtube.com".
  const isYoutubeFamily = host.endsWith("youtube.com") || host === "youtu.be";
  if (!isYoutubeFamily) return null;

  let id: string | undefined;
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be") {
      id = segments[0];
    } else if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
      id = segments[1];
    } else if (segments[0] === "watch") {
      id = url.searchParams.get("v") ?? undefined;
    }
  } catch {
    return null;
  }

  if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

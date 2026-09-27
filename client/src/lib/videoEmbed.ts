/**
 * Embed-URL normalization for the Watch player.
 *
 * Admins paste whatever YouTube gives them — `watch?v=…`, `youtu.be/…`,
 * `shorts/…`, playlist links, already-embed URLs — but an iframe can ONLY
 * load `youtube.com/embed/…`-style URLs (watch URLs are refused by
 * YouTube's X-Frame-Options and render a blank/refused frame). This module
 * converts every common share form into a privacy-mode embed URL at
 * render time, so existing database records are fixed with zero migration.
 *
 * Supported inputs → outcomes:
 *   youtube.com/watch?v=ID (&list=…, &t=…)   → youtube-nocookie embed
 *   youtu.be/ID                              → youtube-nocookie embed
 *   youtube.com/shorts/ID · /live/ID         → youtube-nocookie embed
 *   youtube.com/embed/ID (any host variant)  → normalized + rel=0
 *   youtube.com/playlist?list=ID             → videoseries embed
 *   vimeo.com/ID · player.vimeo.com/video/ID → player.vimeo.com embed
 *   anything else (R2/CDN mp4s belong in videoUrl) → returned unchanged
 *   non-URL garbage → null (the player shows its no-source fallback)
 */

const YOUTUBE_NOCOOKIE = "https://www.youtube-nocookie.com/embed";
const VIMEO_PLAYER = "https://player.vimeo.com/video";

/** Extract the `t`/`start` param as whole seconds for the embed fragment. */
function startSeconds(params: URLSearchParams): number | null {
  const raw = params.get("t") ?? params.get("start");
  if (!raw) return null;
  const match = /^(\d+)(s)?$/.exec(raw.trim());
  return match ? Number(match[1]) : null;
}

function youtubeEmbed(id: string, params: URLSearchParams): string {
  const search = new URLSearchParams({ rel: "0" });
  const list = params.get("list");
  if (list) search.set("list", list);
  const start = startSeconds(params);
  if (start) search.set("start", String(start));
  return `${YOUTUBE_NOCOOKIE}/${id}?${search.toString()}`;
}

/** YouTube video id — 11 chars, letters/digits/-/_ (playlist ids differ). */
function looksLikeVideoId(candidate: string): boolean {
  return /^[a-zA-Z0-9_-]{6,20}$/.test(candidate);
}

export function toEmbeddableUrl(rawUrl: string | undefined | null): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const params = url.searchParams;
  const segments = url.pathname.split("/").filter(Boolean);

  // ---- YouTube family -------------------------------------------------
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    // Short link: youtu.be/ID[?t=…]
    if (host === "youtu.be") {
      const id = segments[0];
      if (id && looksLikeVideoId(id)) return youtubeEmbed(id, params);
      return null;
    }

    // Already an embed (or live/shorts under /embed variants) — normalize.
    if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
      const id = segments[1];
      if (id && looksLikeVideoId(id)) return youtubeEmbed(id, params);
      return null;
    }

    // Watch pages: /watch?v=ID (and the single-videoseries edge case).
    if (segments[0] === "watch") {
      const id = params.get("v");
      if (id && looksLikeVideoId(id)) return youtubeEmbed(id, params);
      return null;
    }

    // Playlists without a video: /playlist?list=ID → videoseries embed.
    if (segments[0] === "playlist") {
      const list = params.get("list");
      if (list) {
        const search = new URLSearchParams({ list, rel: "0" });
        return `${YOUTUBE_NOCOOKIE}/videoseries?${search.toString()}`;
      }
      return null;
    }

    return null;
  }

  // ---- Vimeo ----------------------------------------------------------
  if (host === "vimeo.com") {
    const id = segments[0];
    if (id && /^\d{6,12}$/.test(id)) return `${VIMEO_PLAYER}/${id}`;
    return null;
  }
  if (host === "player.vimeo.com") {
    if (segments[0] === "video" && segments[1] && /^\d{6,12}$/.test(segments[1])) {
      return `${VIMEO_PLAYER}/${segments[1]}`;
    }
    return null;
  }

  // ---- Everything else (already a playable embed/CDN page) -------------
  return trimmed;
}

import type {
  Blog,
  FeedPost,
  GalleryAlbum,
  Member,
  Project,
  SerializedEvent,
  WatchVideo,
} from "../../content/types.js";

/**
 * Related-item scoring — faithful server-side ports of the Phase 3–6 client
 * helpers (lib/*Search.ts getRelated*). Detail pages request related items
 * from the API (one small request) instead of pulling whole collections
 * into React (spec §12/§27).
 *
 * Scoring rules are preserved exactly, including tie-breakers:
 *   category/domain +2 · shared tags/skills/tech +1 · domain boosts (same
 *   event +3 for albums/videos) · recency or alphabetical tie-breaks.
 */

/* --------------------------------- Events --------------------------------- */

export function pickRelatedEvents(
  events: SerializedEvent[],
  current: SerializedEvent,
  count = 3,
): SerializedEvent[] {
  const currentTags = new Set(current.tags ?? []);

  const scored = events
    .filter((event) => event.id !== current.id)
    .map((event) => {
      let score = 0;
      if (event.category === current.category) score += 2;
      for (const tag of event.tags ?? []) {
        if (currentTags.has(tag)) score += 1;
      }

      const isLive = event.status === "upcoming" || event.status === "ongoing";
      return { event, score, live: isLive, time: new Date(event.date).getTime() };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.live !== b.live) return a.live ? -1 : 1;
      return a.time - b.time;
    });

  return scored.slice(0, count).map((entry) => entry.event);
}

/* --------------------------------- Blogs ---------------------------------- */

export function pickRelatedBlogs(blogs: Blog[], current: Blog, count = 3): Blog[] {
  const currentTags = new Set(current.tags);

  const scored = blogs
    .filter((blog) => blog.id !== current.id)
    .map((blog) => {
      let score = 0;
      if (blog.category === current.category) score += 2;
      for (const tag of blog.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { blog, score, time: new Date(blog.publishedAt).getTime() };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest first
    });

  return scored.slice(0, count).map((entry) => entry.blog);
}

/* -------------------------------- Gallery --------------------------------- */

export function pickRelatedAlbums(
  albums: GalleryAlbum[],
  current: GalleryAlbum,
  count = 3,
): GalleryAlbum[] {
  const currentTags = new Set(current.tags);

  const scored = albums
    .filter((album) => album.id !== current.id)
    .map((album) => {
      let score = 0;
      if (album.category === current.category) score += 2;
      if (album.eventSlug && album.eventSlug === current.eventSlug) score += 3;
      for (const tag of album.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { album, score, time: new Date(album.date).getTime() };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest captures first
    });

  return scored.slice(0, count).map((entry) => entry.album);
}

/* --------------------------------- Watch ---------------------------------- */

export function pickRelatedVideos(
  videos: WatchVideo[],
  current: WatchVideo,
  count = 3,
): WatchVideo[] {
  const currentTags = new Set(current.tags);

  const scored = videos
    .filter((video) => video.id !== current.id)
    .map((video) => {
      let score = 0;
      if (video.category === current.category) score += 2;
      if (video.eventSlug && video.eventSlug === current.eventSlug) score += 3;
      for (const tag of video.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { video, score, time: new Date(video.publishedAt).getTime() };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.time - a.time; // equal scores → newest first
    });

  return scored.slice(0, count).map((entry) => entry.video);
}

/* -------------------------------- Members --------------------------------- */

export function pickRelatedMembers(members: Member[], current: Member, count = 3): Member[] {
  const currentSkills = new Set(current.skills);
  const currentInterests = new Set(current.interests);

  return members
    .filter((member) => member.id !== current.id)
    .map((member) => {
      let score = 0;
      if (member.domain === current.domain) score += 2;
      if (member.batchYear === current.batchYear) score += 1;
      for (const skill of member.skills) {
        if (currentSkills.has(skill)) score += 1;
      }
      for (const interest of member.interests) {
        if (currentInterests.has(interest)) score += 1;
      }
      return { member, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.member.featured ?? false) - Number(a.member.featured ?? false) ||
        a.member.name.localeCompare(b.member.name),
    )
    .slice(0, count)
    .map((entry) => entry.member);
}

/* -------------------------------- Projects -------------------------------- */

export function pickRelatedProjects(
  projects: Project[],
  current: Project,
  count = 3,
): Project[] {
  const currentTech = new Set(current.technologies);
  const currentTags = new Set(current.tags);

  return projects
    .filter((project) => project.id !== current.id)
    .map((project) => {
      let score = 0;
      if (project.category === current.category) score += 2;
      for (const tech of project.technologies) {
        if (currentTech.has(tech)) score += 1;
      }
      for (const tag of project.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { project, score, updated: new Date(project.updatedAt).getTime() };
    })
    .sort((a, b) => b.score - a.score || b.updated - a.updated)
    .slice(0, count)
    .map((entry) => entry.project);
}

/* --------------------------- Feed (popular tags) --------------------------- */

/** Most frequent tags across the given posts — port of getPopularFeedTags. */
export function popularFeedTags(posts: FeedPost[], count = 8): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([tag]) => tag);
}

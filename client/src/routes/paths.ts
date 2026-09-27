/**
 * Canonical route paths for the public site.
 * Always derive links from this module — never hardcode path strings.
 */
export const ROUTES = {
  home: "/",
  about: "/about",
  events: "/events",
  eventDetail: (slug: string) => `/events/${slug}`,
  alumni: "/alumni",
  alumniDetail: (slug: string) => `/alumni/${slug}`,
  gallery: "/gallery",
  albumDetail: (slug: string) => `/gallery/${slug}`,
  blogs: "/blogs",
  blogDetail: (slug: string) => `/blogs/${slug}`,
  feed: "/feed",
  members: "/members",
  memberDetail: (username: string) => `/members/${username}`,
  projects: "/projects",
  projectDetail: (slug: string) => `/projects/${slug}`,
  watch: "/watch",
  videoDetail: (slug: string) => `/watch/${slug}`,
  profile: (username: string) => `/profile/${username}`,
  account: "/account",
  contact: "/contact",
  login: "/login",
  signup: "/signup",
  terms: "/terms",
  privacy: "/privacy",
  /* ---------- Admin (Phase 9) ---------- */
  admin: {
    home: "/admin",
    events: "/admin/events",
    blogs: "/admin/blogs",
    alumni: "/admin/alumni",
    gallery: "/admin/gallery",
    videos: "/admin/videos",
    members: "/admin/members",
    projects: "/admin/projects",
    feed: "/admin/feed",
    users: "/admin/users",
    audit: "/admin/audit",
  },
} as const;

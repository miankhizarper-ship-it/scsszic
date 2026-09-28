import {
  CalendarDays,
  Clapperboard,
  FileText,
  FolderKanban,
  GraduationCap,
  House,
  Images,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Settings,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/routes/paths";
import type { AdminPermission, AuthUser } from "@/types";

/** Sidebar grouping — ordered labels the nav renders between item clusters. */
export const ADMIN_NAV_GROUPS = [
  { id: "overview", label: null },
  { id: "pages", label: "Pages" },
  { id: "content", label: "Content" },
  { id: "administration", label: "Administration" },
] as const;

export type AdminNavGroupId = (typeof ADMIN_NAV_GROUPS)[number]["id"];

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
  /** Sidebar cluster the item renders under (see ADMIN_NAV_GROUPS). */
  section: AdminNavGroupId;
  /**
   * Phase 10B — the ONE CMS permission this section requires. undefined =
   * every admin-panel role sees it (Dashboard) or it is admin-only (Users/
   * Audit via `adminOnly`). The sidebar reflection is UX only; the API is
   * the boundary.
   */
  permission?: AdminPermission;
  /**
   * Task 14 — any-of permissions for sections assembled from MORE THAN ONE
   * CMS area (the Home Page manager mixes Team + Members content). Visible
   * when the user holds at least one; the page itself hides the tabs the
   * account cannot use, and every API stays server-authorized.
   */
  permissions?: AdminPermission[];
  /** Phase 10B — sections manage users must NEVER see (Users, Audit). */
  adminOnly?: boolean;
}

function requiredPermissions(item: Pick<AdminNavItem, "permission" | "permissions">): AdminPermission[] {
  if (item.permissions && item.permissions.length > 0) return item.permissions;
  return item.permission ? [item.permission] : [];
}

/**
 * Phase 10B + 14 — sidebar entries for the authenticated admin-panel user:
 *   admin  → every item (permissions irrelevant, full access);
 *   manage → Dashboard + the sections where the user holds AT LEAST ONE of
 *            the required permissions; admin-only items (Users/Audit) are
 *            never shown.
 * Direct URL access is re-checked per route by AdminPermissionRoute and
 * independently enforced server-side — this filter is presentation only.
 */
export function adminNavItemsFor(user: Pick<AuthUser, "role" | "permissions"> | null): AdminNavItem[] {
  if (!user) return [];
  if (user.role === "admin") return ADMIN_NAV_ITEMS;
  if (user.role !== "manage") return [];
  const granted = new Set(user.permissions ?? []);
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return false;
    const required = requiredPermissions(item);
    return required.length === 0 || required.some((permission) => granted.has(permission));
  });
}

/**
 * Single source of truth for the admin area (Phase 9A): the sidebar, the
 * mobile drawer, the dashboard's management-area cards, and the section
 * placeholders all derive from this list, so navigation and routes can
 * never drift apart.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Dashboard",
    to: ROUTES.admin.home,
    icon: LayoutDashboard,
    description: "Overview of the society's content and community.",
    section: "overview",
  },
  {
    label: "Home Page",
    to: ROUTES.admin.homePage,
    icon: House,
    description: "Edit the Leadership, Members, and Developers cards on the home page.",
    section: "pages",
    permissions: ["team", "members"],
  },
  {
    label: "About Page",
    to: ROUTES.admin.aboutPage,
    icon: UsersRound,
    description: "Edit the leadership cards shown on the About page.",
    section: "pages",
    permission: "team",
  },
  {
    label: "Events",
    to: ROUTES.admin.events,
    icon: CalendarDays,
    description: "Create and manage society events.",
    section: "content",
    permission: "events",
  },
  {
    label: "Blogs",
    to: ROUTES.admin.blogs,
    icon: FileText,
    description: "Write, publish, and archive articles.",
    section: "content",
    permission: "blogs",
  },
  {
    label: "Alumni",
    to: ROUTES.admin.alumni,
    icon: GraduationCap,
    description: "Curate the alumni directory.",
    section: "content",
    permission: "alumni",
  },
  {
    label: "Gallery",
    to: ROUTES.admin.gallery,
    icon: Images,
    description: "Organize event photo albums.",
    section: "content",
    permission: "gallery",
  },
  {
    label: "Videos",
    to: ROUTES.admin.videos,
    icon: Clapperboard,
    description: "Manage the Watch media hub.",
    section: "content",
    permission: "videos",
  },
  {
    label: "Members",
    to: ROUTES.admin.members,
    icon: Users,
    description: "Maintain the member directory.",
    section: "content",
    permission: "members",
  },
  {
    label: "Projects",
    to: ROUTES.admin.projects,
    icon: FolderKanban,
    description: "Review the student project showcase.",
    section: "content",
    permission: "projects",
  },
  {
    label: "Feed",
    to: ROUTES.admin.feed,
    icon: Newspaper,
    description: "Moderate community feed posts.",
    section: "content",
    permission: "feed",
  },
  {
    label: "Users",
    to: ROUTES.admin.users,
    icon: UserCog,
    description: "Manage accounts and roles.",
    section: "administration",
    adminOnly: true,
  },
  {
    label: "Audit",
    to: ROUTES.admin.audit,
    icon: ScrollText,
    description: "Review the admin action log.",
    section: "administration",
    adminOnly: true,
  },
  {
    label: "Settings",
    to: ROUTES.admin.settings,
    icon: Settings,
    description: "Site-wide configuration — footer social links.",
    section: "administration",
    adminOnly: true,
  },
];

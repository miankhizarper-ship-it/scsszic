import {
  CalendarDays,
  Clapperboard,
  FileText,
  FolderKanban,
  GraduationCap,
  Images,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/routes/paths";
import type { AdminPermission, AuthUser } from "@/types";

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
  /** "9A" = shipped with the foundation; "9B" = placeholder until implemented. */
  phase: "9A" | "9B";
  /**
   * Phase 10B — the CMS permission this section requires. undefined = every
   * admin-panel role sees it (Dashboard) or it is admin-only (Users/Audit via
   * `adminOnly`). The sidebar reflection is UX only; the API is the boundary.
   */
  permission?: AdminPermission;
  /** Phase 10B — sections manage users must NEVER see (Users, Audit). */
  adminOnly?: boolean;
}

/**
 * Phase 10B — sidebar entries for the authenticated admin-panel user:
 *   admin  → every item (permissions irrelevant, full access);
 *   manage → Dashboard + only the CMS sections in the USER'S OWN permissions;
 *            admin-only items (Users/Audit) are never shown.
 * Direct URL access is re-checked per route by AdminPermissionRoute and
 * independently enforced server-side — this filter is presentation only.
 */
export function adminNavItemsFor(user: Pick<AuthUser, "role" | "permissions"> | null): AdminNavItem[] {
  if (!user) return [];
  if (user.role === "admin") return ADMIN_NAV_ITEMS;
  if (user.role !== "manage") return [];
  const granted = new Set(user.permissions ?? []);
  return ADMIN_NAV_ITEMS.filter(
    (item) => !item.adminOnly && (item.permission === undefined || granted.has(item.permission)),
  );
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
    phase: "9A",
  },
  {
    label: "Events",
    to: ROUTES.admin.events,
    icon: CalendarDays,
    description: "Create and manage society events.",
    phase: "9B",
    permission: "events",
  },
  {
    label: "Blogs",
    to: ROUTES.admin.blogs,
    icon: FileText,
    description: "Write, publish, and archive articles.",
    phase: "9B",
    permission: "blogs",
  },
  {
    label: "Alumni",
    to: ROUTES.admin.alumni,
    icon: GraduationCap,
    description: "Curate the alumni directory.",
    phase: "9B",
    permission: "alumni",
  },
  {
    label: "Gallery",
    to: ROUTES.admin.gallery,
    icon: Images,
    description: "Organize event photo albums.",
    phase: "9B",
    permission: "gallery",
  },
  {
    label: "Videos",
    to: ROUTES.admin.videos,
    icon: Clapperboard,
    description: "Manage the Watch media hub.",
    phase: "9B",
    permission: "videos",
  },
  {
    label: "Members",
    to: ROUTES.admin.members,
    icon: Users,
    description: "Maintain the member directory.",
    phase: "9B",
    permission: "members",
  },
  {
    label: "Projects",
    to: ROUTES.admin.projects,
    icon: FolderKanban,
    description: "Review the student project showcase.",
    phase: "9B",
    permission: "projects",
  },
  {
    label: "Feed",
    to: ROUTES.admin.feed,
    icon: Newspaper,
    description: "Moderate community feed posts.",
    phase: "9B",
    permission: "feed",
  },
  {
    label: "Users",
    to: ROUTES.admin.users,
    icon: UserCog,
    description: "Manage accounts and roles.",
    phase: "9B",
    adminOnly: true,
  },
  {
    label: "Audit",
    to: ROUTES.admin.audit,
    icon: ScrollText,
    description: "Review the admin action log.",
    phase: "9B",
    adminOnly: true,
  },
];

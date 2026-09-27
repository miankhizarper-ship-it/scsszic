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

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
  /** "9A" = shipped with the foundation; "9B" = placeholder until implemented. */
  phase: "9A" | "9B";
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
  },
  {
    label: "Blogs",
    to: ROUTES.admin.blogs,
    icon: FileText,
    description: "Write, publish, and archive articles.",
    phase: "9B",
  },
  {
    label: "Alumni",
    to: ROUTES.admin.alumni,
    icon: GraduationCap,
    description: "Curate the alumni directory.",
    phase: "9B",
  },
  {
    label: "Gallery",
    to: ROUTES.admin.gallery,
    icon: Images,
    description: "Organize event photo albums.",
    phase: "9B",
  },
  {
    label: "Videos",
    to: ROUTES.admin.videos,
    icon: Clapperboard,
    description: "Manage the Watch media hub.",
    phase: "9B",
  },
  {
    label: "Members",
    to: ROUTES.admin.members,
    icon: Users,
    description: "Maintain the member directory.",
    phase: "9B",
  },
  {
    label: "Projects",
    to: ROUTES.admin.projects,
    icon: FolderKanban,
    description: "Review the student project showcase.",
    phase: "9B",
  },
  {
    label: "Feed",
    to: ROUTES.admin.feed,
    icon: Newspaper,
    description: "Moderate community feed posts.",
    phase: "9B",
  },
  {
    label: "Users",
    to: ROUTES.admin.users,
    icon: UserCog,
    description: "Manage accounts and roles.",
    phase: "9B",
  },
  {
    label: "Audit",
    to: ROUTES.admin.audit,
    icon: ScrollText,
    description: "Review the admin action log.",
    phase: "9B",
  },
];

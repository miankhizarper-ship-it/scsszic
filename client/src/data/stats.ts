import { CalendarCheck, FolderKanban, Users, Wrench } from "lucide-react";

import type { Stat } from "@/types";

/**
 * MOCK DATA — Society statistics.
 * Phase 2: replaced by GET /api/stats (admin-editable values).
 */
export const STATS: Stat[] = [
  {
    id: "members",
    value: 150,
    suffix: "+",
    label: "Members",
    description: "Active student members",
    icon: Users,
  },
  {
    id: "events",
    value: 25,
    suffix: "+",
    label: "Events",
    description: "Events hosted to date",
    icon: CalendarCheck,
  },
  {
    id: "workshops",
    value: 10,
    suffix: "+",
    label: "Workshops",
    description: "Hands-on skill sessions",
    icon: Wrench,
  },
  {
    id: "projects",
    value: 20,
    suffix: "+",
    label: "Projects",
    description: "Student-built products",
    icon: FolderKanban,
  },
];

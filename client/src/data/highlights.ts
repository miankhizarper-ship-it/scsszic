import { Code2, Lightbulb, Users, Wrench } from "lucide-react";

import type { Highlight } from "@/types";

/**
 * MOCK DATA — Society highlights (Learn / Build / Collaborate / Innovate).
 * Static editorial content; moved to the CMS in a later phase.
 */
export const HIGHLIGHTS: Highlight[] = [
  {
    id: "learn",
    title: "Learn",
    description:
      "Workshops, study circles, and peer-led sessions that turn classroom theory into practical, job-ready skill.",
    icon: Wrench,
  },
  {
    id: "build",
    title: "Build",
    description:
      "Hackathons and project teams where ideas become working software — shipped, demoed, and defended.",
    icon: Code2,
  },
  {
    id: "collaborate",
    title: "Collaborate",
    description:
      "A community that reviews each other's code, shares opportunities, and grows together semester after semester.",
    icon: Users,
  },
  {
    id: "innovate",
    title: "Innovate",
    description:
      "Research discussions, emerging tech explorations, and bold student ideas aimed at real-world impact.",
    icon: Lightbulb,
  },
];

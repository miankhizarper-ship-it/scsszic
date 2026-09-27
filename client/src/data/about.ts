import {
  BrainCircuit,
  Code2,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  Handshake,
  Lightbulb,
  Medal,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import type { Highlight } from "@/types";

/**
 * MOCK DATA — About page editorial content.
 *
 * Static, clearly-marked copy that the society can edit in one place.
 * A later phase may move this into a CMS; the UI reads only from here.
 */

/* ---------- What we do (reuses the Home "highlights" model) ---------- */
export const WHAT_WE_DO: Highlight[] = [
  {
    id: "learn",
    title: "Learn",
    description:
      "Hands-on workshops, study circles, and peer-led sessions that turn classroom theory into practical, job-ready engineering skill.",
    icon: FlaskConical,
  },
  {
    id: "build",
    title: "Build",
    description:
      "Hackathons, bootcamps, and project teams where ideas become working software — shipped, demoed, and defended in front of real audiences.",
    icon: Code2,
  },
  {
    id: "collaborate",
    title: "Collaborate",
    description:
      "A community that reviews each other's code, shares opportunities freely, and grows together semester after semester.",
    icon: Handshake,
  },
  {
    id: "innovate",
    title: "Innovate",
    description:
      "Research discussions, emerging-technology explorations, and bold student ideas aimed squarely at real-world impact.",
    icon: Lightbulb,
  },
];

/* ---------- Community areas ---------- */

export interface CommunityArea {
  id: string;
  title: string;
  description: string;
  icon: Highlight["icon"];
  /** Featured areas render with a wider card on desktop. */
  featured?: boolean;
}

export const COMMUNITY_AREAS: CommunityArea[] = [
  {
    id: "software-dev",
    title: "Software Development",
    description:
      "Core engineering tracks — from clean code fundamentals to system design study groups.",
    icon: Code2,
    featured: true,
  },
  {
    id: "ai",
    title: "Artificial Intelligence",
    description:
      "Machine learning study circles, paper readings, and applied AI experiments.",
    icon: BrainCircuit,
  },
  {
    id: "data-science",
    title: "Data Science",
    description:
      "Analysis, visualization, and the craft of turning raw data into decisions.",
    icon: Database,
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    description:
      "Security fundamentals, capture-the-flag competitions, and awareness programs.",
    icon: ShieldCheck,
  },
  {
    id: "web",
    title: "Web Technologies",
    description:
      "Modern frontend and backend development for real society and campus projects.",
    icon: Globe,
  },
  {
    id: "mobile",
    title: "Mobile Development",
    description:
      "Building for Android and beyond — from first app to published product.",
    icon: Smartphone,
  },
  {
    id: "research",
    title: "Research & Innovation",
    description:
      "Final-year project mentoring, paper writing help, and emerging-tech exploration.",
    icon: Cpu,
  },
];

/* ---------- Society values ---------- */

export interface SocietyValue {
  id: string;
  title: string;
  description: string;
  icon: Highlight["icon"];
}

export const SOCIETY_VALUES: SocietyValue[] = [
  {
    id: "learning",
    title: "Learning",
    description:
      "We stay students at heart — curious, teachable, and always one question away from growth.",
    icon: Sparkles,
  },
  {
    id: "collaboration",
    title: "Collaboration",
    description:
      "Knowledge shared is knowledge multiplied. We build together and credit generously.",
    icon: Users,
  },
  {
    id: "innovation",
    title: "Innovation",
    description:
      "We experiment boldly, fail cheaply, and iterate until ideas earn their place in the world.",
    icon: Lightbulb,
  },
  {
    id: "leadership",
    title: "Leadership",
    description:
      "Every member is given a chance to lead — a session, a team, a flagship event.",
    icon: Rocket,
  },
  {
    id: "community",
    title: "Community",
    description:
      "Senior or freshman, everyone belongs. The network outlives any single semester.",
    icon: Handshake,
  },
  {
    id: "excellence",
    title: "Excellence",
    description:
      "Good enough never is. We hold our work — and each other — to a higher standard.",
    icon: Medal,
  },
];

/* ---------- Mission & vision ---------- */

export const MISSION = {
  statement:
    "To empower students of Shaikh Zayed Islamic Centre with the technical skills, professional network, and real-world experience they need to thrive in computing careers and contribute meaningfully to the digital future of Pakistan.",
  pillars: [
    {
      title: "Practical skill-building",
      description:
        "Workshops and bootcamps focused on what the industry actually uses — not just what textbooks cover.",
    },
    {
      title: "Peer-led community",
      description:
        "Students teaching students: every session is run by someone who learned it the hard way last semester.",
    },
    {
      title: "Real-world exposure",
      description:
        "Competitions, client-style projects, and alumni connections that bridge campus and career.",
    },
  ],
};

export const VISION = {
  statement:
    "A society where every computer science student graduates with more than a degree — with a portfolio, a community, and the confidence to build things that matter.",
  points: [
    "To be the most active and respected student technology community at the University of Peshawar.",
    "To see SCS alumni leading teams, companies, and research labs across the country and beyond.",
    "To make participation in technology open to every student, regardless of starting point or background.",
  ],
};

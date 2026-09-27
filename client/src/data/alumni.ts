import { Github, Linkedin } from "lucide-react";

import avatarKamran from "@/assets/people/alum-kamran-yousafzai.jpg";
import avatarSana from "@/assets/people/alum-sana-durrani.jpg";
import avatarHamza from "@/assets/people/alum-hamza-afridi.jpg";
import avatarAyesha from "@/assets/people/alum-ayesha-khan.jpg";
import avatarBilal from "@/assets/people/alum-bilal-mehsud.jpg";
import avatarMahnoor from "@/assets/people/alum-mahnoor-ali.jpg";
import avatarUsman from "@/assets/people/alum-usman-ghani.jpg";
import avatarZainab from "@/assets/people/alum-zainab-bibi.jpg";
import type { AlumniField, Alumnus } from "@/types";

/**
 * MOCK DATA — Alumni directory.
 *
 * All profiles below are FICTIONAL demo data for design purposes only —
 * they deliberately do not describe real people. Phase 3+: replaced by
 * GET /api/alumni (MongoDB-backed, R2 profile photos, real submissions).
 *
 * Social hrefs are "#" placeholders until alumni connect real profiles.
 */

/** Batch years offered as directory filters (kept in sync with the data). */
export const ALUMNI_BATCHES = [2022, 2023, 2024, 2025, 2026] as const;

/** Professional fields offered as directory filters. */
export const ALUMNI_FIELDS: AlumniField[] = [
  "Software Engineering",
  "AI/ML",
  "Data Science",
  "Cybersecurity",
  "Web Development",
  "Research",
  "Entrepreneurship",
];

const demoSocials = [
  { label: "LinkedIn (demo placeholder)", href: "#", icon: Linkedin },
  { label: "GitHub (demo placeholder)", href: "#", icon: Github },
];

export const ALUMNI: Alumnus[] = [
  {
    id: "al-001",
    username: "kamran-yousafzai",
    name: "Kamran Yousafzai",
    batch: "Batch 2022",
    batchYear: 2022,
    role: "Senior Software Engineer",
    company: "Systems Limited",
    achievement:
      "Built payment infrastructure that now serves millions of users nationwide.",
    field: "Software Engineering",
    initials: "KY",
    image: avatarKamran,
    imageAlt:
      "Placeholder portrait tile for demo profile Kamran Yousafzai — abstract navy and gold monogram",
    bio: "Kamran joined SCS in his first semester and never really left — he ran the society's first programming contest series before graduating. Today he designs backend systems for national-scale fintech products, with a focus on reliability and clean architecture. He returns to SCS events as a guest judge and mentor whenever his schedule allows.",
    skills: ["TypeScript", "Node.js", "PostgreSQL", "System Design", "AWS", "Docker"],
    careerHighlights: [
      "Promoted to senior engineer within four years of graduating",
      "Led the migration of a legacy monolith to modular services",
      "Mentored 20+ SCS students through internship season",
    ],
    socials: demoSocials,
  },
  {
    id: "al-002",
    username: "sana-durrani",
    name: "Sana Durrani",
    batch: "Batch 2022",
    batchYear: 2022,
    role: "AI Researcher",
    company: "LUMS",
    achievement:
      "Published six papers on NLP for low-resource languages, including Pashto.",
    field: "AI/ML",
    initials: "SD",
    image: avatarSana,
    imageAlt:
      "Placeholder portrait tile for demo profile Sana Durrani — abstract navy and gold monogram",
    bio: "Sana's curiosity about language and computation started in an SCS study circle on machine learning. She now researches natural language processing for under-served languages, working at the intersection of academia and applied AI. Her long-term goal is building open datasets that make Pakistani languages first-class citizens in modern NLP.",
    skills: ["Python", "PyTorch", "NLP", "Transformers", "Research Writing"],
    careerHighlights: [
      "Six peer-reviewed publications in NLP and computational linguistics",
      "Speaker at two national AI research symposiums",
      "Reviewer for a regional machine learning conference",
    ],
    socials: demoSocials,
  },
  {
    id: "al-003",
    username: "hamza-afridi",
    name: "Hamza Afridi",
    batch: "Batch 2023",
    batchYear: 2023,
    role: "Full-Stack Developer",
    company: "UK SaaS Startup",
    achievement:
      "Shipped SaaS products used by teams across more than a dozen countries.",
    field: "Web Development",
    initials: "HA",
    image: avatarHamza,
    imageAlt:
      "Placeholder portrait tile for demo profile Hamza Afridi — abstract navy and gold monogram",
    bio: "Hamza built his first production app for a university society — an event registration tool that replaced paper forms. That project became the portfolio piece that landed him a remote role with a UK-based SaaS startup. He works across the stack, owns features end to end, and credits hackathon weekends for his shipping discipline.",
    skills: ["React", "TypeScript", "Node.js", "Next.js", "Prisma", "CI/CD"],
    careerHighlights: [
      "Shipped three multi-tenant SaaS products as a core engineer",
      "Won two national hackathons as a student",
      "Maintains a popular open-source UI starter kit",
    ],
    socials: demoSocials,
  },
  {
    id: "al-004",
    username: "ayesha-khan",
    name: "Ayesha Khan",
    batch: "Batch 2023",
    batchYear: 2023,
    role: "Data Scientist",
    company: "Peshawar Analytics Lab",
    achievement:
      "Turns messy operational data into forecasting tools used by regional businesses.",
    field: "Data Science",
    initials: "AK",
    image: avatarAyesha,
    imageAlt:
      "Placeholder portrait tile for demo profile Ayesha Khan — abstract navy and gold monogram",
    bio: "Ayesha discovered data science through an SCS workshop on Python for analysis and immediately started applying it to everything she could find. She now builds demand-forecasting and reporting pipelines for clients across Khyber Pakhtunkhwa, and volunteers as a data mentor for final-year projects.",
    skills: ["Python", "pandas", "SQL", "scikit-learn", "Data Visualization"],
    careerHighlights: [
      "Built forecasting models adopted by five regional businesses",
      "Led a data-literacy bootcamp series for 100+ students",
      "First-runner-up in a national data hackathon",
    ],
    socials: demoSocials,
  },
  {
    id: "al-005",
    username: "bilal-mehsud",
    name: "Bilal Mehsud",
    batch: "Batch 2024",
    batchYear: 2024,
    role: "Cybersecurity Analyst",
    company: "SecureNet Systems",
    achievement:
      "Runs penetration-testing engagements and campus security-awareness programs.",
    field: "Cybersecurity",
    initials: "BM",
    image: avatarBilal,
    imageAlt:
      "Placeholder portrait tile for demo profile Bilal Mehsud — abstract navy and gold monogram",
    bio: "Bilal organized SCS's first capture-the-flag competition and used it to teach an entire cohort the basics of offensive security. Professionally he works in penetration testing and incident response, and he still runs the CTF tradition at SCS every semester — now as an alumni partner.",
    skills: ["Linux", "Networking", "Burp Suite", "Python", "Threat Analysis"],
    careerHighlights: [
      "Completed 30+ sanctioned penetration-testing engagements",
      "Founded the society's annual CTF competition",
      "Certified in offensive security (OSCP-track)",
    ],
    socials: demoSocials,
  },
  {
    id: "al-006",
    username: "mahnoor-ali",
    name: "Mahnoor Ali",
    batch: "Batch 2024",
    batchYear: 2024,
    role: "Research Assistant",
    company: "Center for AI Research",
    achievement:
      "Works on computer-vision systems for agricultural monitoring in KP.",
    field: "Research",
    initials: "MA",
    image: avatarMahnoor,
    imageAlt:
      "Placeholder portrait tile for demo profile Mahnoor Ali — abstract navy and gold monogram",
    bio: "Mahnoor's final-year project — a crop-disease detection prototype — began as a hackathon idea and grew into a funded research role. She now works on computer-vision pipelines for precision agriculture, splitting her time between fieldwork, datasets, and paper deadlines.",
    skills: ["Python", "OpenCV", "TensorFlow", "Research Methods", "LaTeX"],
    careerHighlights: [
      "Co-authored two papers on vision-based crop diagnostics",
      "Final-year project awarded best in department",
      "Builds and maintains an open agricultural image dataset",
    ],
    socials: demoSocials,
  },
  {
    id: "al-007",
    username: "usman-ghani",
    name: "Usman Ghani",
    batch: "Batch 2025",
    batchYear: 2025,
    role: "Frontend Engineer",
    company: "WebNova Studio",
    achievement:
      "Crafts design-driven web experiences for clients across three continents.",
    field: "Web Development",
    initials: "UG",
    image: avatarUsman,
    imageAlt:
      "Placeholder portrait tile for demo profile Usman Ghani — abstract navy and gold monogram",
    bio: "Usman was the society's go-to person for anything visual — event posters first, then web interfaces. He joined a digital studio right after graduating and now builds marketing sites and product UIs where engineering meets design. He frequently reviews portfolios for SCS juniors preparing for job applications.",
    skills: ["React", "TypeScript", "Tailwind CSS", "Framer Motion", "Figma"],
    careerHighlights: [
      "Delivered 25+ production websites for international clients",
      "Ran the society's front-end development bootcamp",
      "Portfolio featured in two design-community showcases",
    ],
    socials: demoSocials,
  },
  {
    id: "al-008",
    username: "zainab-bibi",
    name: "Zainab Bibi",
    batch: "Batch 2026",
    batchYear: 2026,
    role: "Founder & CEO",
    company: "EduPath (student startup)",
    achievement:
      "Building a mentorship platform that connects university students with graduates.",
    field: "Entrepreneurship",
    initials: "ZB",
    image: avatarZainab,
    imageAlt:
      "Placeholder portrait tile for demo profile Zainab Bibi — abstract navy and gold monogram",
    bio: "Zainab pitched the first version of EduPath at an SCS startup night and won the audience vote. Fresh out of her final year, she is building the platform full-time — a mentorship marketplace that pairs current students with working graduates. She says the society's project teams were her first experience of building something real with a team.",
    skills: ["Product Strategy", "Pitching", "React Native", "Firebase", "Community Building"],
    careerHighlights: [
      "Won the SCS startup-night pitch competition",
      "Selected for a provincial startup incubator cohort",
      "Onboarded 40+ graduate mentors to the platform",
    ],
    socials: demoSocials,
  },
];

/** Find one alumnus by slug (the `username` field). */
export function findAlumnusBySlug(slug: string | undefined): Alumnus | undefined {
  return ALUMNI.find((person) => person.username === slug);
}

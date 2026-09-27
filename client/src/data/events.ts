import { Github, Linkedin } from "lucide-react";

import coverAiMl from "@/assets/events/event-ai-ml-workshop.jpg";
import coverBootcamp from "@/assets/events/event-web-bootcamp.jpg";
import coverHackathon from "@/assets/events/event-hackathon.jpg";
import coverGenAi from "@/assets/events/event-genai-talk.jpg";
import coverGit from "@/assets/events/event-git-opensource.jpg";
import coverMeetup from "@/assets/events/event-developer-meetup.jpg";
import coverCybersecurity from "@/assets/events/event-cybersecurity.jpg";
import coverCareerTalk from "@/assets/events/event-data-career-talk.jpg";
import coverContest from "@/assets/events/event-programming-contest.jpg";
import galleryContest1 from "@/assets/events/event-gallery-contest-1.jpg";
import galleryContest2 from "@/assets/events/event-gallery-contest-2.jpg";
import galleryContest3 from "@/assets/events/event-gallery-contest-3.jpg";
import galleryContest4 from "@/assets/events/event-gallery-contest-4.jpg";
import galleryCareer1 from "@/assets/events/event-gallery-career-1.jpg";
import galleryCareer2 from "@/assets/events/event-gallery-career-2.jpg";
import galleryCareer3 from "@/assets/events/event-gallery-career-3.jpg";
import galleryCareer4 from "@/assets/events/event-gallery-career-4.jpg";
import speakerAdnan from "@/assets/people/speaker-adnan-khattak.jpg";
import speakerWardah from "@/assets/people/speaker-wardah-malik.jpg";
import speakerFahad from "@/assets/people/speaker-fahad-khan.jpg";
import speakerNasreen from "@/assets/people/speaker-nasreen-bibi.jpg";
import speakerShoaib from "@/assets/people/speaker-shoaib-akbar.jpg";
import speakerAmna from "@/assets/people/speaker-amna-zareen.jpg";
import speakerIhsanullah from "@/assets/people/speaker-ihsanullah-safi.jpg";
import speakerLaiba from "@/assets/people/speaker-laiba-aslam.jpg";
import type { EventCategory, EventSpeaker, SocietyEvent } from "@/types";

/**
 * MOCK DATA — Society events.
 *
 * All events, speakers, and details below are FICTIONAL demo content for
 * design purposes only — they deliberately do not describe real people or
 * confirmed society programming. Phase 4+: replaced by GET /api/events
 * (MongoDB-backed, Cloudflare R2 media, admin-managed).
 *
 * Dates are realistic relative to the September 2026 demo window and live in
 * this single file, so refreshing the timeline is a data-only change.
 */

/** Categories offered as filters (kept in sync with the data). */
export const EVENT_CATEGORIES: EventCategory[] = [
  "Workshops",
  "Seminars",
  "Hackathons",
  "Competitions",
  "Tech Talks",
  "Community",
  "Career",
];

/** Statuses offered as filters. */
export const EVENT_STATUSES = [
  "Upcoming",
  "Ongoing",
  "Completed",
  "Cancelled",
] as const;

/** Date-window options for the events filters. */
export const EVENT_DATE_OPTIONS = ["This Month", "Next Month", "Past"] as const;

const demoSpeakerSocials = [
  { label: "LinkedIn (demo placeholder)", href: "#", icon: Linkedin },
  { label: "GitHub (demo placeholder)", href: "#", icon: Github },
];

const speakerAdnanKhattak: EventSpeaker = {
  name: "Dr. Adnan Khattak",
  role: "Faculty Mentor",
  organization: "Dept. of Computer Science (demo)",
  bio: "A demo faculty persona who guides the society's technical curriculum. In this fictional workshop he opens the day with an intuition-first tour of how machines learn from data.",
  initials: "AK",
  image: speakerAdnan,
  imageAlt:
    "Placeholder portrait tile for demo speaker Dr. Adnan Khattak — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerWardahMalik: EventSpeaker = {
  name: "Wardah Malik",
  role: "Machine Learning Lead (demo)",
  organization: "SCS Technical Team",
  bio: "A demo student persona who built the society's introductory ML notebook series. She walks attendees through training and evaluating their first model.",
  initials: "WM",
  image: speakerWardah,
  imageAlt:
    "Placeholder portrait tile for demo speaker Wardah Malik — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerFahadKhan: EventSpeaker = {
  name: "Fahad Ullah Khan",
  role: "Full-Stack Mentor (demo)",
  organization: "Industry Guest",
  bio: "A demo mentor persona who has reviewed hundreds of student projects. He leads the backend track of the bootcamp, from REST APIs to deployment basics.",
  initials: "FK",
  image: speakerFahad,
  imageAlt:
    "Placeholder portrait tile for demo speaker Fahad Ullah Khan — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerNasreenBibi: EventSpeaker = {
  name: "Dr. Nasreen Bibi",
  role: "Guest Researcher (demo)",
  organization: "Computing Faculty",
  bio: "A demo researcher persona working on applied language technology. In this talk she unpacks how generative models produce text, images, and code.",
  initials: "NB",
  image: speakerNasreen,
  imageAlt:
    "Placeholder portrait tile for demo speaker Dr. Nasreen Bibi — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerShoaibAkbar: EventSpeaker = {
  name: "Shoaib Akbar",
  role: "Security Enthusiast (demo)",
  organization: "Guest Speaker",
  bio: "A demo speaker persona who runs campus safety drills. His session covers the everyday habits that stop the most common attacks on students.",
  initials: "SA",
  image: speakerShoaib,
  imageAlt:
    "Placeholder portrait tile for demo speaker Shoaib Akbar — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerAmnaZareen: EventSpeaker = {
  name: "Amna Zareen",
  role: "Frontend Mentor (demo)",
  organization: "Industry Guest",
  bio: "A demo mentor persona specialising in design systems and React. She leads the frontend track of the bootcamp with a hands-on component workshop.",
  initials: "AZ",
  image: speakerAmna,
  imageAlt:
    "Placeholder portrait tile for demo speaker Amna Zareen — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerIhsanullahSafi: EventSpeaker = {
  name: "Ihsanullah Safi",
  role: "Open-Source Maintainer (demo)",
  organization: "Guest Speaker",
  bio: "A demo maintainer persona who contributes to developer tooling. He demystifies Git workflows and walks students through their first pull request.",
  initials: "IS",
  image: speakerIhsanullah,
  imageAlt:
    "Placeholder portrait tile for demo speaker Ihsanullah Safi — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

const speakerLaibaAslam: EventSpeaker = {
  name: "Laiba Aslam",
  role: "Data Scientist (demo)",
  organization: "Industry Guest",
  bio: "A demo speaker persona who moved from SZIC classrooms into a data team. She shares an honest roadmap — skills, portfolios, and internship timing.",
  initials: "LA",
  image: speakerLaiba,
  imageAlt:
    "Placeholder portrait tile for demo speaker Laiba Aslam — abstract navy and gold monogram",
  socials: demoSpeakerSocials,
};

export const EVENTS: SocietyEvent[] = [
  {
    id: "evt-001",
    slug: "ai-machine-learning-workshop",
    title: "AI & Machine Learning Workshop",
    excerpt:
      "A hands-on introduction to machine learning — from Python basics to training and evaluating your first model.",
    description:
      "This beginner-friendly workshop turns machine learning from a buzzword into something you can actually do. Over one focused morning, you will set up a Python environment, explore a real dataset, and train and evaluate your first classification model — all guided step by step.\n\nThe session is designed for students who know basic programming but have never built a model. Senior members and faculty mentors stay on hand throughout, so no one gets stuck for long. Every attendee leaves with a working notebook, a curated list of next steps, and a clear picture of what to learn after the workshop.\n\nBring a laptop with a charger; we will help you install everything else. Seats are limited to keep the mentoring meaningful.",
    category: "Workshops",
    status: "upcoming",
    featured: true,
    date: "2026-10-12",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    location: "SZIC Computer Lab, University of Peshawar",
    coverImage: coverAiMl,
    coverImageAlt:
      "Abstract navy and gold artwork for the AI & Machine Learning Workshop",
    organizer: "SCS Technical Team",
    speakers: [speakerAdnanKhattak, speakerWardahMalik],
    schedule: [
      {
        time: "10:00 AM",
        title: "Registration & setup",
        description:
          "Check in, get on the lab Wi-Fi, and install the workshop environment with mentor support.",
      },
      {
        time: "10:30 AM",
        title: "Machine learning intuition",
        description:
          "What models actually do — a visual, math-light tour of learning from data.",
      },
      {
        time: "11:15 AM",
        title: "Train your first model",
        description:
          "Hands-on: explore a dataset, train a classifier, and read the results in Python.",
      },
      {
        time: "12:30 PM",
        title: "Q&A and next steps",
        description:
          "Ask anything, then leave with a personalised learning roadmap.",
      },
    ],
    registration: {
      enabled: true,
      capacity: 60,
      note: "Free for SCS members. Bring your laptop and charger.",
    },
    tags: ["Machine Learning", "Python", "Beginner Friendly", "Hands-on"],
    createdAt: "2026-08-18T09:00:00Z",
  },
  {
    id: "evt-002",
    slug: "full-stack-web-development-bootcamp",
    title: "Full-Stack Web Development Bootcamp",
    excerpt:
      "One intensive day, two tracks, one goal — plan, build, and ship a working web project.",
    description:
      "The bootcamp is the society's flagship hands-on event. In a single day, small teams plan a product, build a working front end, wire it to a real backend, and demo the result on stage — an entire product lifecycle, compressed into eight focused hours.\n\nTwo parallel tracks keep everyone challenged: a frontend track covering modern component thinking with React, and a backend track covering APIs, data modelling, and deployment basics. Mentors circulate continuously, and a midday checkpoint keeps teams honest about scope.\n\nYou do not need to be an expert — you need working knowledge of HTML, CSS, and JavaScript and the will to ship something real. Lunch and refreshments are provided for registered attendees.",
    category: "Workshops",
    status: "upcoming",
    date: "2026-10-24",
    startTime: "9:00 AM",
    endTime: "4:00 PM",
    location: "Seminar Hall, SZIC",
    coverImage: coverBootcamp,
    coverImageAlt:
      "Abstract navy and gold artwork for the Full-Stack Web Development Bootcamp",
    organizer: "SCS Events Committee",
    speakers: [speakerFahadKhan, speakerAmnaZareen],
    schedule: [
      {
        time: "9:00 AM",
        title: "Kickoff & team formation",
        description: "Meet your team, pick a product idea, and scope it hard.",
      },
      {
        time: "9:45 AM",
        title: "Track sessions begin",
        description:
          "Frontend and backend tracks split — components and APIs in parallel.",
      },
      {
        time: "1:00 PM",
        title: "Integration checkpoint",
        description:
          "Wire the pieces together, with mentors on call for every blocker.",
      },
      {
        time: "2:30 PM",
        title: "Polish & deploy",
        description:
          "UI polish, bug fixes, and a first deployment of the working app.",
      },
      {
        time: "3:30 PM",
        title: "Demos & closing",
        description: "Two-minute demos from every team and closing remarks.",
      },
    ],
    registration: {
      enabled: true,
      capacity: 80,
      note: "Lunch provided. Basic HTML/CSS/JavaScript required.",
    },
    tags: ["Web Development", "React", "Node.js", "Team Building"],
    createdAt: "2026-08-22T09:00:00Z",
  },
  {
    id: "evt-003",
    slug: "annual-computing-hackathon",
    title: "Annual Computing Hackathon",
    excerpt:
      "Twelve hours, teams of three to four, and one challenge — design, build, and pitch a working prototype.",
    description:
      "The Annual Computing Hackathon is the biggest event on the SCS calendar. Teams race a twelve-hour clock to take a challenge brief from idea to working prototype, with mentors roaming the floor and industry guests judging the final pitches.\n\nThe challenge theme is revealed at kickoff and is designed to be approachable: every team can ship something, and ambitious teams can push further. Judging rewards working software, clear problem framing, and honest demos — slides alone will not save you.\n\nPrizes go to the top three teams, and every participant receives a certificate. Whether this is your first hackathon or your fifth, the day is built so you leave having shipped something real with people you will keep building alongside.",
    category: "Hackathons",
    status: "upcoming",
    date: "2026-11-07",
    startTime: "8:00 AM",
    endTime: "8:00 PM",
    location: "Main Auditorium, SZIC",
    coverImage: coverHackathon,
    coverImageAlt:
      "Abstract navy and gold artwork for the Annual Computing Hackathon",
    organizer: "SCS Events Committee",
    schedule: [
      {
        time: "8:00 AM",
        title: "Check-in & theme reveal",
        description: "Teams register, the challenge brief drops, and the clock starts.",
      },
      {
        time: "9:00 AM",
        title: "Hacking begins",
        description: "Twelve focused hours — mentors circulate all day.",
      },
      {
        time: "1:00 PM",
        title: "Lunch & checkpoint",
        description: "Refuel and give mentors a mid-build progress demo.",
      },
      {
        time: "5:30 PM",
        title: "Code freeze",
        description: "Laptops close. Final commits in and demos prepped.",
      },
      {
        time: "6:00 PM",
        title: "Pitches & awards",
        description:
          "Five minutes per team in front of the judges, then prizes.",
      },
    ],
    registration: {
      enabled: true,
      capacity: 120,
      note: "Register as a team of 3–4, or solo and we will place you.",
    },
    tags: ["Hackathon", "Competition", "Prizes", "Teamwork"],
    createdAt: "2026-08-30T09:00:00Z",
  },
  {
    id: "evt-004",
    slug: "introduction-to-generative-ai",
    title: "Introduction to Generative AI",
    excerpt:
      "A seminar-style tech talk on how generative models create text, images, and code — and where they fall short.",
    description:
      "Generative AI is everywhere, but how does it actually work? This seminar-style talk builds a clear mental model of modern generative systems: how large language models predict text, how diffusion models form images, and why the same techniques can generate working code.\n\nThe second half is refreshingly honest — a look at failure modes, hallucination, bias, and the practical limits you should know before building on top of these tools. No heavy math is required; the focus is intuition you can carry into your own projects.\n\nThe talk closes with an open Q&A and pointers to free tools and datasets so you can experiment safely on your own laptop. No registration needed — just come curious.",
    category: "Tech Talks",
    status: "upcoming",
    date: "2026-11-21",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    location: "Lecture Hall B, SZIC",
    coverImage: coverGenAi,
    coverImageAlt:
      "Abstract navy and gold artwork for the Introduction to Generative AI talk",
    organizer: "SCS Research & Innovation Wing",
    speakers: [speakerNasreenBibi],
    schedule: [
      {
        time: "2:00 PM",
        title: "How generative models work",
        description: "An intuition-first tour of language and image generation.",
      },
      {
        time: "3:00 PM",
        title: "Limits, failure modes & ethics",
        description:
          "Hallucination, bias, and what these models genuinely cannot do yet.",
      },
      {
        time: "3:40 PM",
        title: "Open Q&A",
        description: "Your questions, answered — plus tools to try at home.",
      },
    ],
    registration: {
      enabled: false,
      label: "Registration Not Required",
      note: "Open to all students and faculty — seating is first come, first served.",
    },
    tags: ["Generative AI", "LLMs", "Research", "Seminar"],
    createdAt: "2026-09-02T09:00:00Z",
  },
  {
    id: "evt-005",
    slug: "git-and-open-source-workshop",
    title: "Git & Open Source Workshop",
    excerpt:
      "Stop fearing Git — learn branching, clean commits, and how to make your first real open-source contribution.",
    description:
      "Version control is the first professional tool every developer meets and the one most students only half-learn. This workshop fixes that. You will practise the daily Git workflow until it feels automatic — branching, committing, rebasing, and resolving conflicts without panic.\n\nThe second half goes further: what open source actually is, how to read a project's contribution guide, and how to land your first merged pull request. Each participant opens a real pull request to a beginner-friendly project during the session, with mentors reviewing as you go.\n\nA GitHub account and Git installed beforehand are the only prerequisites. Setup help is available from 9:30 AM if you get stuck.",
    category: "Workshops",
    status: "upcoming",
    date: "2026-12-05",
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    location: "SZIC Computer Lab, University of Peshawar",
    coverImage: coverGit,
    coverImageAlt:
      "Abstract navy and gold artwork for the Git & Open Source Workshop",
    organizer: "SCS Technical Team",
    speakers: [speakerIhsanullahSafi],
    schedule: [
      {
        time: "10:00 AM",
        title: "Git essentials",
        description:
          "Commits, branches, and merges — the daily workflow practised live.",
      },
      {
        time: "11:00 AM",
        title: "Fixing mistakes safely",
        description: "Conflicts, rebase, and undoing damage without losing work.",
      },
      {
        time: "11:45 AM",
        title: "Your first pull request",
        description:
          "Read a real project, pick an issue, and open a contribution.",
      },
      {
        time: "12:40 PM",
        title: "Review & wrap-up",
        description:
          "Mentors review PRs live and share what maintainers look for.",
      },
    ],
    registration: {
      enabled: true,
      capacity: 50,
      note: "Bring a laptop with Git installed — setup help from 9:30 AM.",
    },
    tags: ["Git", "Open Source", "GitHub", "Collaboration"],
    createdAt: "2026-09-08T09:00:00Z",
  },
  {
    id: "evt-006",
    slug: "scs-developer-meetup-october",
    title: "SCS Developer Meetup",
    excerpt:
      "An informal evening of lightning talks, project show-and-tell, and community networking.",
    description:
      "The SCS Developer Meetup is the society at its most informal — an evening where members show what they are building, share five-minute lightning talks, and meet the people behind the usernames. No registration wall, no dress code, no pressure.\n\nThe October edition was planned to feature three member lightning talks, a project show-and-tell corner, and open networking over tea.\n\nThis edition has been cancelled due to a clash with the university's revised examination schedule. The meetup series will return next semester — watch this space and the community feed for the new date.",
    category: "Community",
    status: "cancelled",
    date: "2026-10-30",
    startTime: "4:00 PM",
    endTime: "6:00 PM",
    location: "SCS Common Room, SZIC",
    coverImage: coverMeetup,
    coverImageAlt:
      "Abstract navy and gold artwork for the SCS Developer Meetup",
    organizer: "SCS Media & Communications",
    registration: {
      enabled: false,
      label: "Registration Closed",
      note: "Cancelled — the meetup series returns next semester.",
    },
    tags: ["Meetup", "Networking", "Lightning Talks"],
    createdAt: "2026-09-10T09:00:00Z",
  },
  {
    id: "evt-007",
    slug: "cybersecurity-awareness-session",
    title: "Cybersecurity Awareness Session",
    excerpt:
      "Happening today — a practical session on the scams, phishing tricks, and habits that matter most for students.",
    description:
      "Most attacks on students are not sophisticated — they are phishing links, fake internship offers, reused passwords, and overshared accounts. This session walks through the real examples circulating on campuses right now and the simple habits that shut them down.\n\nExpect live demos of a phishing email being taken apart piece by piece, a password-manager setup clinic, and a plain-language tour of how your phone and social accounts leak more than you think.\n\nThe session is running now in Lecture Hall B — walk in and grab a seat. No background knowledge is needed and every student, not just CS majors, is welcome.",
    category: "Seminars",
    status: "ongoing",
    date: "2026-09-25",
    startTime: "11:00 AM",
    endTime: "1:00 PM",
    location: "Lecture Hall B, SZIC",
    coverImage: coverCybersecurity,
    coverImageAlt:
      "Abstract navy and gold artwork for the Cybersecurity Awareness Session",
    organizer: "SCS Technical Team",
    speakers: [speakerShoaibAkbar],
    schedule: [
      {
        time: "11:00 AM",
        title: "Anatomy of a phishing attack",
        description: "A live teardown of real scam messages targeting students.",
      },
      {
        time: "11:50 AM",
        title: "Passwords, 2FA & managers",
        description: "A hands-on clinic — leave with your accounts properly locked down.",
      },
      {
        time: "12:40 PM",
        title: "Q&A on staying safe",
        description: "Bring the suspicious messages you have received — we will grade them.",
      },
    ],
    registration: {
      enabled: false,
      label: "Registration Not Required",
      note: "Walk-in session — open to all students and faculty.",
    },
    tags: ["Cybersecurity", "Awareness", "Student Safety"],
    createdAt: "2026-09-12T09:00:00Z",
  },
  {
    id: "evt-008",
    slug: "data-science-career-talk",
    title: "Data Science Career Talk",
    excerpt:
      "An honest session on breaking into data science — skills, portfolios, internships, and what interviews actually test.",
    description:
      "Career advice about data science is usually either hype or gatekeeping. This talk was neither. Our guest walked through her real path from university classrooms to a professional data team — including the detours — and mapped the skills that actually mattered at each stage.\n\nThe session covered building a portfolio that survives a recruiter's thirty-second glance, timing internship applications, and what technical interviews for data roles genuinely test. A frank Q&A followed, with questions about mathematics requirements, bootcamps, and local job markets.\n\nThe recording and the resource sheet shared at the end are available to members through the community feed. The photos below capture the packed room and the lively discussion that followed the talk.",
    category: "Career",
    status: "completed",
    date: "2026-09-05",
    startTime: "3:00 PM",
    endTime: "5:00 PM",
    location: "Seminar Hall, SZIC",
    coverImage: coverCareerTalk,
    coverImageAlt:
      "Abstract navy and gold artwork for the Data Science Career Talk",
    organizer: "SCS Alumni Relations",
    speakers: [speakerLaibaAslam],
    schedule: [
      {
        time: "3:00 PM",
        title: "The real roadmap",
        description: "From first Python script to a professional data role.",
      },
      {
        time: "3:50 PM",
        title: "Portfolios & internships",
        description: "What gets interviews — and what quietly does not.",
      },
      {
        time: "4:30 PM",
        title: "Open Q&A",
        description: "Math anxiety, bootcamps, and the local job market — answered honestly.",
      },
    ],
    registration: {
      enabled: false,
      label: "Registration Closed",
      note: "This event has concluded — thank you to everyone who attended.",
    },
    tags: ["Careers", "Data Science", "Internships", "Alumni"],
    gallery: [galleryCareer1, galleryCareer2, galleryCareer3, galleryCareer4],
    createdAt: "2026-08-20T09:00:00Z",
  },
  {
    id: "evt-009",
    slug: "annual-programming-contest",
    title: "Annual Programming Contest",
    excerpt:
      "The society's flagship algorithm contest — five hours, twelve problems, and a scoreboard that never sat still.",
    description:
      "The Annual Programming Contest brought the society's problem-solvers together for five hours of algorithmic racing. Twelve problems spanned greedy thinking, dynamic programming, graph traversal, and a now-legendary geometry problem that only two teams solved.\n\nContestants competed in teams of two or three, and the leaderboard updated live throughout the afternoon — the top spot changed hands four times before the final submission sealed it with nine minutes left on the clock.\n\nCongratulations to this year's winning teams, and thank you to the judges and volunteers who kept the contest running smoothly. Photos from the contest floor are below, and problem sets are available to members in the community feed for practice.",
    category: "Competitions",
    status: "completed",
    date: "2026-08-20",
    startTime: "9:00 AM",
    endTime: "3:00 PM",
    location: "SZIC Computer Lab, University of Peshawar",
    coverImage: coverContest,
    coverImageAlt:
      "Abstract navy and gold artwork for the Annual Programming Contest",
    organizer: "SCS Technical Team",
    schedule: [
      {
        time: "9:00 AM",
        title: "Check-in & rules briefing",
        description: "Teams seated, judges introduced, and the rules made plain.",
      },
      {
        time: "9:30 AM",
        title: "Contest begins",
        description: "Twelve problems, five hours, one live scoreboard.",
      },
      {
        time: "12:30 PM",
        title: "Mid-contest break",
        description: "A short breather — the scoreboard kept its top four apart.",
      },
      {
        time: "2:30 PM",
        title: "Awards ceremony",
        description: "Winners crowned nine minutes before the final buzzer.",
      },
    ],
    registration: {
      enabled: false,
      label: "Registration Closed",
      note: "This event has concluded — see you at next year's contest.",
    },
    tags: ["Contest", "Algorithms", "Problem Solving", "ICPC Style"],
    gallery: [galleryContest1, galleryContest2, galleryContest3, galleryContest4],
    createdAt: "2026-07-15T09:00:00Z",
  },
];

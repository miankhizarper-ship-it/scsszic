import galleryHackathon from "@/assets/media/gallery-hackathon.jpg";
import galleryBootcamp from "@/assets/media/gallery-bootcamp.jpg";
import galleryOrientation from "@/assets/media/gallery-orientation.jpg";
import galleryContest from "@/assets/media/gallery-contest.jpg";
import galleryFarewell from "@/assets/media/gallery-farewell.jpg";
import galleryGala from "@/assets/media/gallery-gala.jpg";
import galleryLecture from "@/assets/media/gallery-lecture.jpg";
import contest1 from "@/assets/events/event-gallery-contest-1.jpg";
import contest2 from "@/assets/events/event-gallery-contest-2.jpg";
import contest3 from "@/assets/events/event-gallery-contest-3.jpg";
import contest4 from "@/assets/events/event-gallery-contest-4.jpg";
import career1 from "@/assets/events/event-gallery-career-1.jpg";
import career2 from "@/assets/events/event-gallery-career-2.jpg";
import career3 from "@/assets/events/event-gallery-career-3.jpg";
import career4 from "@/assets/events/event-gallery-career-4.jpg";
import photoHackathon1 from "@/assets/gallery/photo-hackathon-1.jpg";
import photoHackathon2 from "@/assets/gallery/photo-hackathon-2.jpg";
import photoHackathon3 from "@/assets/gallery/photo-hackathon-3.jpg";
import photoHackathon4 from "@/assets/gallery/photo-hackathon-4.jpg";
import photoBootcamp1 from "@/assets/gallery/photo-bootcamp-1.jpg";
import photoBootcamp2 from "@/assets/gallery/photo-bootcamp-2.jpg";
import photoBootcamp3 from "@/assets/gallery/photo-bootcamp-3.jpg";
import photoBootcamp4 from "@/assets/gallery/photo-bootcamp-4.jpg";
import photoAiml1 from "@/assets/gallery/photo-aiml-1.jpg";
import photoAiml2 from "@/assets/gallery/photo-aiml-2.jpg";
import photoAiml3 from "@/assets/gallery/photo-aiml-3.jpg";
import photoAiml4 from "@/assets/gallery/photo-aiml-4.jpg";
import photoAiml5 from "@/assets/gallery/photo-aiml-5.jpg";
import photoOrientation1 from "@/assets/gallery/photo-orientation-1.jpg";
import photoOrientation2 from "@/assets/gallery/photo-orientation-2.jpg";
import photoOrientation3 from "@/assets/gallery/photo-orientation-3.jpg";
import photoFarewell1 from "@/assets/gallery/photo-farewell-1.jpg";
import photoFarewell2 from "@/assets/gallery/photo-farewell-2.jpg";
import photoFarewell3 from "@/assets/gallery/photo-farewell-3.jpg";
import photoGala1 from "@/assets/gallery/photo-gala-1.jpg";
import photoGala2 from "@/assets/gallery/photo-gala-2.jpg";
import photoGala3 from "@/assets/gallery/photo-gala-3.jpg";
import photoLecture1 from "@/assets/gallery/photo-lecture-1.jpg";
import photoLecture2 from "@/assets/gallery/photo-lecture-2.jpg";
import photoLecture3 from "@/assets/gallery/photo-lecture-3.jpg";
import photoFreshers1 from "@/assets/gallery/photo-freshers-1.jpg";
import photoFreshers2 from "@/assets/gallery/photo-freshers-2.jpg";
import photoFreshers3 from "@/assets/gallery/photo-freshers-3.jpg";
import photoFreshers4 from "@/assets/gallery/photo-freshers-4.jpg";
import type { GalleryAlbum } from "@/types";

/**
 * MOCK DATA — Gallery albums.
 *
 * Every album, photo, caption, and location below is FICTIONAL demo content
 * created for design purposes only — the imagery is abstract placeholder
 * artwork, and the moments described deliberately do not depict real people
 * or confirmed society programming. The gallery pages carry a visible demo
 * disclaimer.
 *
 * Phase 6+: replaced by GET /api/gallery (MongoDB metadata + Cloudflare R2
 * image objects + CDN URLs). Albums are embedded-document shaped; every
 * image reference is a plain URL string, so swapping local artwork for R2
 * URLs is a data-only change.
 *
 * Dates sit inside the September 2026 demo window shared with events data,
 * so refreshing the timeline is a data-only change.
 */

/** Categories offered as filters — centralized, never hardcoded in pages. */
export const GALLERY_CATEGORIES = [
  "Competitions",
  "Workshops",
  "Seminars",
  "Community",
  "Ceremonies",
] as const;

/* ---------------------------------------------------------------------------
 * Demo albums — published
 * ------------------------------------------------------------------------- */

const albumHackathon: GalleryAlbum = {
  id: "alb-001",
  slug: "annual-computing-hackathon-2026",
  title: "Annual Computing Hackathon 2026",
  description:
    "Thirty-two hours, fourteen teams, and one very long scoreboard. This album follows the Annual Computing Hackathon from late-night debugging to the final demos — mentors circling the floor, whiteboards filling up, and the moment the winning team shipped their last commit.",
  coverImage: galleryHackathon,
  coverImageAlt:
    "Abstract navy and gold artwork from the Annual Computing Hackathon",
  category: "Competitions",
  eventSlug: "annual-computing-hackathon",
  date: "2026-05-16",
  location: "SZIC Main Hall, University of Peshawar",
  photoCount: 6,
  photos: [
    {
      id: "alb-001-p1",
      src: galleryHackathon,
      alt: "Teams settled in at the start of the hackathon",
      caption: "Check-in complete — thirty-two hours on the clock.",
    },
    {
      id: "alb-001-p2",
      src: photoHackathon1,
      alt: "A team planning features on paper during the hackathon",
      caption: "Scope decisions in the first hour.",
    },
    {
      id: "alb-001-p3",
      src: photoHackathon2,
      alt: "Mentors reviewing a project with a team at the hackathon",
    },
    {
      id: "alb-001-p4",
      src: photoHackathon3,
      alt: "Late-night working session during the hackathon",
      caption: "Hour nineteen — coffee doing the heavy lifting.",
    },
    {
      id: "alb-001-p5",
      src: photoHackathon4,
      alt: "A team rehearsing their final demo presentation",
    },
    {
      id: "alb-001-p6",
      src: galleryContest,
      alt: "The judges' table during final hackathon demos",
      caption: "Final demos in front of the judging panel.",
    },
  ],
  featured: true,
  status: "published",
  tags: ["Hackathon", "Teamwork", "Mentors", "2026"],
};

const albumContest: GalleryAlbum = {
  id: "alb-002",
  slug: "annual-programming-contest-gallery",
  title: "Annual Programming Contest — Contest Floor",
  description:
    "Five hours, twelve problems, and a leaderboard that changed hands four times. Candid shots from the contest floor of the Annual Programming Contest — teams mid-thought, judges verifying submissions, and the quiet panic of the final nine minutes.",
  coverImage: contest1,
  coverImageAlt:
    "Abstract navy and gold artwork from the Annual Programming Contest",
  category: "Competitions",
  eventSlug: "annual-programming-contest",
  date: "2026-08-20",
  location: "SZIC Computer Lab, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-002-p1",
      src: contest1,
      alt: "Contestants reading the problem set at the programming contest",
      caption: "Problem set read-through before the clock started.",
    },
    {
      id: "alb-002-p2",
      src: contest2,
      alt: "A team debugging together during the contest",
    },
    {
      id: "alb-002-p3",
      src: contest3,
      alt: "The live scoreboard mid-contest",
      caption: "The scoreboard refused to sit still all afternoon.",
    },
    {
      id: "alb-002-p4",
      src: contest4,
      alt: "The awards moment at the end of the programming contest",
    },
  ],
  status: "published",
  tags: ["Contest", "Algorithms", "Problem Solving"],
};

const albumBootcamp: GalleryAlbum = {
  id: "alb-003",
  slug: "full-stack-web-bootcamp-lab",
  title: "Full-Stack Web Bootcamp — Lab Sessions",
  description:
    "A week of shipping real pages. These lab sessions from the Full-Stack Web Development Bootcamp capture first deployments, pair-debugging breakthroughs, and the exact moment a room full of beginners watched their code go live.",
  coverImage: galleryBootcamp,
  coverImageAlt: "Abstract navy and gold artwork from the web bootcamp labs",
  category: "Workshops",
  eventSlug: "full-stack-web-development-bootcamp",
  date: "2026-07-11",
  location: "SZIC Computing Lab 2, University of Peshawar",
  photoCount: 5,
  photos: [
    {
      id: "alb-003-p1",
      src: galleryBootcamp,
      alt: "The lab during a web bootcamp session",
      caption: "Day one — HTML in the morning, deployed by evening.",
    },
    {
      id: "alb-003-p2",
      src: photoBootcamp1,
      alt: "Two participants pair-programming at one machine",
    },
    {
      id: "alb-003-p3",
      src: photoBootcamp2,
      alt: "A mentor walking a participant through an error message",
    },
    {
      id: "alb-003-p4",
      src: photoBootcamp3,
      alt: "Notes and laptops during the bootcamp lab session",
      caption: "Every deployment started as a sketch like this.",
    },
    {
      id: "alb-003-p5",
      src: photoBootcamp4,
      alt: "Participants watching a live code walkthrough",
    },
  ],
  status: "published",
  tags: ["Bootcamp", "Web Development", "Beginners", "Labs"],
};

const albumAiml: GalleryAlbum = {
  id: "alb-004",
  slug: "ai-and-machine-learning-workshop",
  title: "AI & Machine Learning Workshop",
  description:
    "From first tensor to a trained classifier in one afternoon. Photos from the AI & Machine Learning Workshop — hands-on notebook sessions, live model evaluations, and a Q&A that ran long past the scheduled end because nobody wanted to stop asking questions.",
  coverImage: photoAiml1,
  coverImageAlt: "Abstract navy and gold artwork from the AI & ML workshop",
  category: "Workshops",
  eventSlug: "ai-machine-learning-workshop",
  date: "2026-09-12",
  location: "SZIC Seminar Room, University of Peshawar",
  photoCount: 5,
  photos: [
    {
      id: "alb-004-p1",
      src: photoAiml1,
      alt: "Participants following the AI & ML workshop notebook",
      caption: "Notebook 01 — everyone training their first model.",
    },
    {
      id: "alb-004-p2",
      src: photoAiml2,
      alt: "A speaker explaining a model evaluation chart",
    },
    {
      id: "alb-004-p3",
      src: photoAiml3,
      alt: "Participants comparing results during the workshop lab",
    },
    {
      id: "alb-004-p4",
      src: photoAiml4,
      alt: "Whiteboard sketch of a neural network from the workshop",
      caption: "The whiteboard version of 'how backpropagation works'.",
    },
    {
      id: "alb-004-p5",
      src: photoAiml5,
      alt: "The Q&A session at the end of the AI & ML workshop",
    },
  ],
  status: "published",
  tags: ["AI", "Machine Learning", "Workshop", "Hands-on"],
};

const albumCareerTalk: GalleryAlbum = {
  id: "alb-005",
  slug: "data-science-career-talk-gallery",
  title: "Data Science Career Talk",
  description:
    "Alumni and invited speakers on what a data career actually looks like — first roles, portfolio projects that got replies, and the skills that mattered two years in. Photos from the session and the hallway conversations that continued long after it ended.",
  coverImage: career1,
  coverImageAlt: "Abstract navy and gold artwork from the data science career talk",
  category: "Seminars",
  eventSlug: "data-science-career-talk",
  date: "2026-08-27",
  location: "SZIC Auditorium, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-005-p1",
      src: career1,
      alt: "The speaker opening the data science career talk",
    },
    {
      id: "alb-005-p2",
      src: career2,
      alt: "Students listening during the career talk",
      caption: "A full auditorium for a Thursday afternoon.",
    },
    {
      id: "alb-005-p3",
      src: career3,
      alt: "The panel answering audience questions",
    },
    {
      id: "alb-005-p4",
      src: career4,
      alt: "Speakers and students talking after the session",
      caption: "The real networking happened out here.",
    },
  ],
  status: "published",
  tags: ["Careers", "Data Science", "Alumni", "Seminar"],
};

const albumOrientation: GalleryAlbum = {
  id: "alb-006",
  slug: "orientation-day-2026",
  title: "Orientation Day 2026",
  description:
    "New faces, same nervous excitement every year. Orientation Day introduced the incoming batch to the society — what we run, how study circles work, and which events are worth clearing a weekend for. Welcome aboard.",
  coverImage: galleryOrientation,
  coverImageAlt: "Abstract navy and gold artwork from orientation day",
  category: "Community",
  date: "2026-02-20",
  location: "SZIC Common Room, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-006-p1",
      src: galleryOrientation,
      alt: "New members gathered at orientation day",
      caption: "The incoming batch, five minutes before kickoff.",
    },
    {
      id: "alb-006-p2",
      src: photoOrientation1,
      alt: "The team presenting the society calendar at orientation",
    },
    {
      id: "alb-006-p3",
      src: photoOrientation2,
      alt: "Students signing up at the orientation desks",
    },
    {
      id: "alb-006-p4",
      src: photoOrientation3,
      alt: "Senior members answering questions after orientation",
      caption: "Every question got answered — eventually.",
    },
  ],
  status: "published",
  tags: ["Community", "Orientation", "New Members"],
};

const albumFarewell: GalleryAlbum = {
  id: "alb-007",
  slug: "farewell-ceremony-2026",
  title: "Farewell Ceremony 2026",
  description:
    "The graduating batch handed over the keys. The Farewell Ceremony honored everything the outgoing members built — the events they ran, the juniors they mentored, and the traditions they leave behind. Photos from a genuinely emotional evening.",
  coverImage: galleryFarewell,
  coverImageAlt: "Abstract navy and gold artwork from the farewell ceremony",
  category: "Ceremonies",
  date: "2026-06-05",
  location: "SZIC Lawn, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-007-p1",
      src: galleryFarewell,
      alt: "The graduating batch at the farewell ceremony",
      caption: "The graduating batch, one last time as students.",
    },
    {
      id: "alb-007-p2",
      src: photoFarewell1,
      alt: "The handover moment at the farewell ceremony",
    },
    {
      id: "alb-007-p3",
      src: photoFarewell2,
      alt: "Speeches during the farewell evening",
      caption: "Speeches that ran longer than anyone planned.",
    },
    {
      id: "alb-007-p4",
      src: photoFarewell3,
      alt: "Group photo at the end of the farewell ceremony",
    },
  ],
  status: "published",
  tags: ["Ceremony", "Farewell", "Traditions"],
};

const albumGala: GalleryAlbum = {
  id: "alb-008",
  slug: "university-gala-night",
  title: "University Gala Night",
  description:
    "The society doesn't only compile code. At the university gala, Team SCS ran the tech showcase stall, demoed member projects to the whole campus, and — evidence enclosed — occasionally remembered to have fun.",
  coverImage: galleryGala,
  coverImageAlt: "Abstract navy and gold artwork from the university gala",
  category: "Community",
  date: "2025-12-12",
  location: "University of Peshawar Campus Grounds",
  photoCount: 4,
  photos: [
    {
      id: "alb-008-p1",
      src: galleryGala,
      alt: "Team SCS at the university gala",
      caption: "Team SCS at the gala entrance.",
    },
    {
      id: "alb-008-p2",
      src: photoGala1,
      alt: "The SCS tech showcase stall at the gala",
    },
    {
      id: "alb-008-p3",
      src: photoGala2,
      alt: "Visitors trying member projects at the gala stall",
      caption: "Letting the whole campus try member projects.",
    },
    {
      id: "alb-008-p4",
      src: photoGala3,
      alt: "The team celebrating at the end of gala night",
    },
  ],
  status: "published",
  tags: ["Community", "Showcase", "Campus Life"],
};

const albumLecture: GalleryAlbum = {
  id: "alb-009",
  slug: "industry-guest-lecture",
  title: "Industry Guest Lecture Series",
  description:
    "Practitioners brought the industry into the seminar room — how production systems are really built, reviewed, and kept alive at 3 AM. Photos from the guest lecture and the whiteboard discussion that refused to fit in the time slot.",
  coverImage: galleryLecture,
  coverImageAlt: "Abstract navy and gold artwork from the guest lecture",
  category: "Seminars",
  date: "2025-11-08",
  location: "SZIC Seminar Room, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-009-p1",
      src: galleryLecture,
      alt: "An industry guest speaking at the seminar",
      caption: "Real production stories, not textbook ones.",
    },
    {
      id: "alb-009-p2",
      src: photoLecture1,
      alt: "Students taking notes during the guest lecture",
    },
    {
      id: "alb-009-p3",
      src: photoLecture2,
      alt: "A whiteboard architecture sketch from the lecture",
      caption: "The architecture sketch that outlived the session.",
    },
    {
      id: "alb-009-p4",
      src: photoLecture3,
      alt: "A one-on-one question after the guest lecture",
    },
  ],
  status: "published",
  tags: ["Seminar", "Industry", "Guest Speaker"],
};

/* ---------------------------------------------------------------------------
 * Demo album — archived (proves the status gate; hidden from public pages)
 * ------------------------------------------------------------------------- */

const albumFreshers2024: GalleryAlbum = {
  id: "alb-010",
  slug: "freshers-welcome-2024",
  title: "Freshers Welcome 2024",
  description:
    "The society's 2024 freshers welcome — retired from the public archive. This album exists in the dataset to prove that archived albums are correctly excluded from public listings and return 'Album Not Found' on direct URLs.",
  coverImage: photoFreshers1,
  coverImageAlt: "Abstract navy and gold artwork from the 2024 freshers welcome",
  category: "Community",
  date: "2024-10-18",
  location: "SZIC Common Room, University of Peshawar",
  photoCount: 4,
  photos: [
    {
      id: "alb-010-p1",
      src: photoFreshers1,
      alt: "Archived artwork from the 2024 freshers welcome",
    },
    {
      id: "alb-010-p2",
      src: photoFreshers2,
      alt: "Archived artwork from the 2024 freshers welcome",
    },
    {
      id: "alb-010-p3",
      src: photoFreshers3,
      alt: "Archived artwork from the 2024 freshers welcome",
    },
    {
      id: "alb-010-p4",
      src: photoFreshers4,
      alt: "Archived artwork from the 2024 freshers welcome",
    },
  ],
  status: "archived",
  tags: ["Community", "Freshers", "Archive"],
};

export const GALLERY_ALBUMS: GalleryAlbum[] = [
  albumHackathon,
  albumContest,
  albumBootcamp,
  albumAiml,
  albumCareerTalk,
  albumOrientation,
  albumFarewell,
  albumGala,
  albumLecture,
  albumFreshers2024,
];

import thumbGenai from "@/assets/watch/watch-genai-talk.jpg";
import thumbBootcamp from "@/assets/watch/watch-bootcamp-session.jpg";
import thumbAiml from "@/assets/watch/watch-aiml-scikit.jpg";
import thumbCyber from "@/assets/watch/watch-cyber-essentials.jpg";
import thumbGit from "@/assets/watch/watch-git-collab.jpg";
import thumbCareer from "@/assets/watch/watch-career-panel.jpg";
import thumbContest from "@/assets/watch/watch-contest-highlights.jpg";
import thumbAftermovie from "@/assets/watch/watch-hackathon-aftermovie.jpg";
import thumbReact from "@/assets/watch/watch-react-component.jpg";
import thumbPython from "@/assets/watch/watch-python-data.jpg";
import thumbPortfolio from "@/assets/watch/watch-portfolio-roadmap.jpg";
import thumbOpenHouse from "@/assets/watch/watch-open-house.jpg";
import demoClipA from "@/assets/watch/demo-clip-a.mp4";
import demoClipB from "@/assets/watch/demo-clip-b.mp4";
import type { WatchVideo } from "@/types";

/**
 * MOCK DATA — Watch videos.
 *
 * Every video, speaker, and description below is FICTIONAL demo content for
 * design purposes only — none of these are real recordings of real events or
 * real speakers, and the "footage" is abstract placeholder artwork plus two
 * tiny locally-generated demo clips (~30 KB, clearly watermarked "DEMO
 * FOOTAGE"). The watch pages carry a visible demo disclaimer.
 *
 * Video-source strategy (spec §19 — no large media committed to the repo):
 *   videoUrl → native <video> playback. Demo entries point at the two local
 *              clips; a later phase swaps the strings for Cloudflare R2 /
 *              CDN MP4 URLs with zero UI changes.
 *   embedUrl → privacy-mode iframe (YouTube-nocookie / Vimeo). Supported by
 *              the VideoPlayer component; unused in mock data so the demo
 *              never depends on an external host being reachable.
 *   neither  → poster-only fallback state (see the archived entry).
 *
 * Phase 6+: replaced by GET /api/watch (MongoDB-backed, R2 media).
 *
 * Dates sit inside the September 2026 demo window shared with events data.
 * Speaker names reuse the fictional personas already established by the
 * events dataset (data/events.ts) and blog authors (data/authors.ts) so the
 * same person is the same person everywhere on the site.
 */

/** Categories offered as filters — centralized, never hardcoded in pages. */
export const WATCH_CATEGORIES = [
  "AI & Machine Learning",
  "Web Development",
  "Cybersecurity",
  "Programming",
  "Career",
  "Community",
] as const;

/** Duration buckets offered as filters (see lib/watchSearch duration logic). */
export const WATCH_DURATION_OPTIONS = [
  "Under 15 min",
  "15–30 min",
  "30–60 min",
  "Over 1 hour",
] as const;

/* ---------------------------------------------------------------------------
 * Demo videos — published
 * ------------------------------------------------------------------------- */

const videoGenai: WatchVideo = {
  id: "vid-001",
  slug: "introduction-to-generative-ai-recorded-talk",
  title: "Introduction to Generative AI — Recorded Talk",
  excerpt:
    "How do generative models actually produce text, images, and code? A recorded session that builds the intuition from the ground up — no math background required.",
  description:
    "Dr. Nasreen Bibi's generative AI session became one of the most-requested recordings in the society archive, so we filmed the follow-up edition in full. The talk starts with the single idea behind every generative model — predict what plausibly comes next — and builds outward to text generation, image synthesis, and code completion.\n\nThe second half covers the part most tutorials skip: failure modes. Hallucinations, training-data bias, prompt injection, and the ethics of synthetic media are treated as first-class topics rather than a closing disclaimer. The session closes with a practical framework for deciding when generative tools help your work and when they quietly undermine it.\n\nIf you want the live version, the next edition of this talk is on the events page — linked below — with a fresh Q&A block.",
  thumbnail: thumbGenai,
  thumbnailAlt:
    "Abstract navy and gold artwork for the Introduction to Generative AI talk",
  videoUrl: demoClipA,
  duration: "52:14",
  category: "AI & Machine Learning",
  tags: ["AI", "Generative AI", "Talk", "Ethics"],
  speaker: "Dr. Nasreen Bibi",
  eventSlug: "introduction-to-generative-ai",
  publishedAt: "2026-04-18",
  featured: true,
  status: "published",
};

const videoBootcampFrontend: WatchVideo = {
  id: "vid-002",
  slug: "full-stack-bootcamp-frontend-session",
  title: "Full-Stack Bootcamp — Frontend Track, Session 3",
  excerpt:
    "The component-thinking session from the bootcamp's frontend track: breaking a design into components, managing state without tears, and shipping a polished interface.",
  description:
    "Amna Zareen's frontend-track sessions consistently get the highest feedback scores of the bootcamp, and session three is the one attendees describe as the moment \"it clicked\". The recording walks through taking a static page design and decomposing it into a component tree — where state lives, which components own it, and how props flow down.\n\nFrom there the session builds a small dashboard interface live: reusable card components, a filter bar, and list rendering with sensible keys. The final section covers the polish moves that separate student projects from production-looking interfaces — spacing rhythm, loading states, and empty states.\n\nThe accompanying exercise files are shared in the community feed for members.",
  thumbnail: thumbBootcamp,
  thumbnailAlt: "Abstract navy and gold artwork for the bootcamp frontend session",
  videoUrl: demoClipB,
  duration: "48:32",
  category: "Web Development",
  tags: ["React", "Components", "Frontend", "Workshop"],
  speaker: "Amna Zareen",
  eventSlug: "full-stack-web-development-bootcamp",
  publishedAt: "2026-07-18",
  status: "published",
};

const videoFirstModel: WatchVideo = {
  id: "vid-003",
  slug: "training-your-first-model-guided-walkthrough",
  title: "Training Your First Model — A Guided Walkthrough",
  excerpt:
    "Follow along as a complete beginner's notebook becomes a trained, evaluated model — the exact steps from the AI & ML workshop, recorded screen-first.",
  description:
    "This walkthrough records the workshop's central exercise in full: starting from an empty notebook and ending with a trained classifier and an honest evaluation of it. Wardah Malik keeps the pace deliberately slow — every import is explained, every variable is named for a reason, and the two places beginners usually get stuck are addressed head-on.\n\nThe session covers preparing a small dataset, choosing a sensible first model, training it, and — most importantly — reading the evaluation results without fooling yourself. A closing section shows how to spot the classic mistake of evaluating on data the model has already seen.\n\nNo prior machine learning experience is assumed; comfortable Python basics are enough to follow along.",
  thumbnail: thumbAiml,
  thumbnailAlt: "Abstract navy and gold artwork for the first-model walkthrough",
  videoUrl: demoClipA,
  duration: "41:05",
  category: "AI & Machine Learning",
  tags: ["Machine Learning", "Python", "Beginners", "Workshop"],
  speaker: "Wardah Malik",
  eventSlug: "ai-machine-learning-workshop",
  publishedAt: "2026-09-14",
  status: "published",
};

const videoCyberEssentials: WatchVideo = {
  id: "vid-004",
  slug: "cybersecurity-essentials-for-students",
  title: "Cybersecurity Essentials — Everyday Habits That Stop Most Attacks",
  excerpt:
    "Phishing, password reuse, and fake internship offers: the attacks students actually face, and the small habits that shut nearly all of them down.",
  description:
    "Shoaib Akbar's security session is built around a simple claim: students are not hacked with exotic techniques — they are phished, reused, and tricked. The recording dissects a real phishing email line by line, showing the tells that give it away before you even click.\n\nThe session then covers the four habits with the highest protection-per-minute: a password manager, multi-factor authentication done right, suspicious-link hygiene, and safe handling of internship-offer paperwork (a growing scam category the session explains in detail).\n\nIt closes with a short checklist to run against your own accounts tonight. Shared widely with non-members too — security is a community sport.",
  thumbnail: thumbCyber,
  thumbnailAlt: "Abstract navy and gold artwork for the cybersecurity essentials session",
  videoUrl: demoClipB,
  duration: "38:47",
  category: "Cybersecurity",
  tags: ["Security", "Phishing", "Best Practices", "Safety"],
  speaker: "Shoaib Akbar",
  eventSlug: "cybersecurity-awareness-session",
  publishedAt: "2026-06-10",
  status: "published",
};

const videoGitCollab: WatchVideo = {
  id: "vid-005",
  slug: "git-and-github-for-team-collaboration",
  title: "Git & GitHub for Team Collaboration",
  excerpt:
    "Branches, pull requests, and merge conflicts without fear — the Git workflows that make five-person student teams actually work.",
  description:
    "Most students meet Git as a solo tool — init, add, commit, push — and only discover the collaborative half during their first group project, usually in the middle of a merge conflict. This recording fixes the order of operations.\n\nIhsanullah Safi walks through the workflow real teams use: feature branches, small commits that tell a story, pull requests that reviewers can actually read, and a calm, repeatable process for resolving conflicts. The final section covers what NOT to commit — secrets, build output, and node_modules — and how .gitignore earns its place.\n\nThe session ends by opening one real pull request against the society's own demo repository, narrating every step.",
  thumbnail: thumbGit,
  thumbnailAlt: "Abstract navy and gold artwork for the Git collaboration session",
  videoUrl: demoClipA,
  duration: "55:21",
  category: "Programming",
  tags: ["Git", "GitHub", "Open Source", "Collaboration"],
  speaker: "Ihsanullah Safi",
  eventSlug: "git-and-open-source-workshop",
  publishedAt: "2026-02-26",
  status: "published",
};

const videoCareerPanel: WatchVideo = {
  id: "vid-006",
  slug: "data-science-career-talk-panel-recording",
  title: "Data Science Career Talk — Panel Recording",
  excerpt:
    "The full panel from the Data Science Career Talk: first roles, portfolios that got replies, and what the work is like two years in.",
  description:
    "Laiba Aslam moderated this panel with alumni and invited practitioners, and the recording captures the full hour — including the audience questions that made the session run long.\n\nThe panel covers the honest roadmap into data careers: which coursework mattered, which didn't, and how the first role was actually found. A recurring thread is the portfolio — three speakers independently describe the same principle, that one deep, well-documented project beats six tutorial clones. The final section answers the questions submitted anonymously beforehand, including salary expectations, graduate study, and the realities of remote work from Peshawar.\n\nSlides and the resource list from the panel are linked in the community feed.",
  thumbnail: thumbCareer,
  thumbnailAlt: "Abstract navy and gold artwork for the data science career panel",
  videoUrl: demoClipB,
  duration: "1:02:18",
  category: "Career",
  tags: ["Careers", "Data Science", "Alumni", "Panel"],
  speaker: "Laiba Aslam",
  eventSlug: "data-science-career-talk",
  publishedAt: "2026-08-30",
  status: "published",
};

const videoContestHighlights: WatchVideo = {
  id: "vid-007",
  slug: "annual-programming-contest-highlights",
  title: "Annual Programming Contest — Highlights",
  excerpt:
    "Six minutes from the contest floor: the start buzzer, four scoreboard changes, and the winning submission with nine minutes to spare.",
  description:
    "A short cut of the day's best moments — condensed from hours of footage into the parts people actually want to rewatch. The edit follows the leaderboard's story: the early leader, the mid-contest shuffle that put four teams within one problem of each other, and the final-hour push that decided the podium.\n\nWatch for the judges' verification pause near the end — the nine minutes between the winning submission and its confirmation were the longest of the day.\n\nFull problem sets are available to members in the community feed if you want to race the clock yourself.",
  thumbnail: thumbContest,
  thumbnailAlt: "Abstract navy and gold artwork for the programming contest highlights",
  videoUrl: demoClipB,
  duration: "6:42",
  category: "Community",
  tags: ["Contest", "Highlights", "Algorithms"],
  eventSlug: "annual-programming-contest",
  publishedAt: "2026-08-24",
  status: "published",
};

const videoAftermovie: WatchVideo = {
  id: "vid-008",
  slug: "hackathon-2026-aftermovie",
  title: "Annual Computing Hackathon 2026 — Aftermovie",
  excerpt:
    "Thirty-two hours compressed into four minutes: the theme reveal, the 2 AM debugging stares, and the demo that won it all.",
  description:
    "The official aftermovie of the Annual Computing Hackathon 2026. It opens with check-in and the theme reveal, follows teams through the grind — whiteboard plans, mentor interventions, the collective 2 AM silence — and closes with the final demos and the awards moment.\n\nShot and edited by the society's media volunteers. If it makes you want to be in next year's frame, registrations open on the events page one month before the hackathon.\n\nThe full photo album from the same weekend lives in the gallery.",
  thumbnail: thumbAftermovie,
  thumbnailAlt: "Abstract navy and gold artwork for the hackathon aftermovie",
  videoUrl: demoClipA,
  duration: "3:58",
  category: "Community",
  tags: ["Hackathon", "Aftermovie", "Community"],
  eventSlug: "annual-computing-hackathon",
  publishedAt: "2026-05-22",
  status: "published",
};

const videoReactComponent: WatchVideo = {
  id: "vid-009",
  slug: "build-your-first-react-component",
  title: "Build Your First React Component",
  excerpt:
    "A patient, zero-to-working tutorial: props, state, and events through one small, genuinely useful component — no starter template hand-waving.",
  description:
    "Written and recorded for members who have finished HTML/CSS/JS basics and want the React mental model before touching a full framework project. Mahnoor Shah builds one component — an interactive course-card — three times, each pass adding exactly one concept: first props, then state, then events and conditional rendering.\n\nThe deliberately incremental structure means you can jump in at any pass if a concept is already familiar. Everything runs in a plain editor and browser tab; no toolchain setup is required until the closing segment, which shows where the same component fits inside a real project.\n\nPair it with the blog series on component thinking for the design-theory side.",
  thumbnail: thumbReact,
  thumbnailAlt: "Abstract navy and gold artwork for the React component tutorial",
  videoUrl: demoClipB,
  duration: "27:16",
  category: "Web Development",
  tags: ["React", "Tutorial", "Beginners", "JavaScript"],
  speaker: "Mahnoor Shah",
  publishedAt: "2026-05-06",
  status: "published",
};

const videoPythonData: WatchVideo = {
  id: "vid-010",
  slug: "python-for-data-science-crash-course",
  title: "Python for Data Science — A Crash Course",
  excerpt:
    "NumPy, pandas, and one honest chart: the fastest sane path from a blank Python file to a real analysis, in under an hour.",
  description:
    "Danish Rehman compresses the society's most-requested study-circle topic into a single session: the working subset of Python that data work actually uses. The recording covers NumPy arrays and why they exist, pandas DataFrames for loading and cleaning a messy real dataset, and the five plots that answer most exploratory questions.\n\nThe crash-course framing is honest about scope — this is the tool belt, not the theory — and points to the follow-up resources for statistics fundamentals. The dataset used is a fictional but deliberately messy student-survey CSV, so every cleaning step mirrors something you will actually encounter.\n\nThe notebook and dataset ship with the community feed post.",
  thumbnail: thumbPython,
  thumbnailAlt: "Abstract navy and gold artwork for the Python data science crash course",
  videoUrl: demoClipA,
  duration: "44:53",
  category: "Programming",
  tags: ["Python", "Data Science", "pandas", "Tutorial"],
  speaker: "Danish Rehman",
  publishedAt: "2026-07-02",
  status: "published",
};

const videoPortfolioPanel: WatchVideo = {
  id: "vid-011",
  slug: "from-classroom-project-to-portfolio",
  title: "From Classroom Project to Portfolio — A Student Panel",
  excerpt:
    "Three students, three classroom projects, and the specific edits that turned each one into a portfolio piece recruiters took seriously.",
  description:
    "Hafiz Usman hosts this candid panel about the least-discussed skill in CS education: turning course assignments into portfolio work. Each panelist takes one real classroom project and walks through the transformation — writing a README that explains decisions, adding the one feature that makes it feel finished, deploying it so a stranger can click it, and recording a two-minute walkthrough video.\n\nThe panel is refreshingly specific about effort: none of the transformations took more than a weekend, and each panelist says exactly what they cut. A closing Q&A covers how to talk about coursework in interviews without the phrase \"just a class project\".\n\nCompanion article: \"From First Semester to First Internship\" on the society blog.",
  thumbnail: thumbPortfolio,
  thumbnailAlt: "Abstract navy and gold artwork for the portfolio panel",
  videoUrl: demoClipB,
  duration: "33:29",
  category: "Career",
  tags: ["Career", "Portfolio", "Projects", "Panel"],
  speaker: "Hafiz Usman",
  publishedAt: "2026-04-09",
  status: "published",
};

/* ---------------------------------------------------------------------------
 * Demo video — archived (proves the status gate AND the no-source fallback)
 * ------------------------------------------------------------------------- */

const videoOpenHouse: WatchVideo = {
  id: "vid-012",
  slug: "meet-the-society-open-house-2024",
  title: "Meet the Society — Open House 2024",
  excerpt:
    "The 2024 open-house introduction video, retired from the public archive when the society rebranded its media in 2026.",
  description:
    "This entry exists in the dataset to verify two behaviors at once: archived videos are excluded from public listings and direct URLs return \"Video Not Found\", and entries with no playable source render the poster-only fallback state. In production the CMS would simply never publish a video without a source — this fixture deliberately breaks that rule for testing.",
  thumbnail: thumbOpenHouse,
  thumbnailAlt: "Abstract navy and gold artwork for the 2024 open house video",
  duration: "8:15",
  category: "Community",
  tags: ["Community", "Open House", "Archive"],
  publishedAt: "2024-10-04",
  status: "archived",
};

export const WATCH_VIDEOS: WatchVideo[] = [
  videoGenai,
  videoBootcampFrontend,
  videoFirstModel,
  videoCyberEssentials,
  videoGitCollab,
  videoCareerPanel,
  videoContestHighlights,
  videoAftermovie,
  videoReactComponent,
  videoPythonData,
  videoPortfolioPanel,
  videoOpenHouse,
];

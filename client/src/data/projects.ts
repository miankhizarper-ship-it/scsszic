import type { Project } from "@/types";


import imgProjectCampusConnect from "@/assets/projects/project-campus-connect.jpg";
import imgProjectCropVision from "@/assets/projects/project-crop-vision.jpg";
import imgProjectCtfTrainer from "@/assets/projects/project-ctf-trainer.jpg";
import imgProjectDevPortfolio from "@/assets/projects/project-dev-portfolio.jpg";
import imgProjectEdupathPortal from "@/assets/projects/project-edupath-portal.jpg";
import imgProjectEventpulse from "@/assets/projects/project-eventpulse.jpg";
import imgProjectLegacyPortal from "@/assets/projects/project-legacy-portal.jpg";
import imgProjectPashtoNlp from "@/assets/projects/project-pashto-nlp.jpg";
import imgProjectQuizboard from "@/assets/projects/project-quizboard.jpg";
import imgProjectStudyScheduler from "@/assets/projects/project-study-scheduler.jpg";

export const PROJECTS: Project[] = [
{
  id: "proj-001",
  slug: "campus-connect",
  title: "Campus Connect",
  tagline: "One dashboard for every society announcement, deadline, and event on campus.",
  description: "Campus Connect started at the Annual Computing Hackathon as a frustrated sketch of 'why do I need five apps to know what's happening on campus?' Forty-eight hours later it was a working prototype, and the team kept building after the judging ended.\n\nThe app pulls society announcements, class deadlines, and event registrations into a single feed with per-society channels and a notification system that respects quiet hours. A role-based admin panel lets society officers publish without touching a database console.\n\nThe team's current focus is offline-first support — campus Wi-Fi is a real constraint — and a public API so other student societies can build their own integrations on top of the platform.",
  coverImage: imgProjectCampusConnect,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the Campus Connect project",
  category: "Web",
  technologies: [
    "React",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Express"
],
  status: "active",
  memberUsernames: [
    "ahmad-shah",
    "hira-anwar",
    "usman-ali"
],
  ownerUsername: "ahmad-shah",
  eventSlug: "annual-computing-hackathon",
  startedAt: "2026-05-16",
  updatedAt: "2026-09-18",
  tags: [
    "Hackathon",
    "Dashboard",
    "Notifications",
    "Student Life"
],
  featured: true,
},
{
  id: "proj-002",
  slug: "pashto-nlp-toolkit",
  title: "Pashto NLP Toolkit",
  tagline: "Open-source text processing for a language the big labs keep skipping.",
  description: "Modern NLP tooling assumes your language is English — tokenizers break, transliteration fails, and the corpora simply are not there. The Pashto NLP Toolkit is the team's answer: a Python library that handles Pashto-specific tokenization, normalization, and diacritic handling with the same ergonomics developers expect from mainstream tools.\n\nThe project grew out of Sana's research at SCS AI study circles and shipped its first stable release after a semester of weekend sprints. It now includes a clean pipeline API, a growing evaluation suite, and notebooks that let newcomers run their first end-to-end experiment in minutes.\n\nThe completed v1 release covers tokenization and morphological normalization; the roadmap document sketches the team's next target — a sentence-transformer baseline trained on collected news text.",
  coverImage: imgProjectPashtoNlp,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the Pashto NLP Toolkit project",
  category: "AI/ML",
  technologies: [
    "Python",
    "PyTorch",
    "Transformers",
    "FastAPI"
],
  status: "completed",
  memberUsernames: [
    "sana-durrani",
    "bilal-ahmed"
],
  ownerUsername: "sana-durrani",
  eventSlug: "ai-machine-learning-workshop",
  startedAt: "2025-11-03",
  updatedAt: "2026-06-22",
  tags: [
    "NLP",
    "Open Source",
    "Low-Resource Languages",
    "Research"
],
},
{
  id: "proj-003",
  slug: "ctf-trainer",
  title: "CTF Trainer",
  tagline: "Practice capture-the-flag challenges that teach, not just frustrate.",
  description: "The society's CTF tradition produced strong competitors but a brutal learning curve — first-timers bounced off challenges with no hints and no ladder. CTF Trainer gamifies the climb: guided categories from web basics to cryptography, tiered scoring, write-ups unlocked after solves, and a local Docker harness so nothing touches real infrastructure.\n\nBuilt by the alumni who founded the original competition and two members who came up through it, the platform now runs the society's intra-society qualifiers. Every challenge ships with a full walkthrough that is only revealed after a solve or a timeout, which quietly fixes the 'stuck for three hours' problem.\n\nActive work is focused on a team mode and an importer for open challenge archives.",
  coverImage: imgProjectCtfTrainer,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the CTF Trainer project",
  category: "Cybersecurity",
  technologies: [
    "Python",
    "Flask",
    "Docker",
    "PostgreSQL"
],
  status: "active",
  memberUsernames: [
    "bilal-mehsud",
    "bilal-ahmed",
    "owais-bangash"
],
  ownerUsername: "bilal-mehsud",
  eventSlug: "cybersecurity-awareness-session",
  startedAt: "2026-02-14",
  updatedAt: "2026-09-12",
  tags: [
    "CTF",
    "Security",
    "Docker",
    "Gamification"
],
},
{
  id: "proj-004",
  slug: "eventpulse",
  title: "EventPulse",
  tagline: "Registration, check-ins, and feedback for society events — without paper forms.",
  description: "EventPulse is the event tooling Hamza always wished existed: one link for registrations, a live check-in view for the door desk, and a feedback loop the organizing team actually reads. The society ran its last three bootcamps on it and cut check-in queues from twenty minutes to under five.\n\nThe stack is deliberately boring — a Next.js frontend, Prisma over PostgreSQL, and server-side validation everywhere — because the tool's job is to never fail during an event. A demo mode seeds realistic attendees so new organizers can rehearse before launch day.\n\nThe team's next milestone is multi-event analytics: which talk formats fill rooms, and which time slots students actually attend.",
  coverImage: imgProjectEventpulse,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the EventPulse project",
  category: "Community",
  technologies: [
    "Next.js",
    "TypeScript",
    "Prisma",
    "PostgreSQL"
],
  status: "active",
  memberUsernames: [
    "hamza-afridi",
    "rabia-sultan"
],
  ownerUsername: "hamza-afridi",
  eventSlug: "scs-developer-meetup-october",
  startedAt: "2025-09-28",
  updatedAt: "2026-09-08",
  tags: [
    "Event Tooling",
    "QR Check-in",
    "Analytics",
    "Society Ops"
],
},
{
  id: "proj-005",
  slug: "crop-vision",
  title: "CropVision",
  tagline: "A phone photo that tells a farmer what's eating the crop.",
  description: "CropVision is a computer-vision classifier that identifies common crop diseases from smartphone photos, built for the fields around Peshawar. What began as a hackathon weekend idea became Mahnoor's final-year project — and the department's best-project award — before turning into a funded research collaboration.\n\nThe pipeline pairs a fine-tuned TensorFlow vision model with an on-device inference mode, because farm connectivity cannot be assumed. An annotated image dataset collected during field visits is documented and versioned alongside the code.\n\nThe project is marked complete at v1, but the dataset and notebooks remain the starting point for anyone at SCS who wants to work on applied vision problems.",
  coverImage: imgProjectCropVision,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the CropVision project",
  category: "AI/ML",
  technologies: [
    "Python",
    "TensorFlow",
    "OpenCV",
    "Pandas"
],
  status: "completed",
  memberUsernames: [
    "mahnoor-ali",
    "ayesha-khan"
],
  ownerUsername: "mahnoor-ali",
  eventSlug: "annual-computing-hackathon",
  startedAt: "2025-05-17",
  updatedAt: "2026-04-30",
  tags: [
    "Computer Vision",
    "Agriculture",
    "Final-Year Project",
    "Hackathon"
],
},
{
  id: "proj-006",
  slug: "dev-portfolio-generator",
  title: "DevPortfolio Generator",
  tagline: "Answer a few prompts, get a portfolio site worth sending to recruiters.",
  description: "Every senior member kept telling juniors the same thing: 'you need a portfolio.' So the society built the tool that argues with the excuse. DevPortfolio Generator takes structured answers — projects, skills, links — and renders a fast, clean, deploy-ready portfolio site with sensible defaults from the society's own design system.\n\nUsman led the build with front-end standards from his studio work; Danish wired the templating and export pipeline. The completed release supports three layout themes, dark mode, and a one-command static export.\n\nThe project doubled as the curriculum for a semester of frontend workshops — every layout decision in the generator is written up as a teaching note.",
  coverImage: imgProjectDevPortfolio,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the DevPortfolio Generator project",
  category: "Developer Tools",
  technologies: [
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Vite"
],
  status: "completed",
  memberUsernames: [
    "usman-ghani",
    "danish-rehman"
],
  ownerUsername: "usman-ghani",
  startedAt: "2025-08-09",
  updatedAt: "2026-03-15",
  tags: [
    "Portfolios",
    "Templates",
    "Workshop Curriculum"
],
},
{
  id: "proj-007",
  slug: "study-circle-scheduler",
  title: "StudyCircle Scheduler",
  tagline: "Rotating weekly study circles that schedule themselves.",
  description: "SCS study circles live or die on attendance, and attendance lives or dies on reminders. The StudyCircle Scheduler gives each circle a page, a rotating host rota, and automated reminders that land where students actually look — with RSVPs feeding a simple heat map of which topics people show up for.\n\nFatima owned the product side and Hafiz handled the frontend after the pair sketched it during a delayed exam-season meeting. The system quietly runs the society's six weekly circles today.\n\nCurrent work: calendar sync and a host-prep checklist that emails the next presenter their materials a week ahead.",
  coverImage: imgProjectStudyScheduler,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the StudyCircle Scheduler project",
  category: "Community",
  technologies: [
    "React",
    "TypeScript",
    "Node.js",
    "Express"
],
  status: "active",
  memberUsernames: [
    "fatima-noor",
    "hafiz-usman"
],
  ownerUsername: "fatima-noor",
  startedAt: "2026-01-24",
  updatedAt: "2026-09-05",
  tags: [
    "Scheduling",
    "Reminders",
    "Study Circles"
],
},
{
  id: "proj-008",
  slug: "edupath-mentor-portal",
  title: "EduPath Mentor Portal",
  tagline: "The student side of the EduPath mentorship marketplace.",
  description: "EduPath pairs current students with working graduates; the Mentor Portal is the student-facing app where those matches happen. Students build a goal profile, browse mentor timelines, and book sessions — with structured prompts so a first conversation never starts with 'so… hi.'\n\nZainab brought the product vision from the startup she pitched at an SCS startup night; Ayesha translates it into React Native screens that work on the low-end Androids most students carry. Firebase keeps the backend operational at zero cost while the platform finds its footing.\n\nThe active milestone is session notes and follow-up nudges, which the first mentor cohort said they wanted more than any matching algorithm.",
  coverImage: imgProjectEdupathPortal,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the EduPath Mentor Portal project",
  category: "Education",
  technologies: [
    "React Native",
    "Firebase",
    "Expo",
    "TypeScript"
],
  status: "active",
  memberUsernames: [
    "zainab-bibi",
    "ayesha-noor"
],
  ownerUsername: "zainab-bibi",
  startedAt: "2026-03-07",
  updatedAt: "2026-09-20",
  tags: [
    "Mentorship",
    "Mobile",
    "Startup",
    "Education"
],
},
{
  id: "proj-009",
  slug: "quizboard",
  title: "QuizBoard",
  tagline: "Live quiz nights for study circles — one laptop, many phones.",
  description: "QuizBoard turns any society quiz night into a live game: the host's laptop projects the board, everyone's phone becomes a buzzer, and scores update in real time. Mahnoor built it solo after one too many evenings tallying paper answer sheets by hand.\n\nThe completed version supports question banks, timed rounds, and a room code join flow with no accounts required. A print-friendly answer-key export keeps hosts honest, and the whole thing runs from a single static deploy.\n\nIt has quietly become the default format for the society's fresher quizzes and revision-week reviews.",
  coverImage: imgProjectQuizboard,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the QuizBoard project",
  category: "Education",
  technologies: [
    "React",
    "TypeScript",
    "Tailwind CSS"
],
  status: "completed",
  memberUsernames: [
    "mahnoor-shah"
],
  ownerUsername: "mahnoor-shah",
  eventSlug: "full-stack-web-development-bootcamp",
  startedAt: "2025-12-06",
  updatedAt: "2026-05-11",
  tags: [
    "Quiz Games",
    "Real-time",
    "Solo Build"
],
},
{
  id: "proj-010",
  slug: "legacy-event-portal",
  title: "Legacy Event Portal",
  tagline: "The society's first website-era event portal, retired with honours.",
  description: "The Legacy Event Portal is the society's original PHP event listing — an archived fixture proving the projects status gate. It served the community for three years before EventPulse replaced it, and it must never appear in the public showcase: archived projects are excluded from listings, and direct links to /projects/legacy-event-portal resolve to a Not Found state.\n\nThe record is kept (and its owner, an archived member, deactivated) so future migrations can be tested against a realistic legacy document.",
  coverImage: imgProjectLegacyPortal,
  coverImageAlt: "Abstract navy and gold placeholder artwork representing the archived Legacy Event Portal project",
  category: "Web",
  technologies: [
    "PHP",
    "jQuery",
    "MySQL"
],
  status: "archived",
  memberUsernames: [
    "haroon-rashid"
],
  ownerUsername: "haroon-rashid",
  startedAt: "2023-03-02",
  updatedAt: "2025-06-19",
  tags: [
    "Legacy",
    "Archived"
],
},
];

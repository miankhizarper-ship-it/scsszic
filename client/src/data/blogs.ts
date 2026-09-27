import coverFeatured from "@/assets/media/blog-featured.jpg";
import coverHackathons from "@/assets/media/blog-hackathons.jpg";
import coverGit from "@/assets/media/blog-git.jpg";
import coverGenerativeAi from "@/assets/blogs/blog-generative-ai.jpg";
import coverFullStackApp from "@/assets/blogs/blog-full-stack-app.jpg";
import coverAiSoftwareDev from "@/assets/blogs/blog-ai-software-development.jpg";
import coverClassroom from "@/assets/blogs/blog-classroom-to-real-world.jpg";
import coverOpenSource from "@/assets/blogs/blog-open-source-contribution.jpg";
import coverApis from "@/assets/blogs/blog-understanding-apis.jpg";
import coverDataScience from "@/assets/blogs/blog-data-science.jpg";
import coverCybersecurity from "@/assets/blogs/blog-cybersecurity-habits.jpg";
import coverDesignSystem from "@/assets/blogs/blog-soft-skills-engineers.jpg";
import coverOrientation from "@/assets/media/gallery-orientation.jpg";
import { getAuthor } from "@/data/authors";
import type { Blog } from "@/types";

/**
 * MOCK DATA — Blog articles.
 *
 * Every article, author, and quote below is FICTIONAL demo content written
 * for design purposes only. They deliberately do not represent real people
 * or official positions of the Society of Computer Science / SZIC. The
 * article pages carry a visible demo disclaimer, and authors live in
 * `data/authors.ts`.
 *
 * Phase 5+: replaced by GET /api/blogs (MongoDB-backed, Cloudflare R2
 * media, admin CMS). Content is stored as structured blocks — the same
 * shape a future CMS would emit — so swapping the source never touches
 * the UI. Inline `[text](url)` links and `inline code` inside paragraph,
 * list-item, and quote text are rendered by BlogContent.
 *
 * Dates sit inside the September 2026 demo window shared with events data,
 * so refreshing the timeline is a data-only change.
 */

/** Categories offered as filters — centralized (spec §9), never hardcoded in pages. */
export const BLOG_CATEGORIES = [
  "AI & Machine Learning",
  "Web Development",
  "Software Engineering",
  "Data Science",
  "Cybersecurity",
  "Open Source",
  "Career & Community",
] as const;

/* ---------------------------------------------------------------------------
 * Demo articles — published
 * ------------------------------------------------------------------------- */

const blogInternshipRoadmap: Blog = {
  id: "blog-001",
  slug: "from-first-semester-to-first-internship",
  title: "From First Semester to First Internship: A CS Student's Roadmap",
  excerpt:
    "Four seniors from SCS share the exact steps they took — from choosing first-year electives to building portfolios that landed internships at leading tech companies.",
  coverImage: coverFeatured,
  coverImageAlt:
    "Abstract navy and gold artwork illustrating a student's roadmap from classroom to internship",
  author: getAuthor("hafiz-usman"),
  category: "Career & Community",
  tags: ["Career", "Internships", "Portfolio", "Beginners"],
  publishedAt: "2026-09-18",
  updatedAt: "2026-09-22",
  readingTime: 8,
  featured: true,
  status: "published",
  seo: {
    title: "From First Semester to First Internship: A CS Student's Roadmap",
    description:
      "A semester-by-semester roadmap from SCS seniors: courses that matter, projects that get interviews, and the portfolio habits that turn applications into offers.",
  },
  content: [
    {
      type: "paragraph",
      text: "Every computer science student hears the same advice — \"build projects, network, apply early\" — but almost nobody explains what that actually looks like, semester by semester. So we asked four SCS seniors (fictional personas assembled for this demo article) to walk through their real timelines: the electives they chose, the projects that got interviewers talking, and the mistakes they would skip if they started over.",
    },
    {
      type: "paragraph",
      text: "What follows is not a motivational post. It is a checklist you can open at the start of any semester and turn into a plan for the next sixteen weeks.",
    },
    { type: "heading", level: 2, text: "Year one: learn to learn" },
    {
      type: "paragraph",
      text: "The first year is about building the meta-skill everything else depends on: teaching yourself things that are not in the syllabus. All four seniors said the same thing in different words — the students who struggled later were not the ones with weaker grades, but the ones who only ever wrote code for assignments.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Pick one language and go deep instead of sampling five at the surface.",
        "Type every tutorial by hand — no copy-paste — so your fingers learn the syntax.",
        "Learn [Git](https://git-scm.com/doc) in week one, not the night before a team project is due.",
        "Write a short readme for every assignment, even the trivial ones. It becomes portfolio muscle memory.",
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "Start your portfolio in semester one",
      text: "Your first repo will embarrass you later — publish it anyway. Seniors consistently said recruiters asked more questions about their early, scrappy projects than their polished coursework.",
    },
    { type: "heading", level: 2, text: "Year two: projects with users" },
    {
      type: "paragraph",
      text: "Second year is when tutorials stop being enough. The goal shifts from \"can you write code\" to \"can you finish something other people use\". That means shipping small, finishing ugly, and iterating in public. A to-do app nobody uses teaches you less than a badly designed attendance tool that your class actually opens every week.",
    },
    {
      type: "quote",
      text: "My grades opened the file. My projects opened the conversation.",
      attribution: "One of our demo seniors, on what actually got interview replies",
    },
    {
      type: "paragraph",
      text: "This is also the year to join a society project or an open-source team, because real software is written with other people. You learn code review, merge conflicts, and the humility of reading someone else's architecture — none of which fit inside a solo assignment.",
    },
    { type: "heading", level: 2, text: "Year three: the internship sprint" },
    {
      type: "paragraph",
      text: "By third year the roadmap narrows to three parallel tracks. None of them are optional, and all of them take longer than you expect, which is exactly why they need to start in the first month — not after midterms.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Portfolio: three projects, each with a live demo, a clean readme, and a short \"what I'd do differently\" note. Depth beats quantity.",
        "Applications: treat the first ten applications as practice, not verdicts. Track every submission in a spreadsheet so follow-ups are systematic.",
        "Interview prep: one problem a day beats forty problems the week before. Narrate your solution out loud — silence reads as uncertainty.",
      ],
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Internships are not awarded to the best programmers — they are awarded to the most legible candidates. A recruiter spends minutes on your profile; every choice you make should make those minutes easier.",
    },
    { type: "heading", level: 3, text: "What we would skip entirely" },
    {
      type: "paragraph",
      text: "Collecting certificates without projects, learning five frameworks at a shallow depth, and rewriting the same portfolio from scratch every semester. The seniors were unanimous: one finished, deployed, documented project outweighs a folder of unfinished experiments — and it is completely fine to build it with friends.",
    },
    {
      type: "paragraph",
      text: "If you are reading this in your first year, the best next step is small: create the repository, write the readme, and push something today. The roadmap only works if it starts.",
    },
  ],
};

const blogGenerativeAi: Blog = {
  id: "blog-002",
  slug: "getting-started-with-generative-ai",
  title: "Getting Started with Generative AI: A Student's Field Guide",
  excerpt:
    "Text, images, code — generative models are reshaping how software gets made. A practical, jargon-light introduction for students who want to build with them.",
  coverImage: coverGenerativeAi,
  coverImageAlt:
    "Abstract navy and gold artwork with flowing shapes representing generative AI",
  author: getAuthor("bilal-ahmed"),
  category: "AI & Machine Learning",
  tags: ["AI", "Generative AI", "Machine Learning", "Beginners"],
  publishedAt: "2026-09-12",
  readingTime: 7,
  status: "published",
  seo: {
    description:
      "A practical introduction to generative AI for students: how the models work, what they are good and bad at, and how to build your first project responsibly.",
  },
  content: [
    {
      type: "paragraph",
      text: "Generative AI has moved from research papers to the apps in your pocket faster than almost any technology before it. If you are a student, you now share a campus with people using these tools to draft essays, generate art, review code, and build products — often without understanding what they are actually using.",
    },
    {
      type: "paragraph",
      text: "This guide is the orientation most tutorials skip: what generative models really do, where they shine, where they fail, and how to build your first small project without fooling yourself about the magic.",
    },
    { type: "heading", level: 2, text: "What \"generative\" actually means" },
    {
      type: "paragraph",
      text: "Traditional machine learning is mostly a judge: it looks at an input and predicts a label — spam or not spam, cat or dog. Generative models are authors. Trained on enormous amounts of text, images, or code, they learn statistical patterns well enough to produce new sequences that resemble what they studied. A language model does not \"know\" facts the way a database stores them; it predicts, token by token, what a plausible continuation looks like.",
    },
    {
      type: "paragraph",
      text: "That single sentence explains most of what students find surprising about these systems — both the fluency and the confident mistakes.",
    },
    { type: "heading", level: 2, text: "Your first project: a tiny study buddy" },
    {
      type: "paragraph",
      text: "The fastest way to understand generative AI is to call a model API from a language you already know. The example below (written as a generic Python sketch — check your provider's docs for the exact client) sends a prompt and prints the completion:",
    },
    {
      type: "code",
      language: "python",
      caption: "A minimal prompt → response loop with any hosted language model",
      code: `def ask_study_buddy(question: str) -> str:
    """Turn a rough question into a focused study prompt."""
    prompt = (
        "You are a patient tutor for first-year CS students. "
        "Explain the concept below in three short paragraphs, "
        "then give one practice question.\\n\\n"
        f"Question: {question}"
    )
    response = model_client.generate(
        prompt=prompt,
        temperature=0.3,   # lower = more focused, higher = more creative
        max_tokens=400,
    )
    return response.text


print(ask_study_buddy("What is a hash table?"))`,
    },
    {
      type: "paragraph",
      text: "Notice what the engineering actually is: not training a model, but designing the prompt — the context, the constraints, the format. This is the day-one skill of the field, and it rewards exactly the same clarity you practice when writing good bug reports.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Prompt like a spec writer",
      text: "The best prompts read like good requirements: audience, format, constraints, and an example. If a prompt is ambiguous, the model resolves the ambiguity in the least helpful way possible.",
    },
    { type: "heading", level: 2, text: "What these models are bad at" },
    {
      type: "paragraph",
      text: "Enthusiastic demos hide the failure modes, so here is the honest list. Treat every output as a draft from an eager intern: usually useful, occasionally wrong, never accountable.",
    },
    {
      type: "list",
      items: [
        "Facts and citations — models can fabricate plausible-sounding sources. Verify everything you plan to repeat.",
        "Fresh information — a model only knows what was in its training data, nothing after.",
        "Exact arithmetic and counting — for anything that must be precise, write real code instead of asking.",
        "Self-knowledge — models cannot reliably explain why they produced a given answer.",
      ],
    },
    { type: "heading", level: 2, text: "Using AI without outsourcing your education" },
    {
      type: "paragraph",
      text: "The uncomfortable truth is that struggle is where learning happens. A model that hands you the finished assignment removes exactly the part that makes you better. The students getting real value use generative tools the way senior engineers do: as a sparring partner, a code reviewer, and a starting-point generator — not an answer machine.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Generative models predict plausible continuations; they do not understand your problem. Let them accelerate your drafts, and keep the judgment — and the learning — on your side of the keyboard.",
    },
    {
      type: "paragraph",
      text: "If you want a first weekend project: build the study buddy above, then add streaming responses and a chat history. You will hit state management, rate limits, and prompt drift — a genuinely modern stack, one small feature at a time.",
    },
  ],
};

const blogFullStackApp: Blog = {
  id: "blog-003",
  slug: "building-your-first-full-stack-application",
  title: "Building Your First Full-Stack Application (Without Drowning)",
  excerpt:
    "Frontend, backend, database, deployment — the full stack looks terrifying from the shore. Here is a sane order to learn it, and a project plan that fits one semester.",
  coverImage: coverFullStackApp,
  coverImageAlt:
    "Abstract navy and gold artwork with layered blocks representing a full-stack application",
  author: getAuthor("danish-rehman"),
  category: "Web Development",
  tags: ["Web Development", "JavaScript", "Beginners", "Projects"],
  publishedAt: "2026-09-05",
  readingTime: 9,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "\"Full-stack developer\" sounds like a job title invented to scare students, and the first attempt usually justifies the fear: a frontend that talks to a backend that talks to a database, each layer failing for different reasons. The trick is not talent — it is order of operations. Build the layers in an order where each one is testable before the next exists.",
    },
    { type: "heading", level: 2, text: "The order that actually works" },
    {
      type: "paragraph",
      text: "Most students start with the database schema, get bored, and quit. Start where the feedback loop is shortest — what you can see — and add layers only when the current one bores you:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "UI first, with fake data: build the screens your app needs using hard-coded arrays. You will change your mind about the design five times — do it before there is a backend to migrate.",
        "One real API endpoint: replace a single fake array with a fetch to your own server. Now you are full-stack.",
        "Persistence: add a database behind that endpoint. One table is enough. Migrations come later, migrations are a later problem.",
        "Wire the rest of the screens, endpoint by endpoint, resisting the urge to refactor everything between features.",
        "Deploy embarrassingly early. A rough app on a real URL teaches more than a polished app on localhost.",
      ],
    },
    {
      type: "callout",
      variant: "note",
      title: "A one-semester project that fits",
      text: "A club event board: list events, view details, RSVP with your name, and an admin page to add events. Four screens, two tables, one auth flow you can copy a hundred patterns from.",
    },
    { type: "heading", level: 2, text: "The shape of a tiny API" },
    {
      type: "paragraph",
      text: "Your backend does not need to be impressive; it needs to be boring and correct. The sketch below is the whole pattern — a router that reads, validates, and responds — whether you write it in Express, Flask, or anything else:",
    },
    {
      type: "code",
      language: "javascript",
      caption: "One endpoint, the full lifecycle: read, validate, query, respond",
      code: `// POST /api/events — create an event (Express-style sketch)
app.post("/api/events", async (req, res) => {
  const { title, date, capacity } = req.body ?? {};

  // 1. Validate before touching the database
  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: "Title is required (min 3 chars)" });
  }
  if (!Date.parse(date)) {
    return res.status(400).json({ error: "Date must be a valid date" });
  }

  // 2. Persist — one table, no cleverness
  const event = await db.event.create({
    data: { title: title.trim(), date: new Date(date), capacity: capacity ?? null },
  });

  // 3. Answer with the created resource
  res.status(201).json(event);
});`,
    },
    {
      type: "paragraph",
      text: "Every endpoint you will ever write is a variation on this shape: read the input, refuse bad input, do the one thing, answer clearly. Frameworks change; the shape does not.",
    },
    { type: "heading", level: 3, text: "Where beginners actually get stuck" },
    {
      type: "paragraph",
      text: "It is rarely the code. It is the seams: CORS errors when the frontend calls the backend, timezones when the database stores a date, and environment variables when the app that worked locally meets a real server. Budget time for the seams and they become routine instead of demoralizing.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Ship in vertical slices — one screen talking to one real endpoint — instead of building layers in isolation. Every week ends with a working app, just slightly more capable than last week's.",
    },
    {
      type: "paragraph",
      text: "When it is deployed and your classmates are using it, write down the three things that broke. That list — not the tech stack — is your actual first full-stack education.",
    },
  ],
};

const blogCybersecurity: Blog = {
  id: "blog-004",
  slug: "cybersecurity-habits-every-student-needs",
  title: "Cybersecurity Habits Every Student Needs (Before It's Urgent)",
  excerpt:
    "Most student accounts are compromised through boring mistakes, not movie hacking. A short, unglamorous checklist that puts you ahead of ninety percent of targets.",
  coverImage: coverCybersecurity,
  coverImageAlt:
    "Abstract navy and gold artwork with a shield motif representing personal cybersecurity",
  author: getAuthor("mahnoor-shah"),
  category: "Cybersecurity",
  tags: ["Security", "Privacy", "Beginners", "Career"],
  publishedAt: "2026-08-28",
  readingTime: 6,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "Nobody hacks students in movies without montages and green text. In reality, your accounts are far more likely to fall to a reused password, a spoofed login page, or an unattended laptop than to any technical wizardry. The good news is that the boring defenses work — and as a future software professional, practicing them is also career hygiene. Employers notice how you treat your own credentials.",
    },
    { type: "heading", level: 2, text: "The five-habit foundation" },
    {
      type: "paragraph",
      text: "If you do nothing else from this article, do these five. They take one evening to set up and they neutralize the attacks that actually claim student accounts:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Use a password manager and let it generate a unique password for every account. Memory is not a security system.",
        "Turn on multi-factor authentication everywhere it exists — authenticator app first, SMS as the fallback, never the plan.",
        "Update your phone, laptop, and browser promptly. Most updates patch holes that are already being exploited in the wild.",
        "Pause before every login page and ask how you got there. Arrived from an unexpected email link? Navigate to the site yourself instead.",
        "Lock your screens — laptop and phone, every time. Most campus incidents are crimes of convenience, not skill.",
      ],
    },
    {
      type: "callout",
      variant: "note",
      title: "Phishing has a tell",
      text: "Urgency plus unusual payment or login requests is the signature. \"Your account will be deleted in 24 hours\" is not an IT policy; it is a script, and it works because it skips your skepticism.",
    },
    { type: "heading", level: 2, text: "Think like the attacker for ten minutes" },
    {
      type: "paragraph",
      text: "A exercise worth doing once per semester: open your own public profiles and try to answer your own security questions. Where were you born? Your first school? If the answers are on your social media, your recovery flows are only as strong as your oldest post. Shuffle security answers into nonsense you store in the password manager, same as passwords.",
    },
    {
      type: "quote",
      text: "Security is not a product you install once. It is a handful of habits repeated until they are boring.",
      attribution: "A recurring theme from our (fictional) campus security sessions",
    },
    { type: "heading", level: 3, text: "For CS students specifically" },
    {
      type: "paragraph",
      text: "Your repos, servers, and API keys deserve the same discipline. Never commit secrets — scan your history once and you will be surprised. Use `.env` files excluded from version control, rotate any key that has ever appeared in a screenshot, and treat every cloud free tier as a real account with a real bill attached. For a deeper dive, the [OWASP Top Ten](https://owasp.org/www-project-top-ten/) is the map of the holes most applications actually suffer from.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Attackers pick easy targets, not important ones. Unique passwords, real MFA, and a two-second pause before logging in put you ahead of the overwhelming majority of victims — and model the habits you will one day ask users to follow.",
    },
  ],
};

const blogRoleOfAi: Blog = {
  id: "blog-005",
  slug: "the-role-of-ai-in-modern-software-development",
  title: "The Role of AI in Modern Software Development",
  excerpt:
    "AI assistants now write real code in real teams. What that changes for developers — and the judgment it makes more valuable, not less.",
  coverImage: coverAiSoftwareDev,
  coverImageAlt:
    "Abstract navy and gold artwork with circuit-like lines representing AI-assisted development",
  author: getAuthor("bilal-ahmed"),
  category: "AI & Machine Learning",
  tags: ["AI", "Software Engineering", "Career", "Tools"],
  publishedAt: "2026-08-21",
  readingTime: 6,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "Somewhere between novelty and normal, AI assistants crossed into everyday engineering. They autocomplete functions, draft tests, explain legacy code, and write the commit message you were avoiding. Students asking whether they should learn to code are asking the wrong question — the real question is which parts of the job changed, and which parts became more valuable.",
    },
    { type: "heading", level: 2, text: "What AI is genuinely good at" },
    {
      type: "paragraph",
      text: "Used honestly, assistants compress the mechanical layer of development. The gains are real and worth adopting deliberately rather than begrudgingly:",
    },
    {
      type: "list",
      items: [
        "Boilerplate and glue code — the configuration, schemas, and plumbing that follow known patterns.",
        "First-draft tests — a decent starting point that a human must still sharpen into a real specification.",
        "Code comprehension — summarizing an unfamiliar file or explaining an error is where they shine brightest.",
        "Repetitive refactors — renames and mechanical migrations, supervised by someone who can review the diff.",
      ],
    },
    { type: "heading", level: 2, text: "What stays stubbornly human" },
    {
      type: "paragraph",
      text: "Every experienced team has learned the same lesson the same way: the model does not know what your software is for. Deciding what to build, for whom, and what \"correct\" means under real constraints — that judgment is the job. AI accelerates implementation; it does not attend your user interviews, feel the pain of a bad interface, or carry responsibility for a production outage.",
    },
    {
      type: "quote",
      text: "The tool got faster at writing code. It did not get better at deciding what the code should do.",
    },
    {
      type: "paragraph",
      text: "There is also a subtle trap for learners. When an assistant completes your thought before you finish thinking it, you skip the productive struggle where understanding forms. Seniors can lean on the tool because they can already verify its output — students who copy what they cannot evaluate are building on sand.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "The verification habit",
      text: "Treat every AI suggestion like a pull request from an eager contributor you cannot hold accountable: read the diff, question the edge cases, and only merge what you could have written yourself — eventually, if not today.",
    },
    { type: "heading", level: 3, text: "How to prepare as a student" },
    {
      type: "paragraph",
      text: "Use the assistants — but grade yourself honestly. Try the problem first, then compare your solution with the AI's, and make sure you can explain every difference. Build the unglamorous skills the tools presuppose: reading specs carefully, decomposing problems, testing assumptions, and communicating clearly with the humans on your team.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "AI changed the cost of writing code, not the meaning of engineering. Learn deeply enough to verify, judge, and decide — the parts of the craft that no autocomplete performs.",
    },
  ],
};

const blogUnderstandingApis: Blog = {
  id: "blog-006",
  slug: "understanding-apis-as-a-developer",
  title: "Understanding APIs as a Developer",
  excerpt:
    "Almost every app you use is a conversation between programs. A clear-eyed tour of APIs — requests, responses, and the contract in between.",
  coverImage: coverApis,
  coverImageAlt:
    "Abstract navy and gold artwork with connecting nodes representing APIs",
  author: getAuthor("usman-ali"),
  category: "Web Development",
  tags: ["APIs", "Web Development", "Beginners", "REST"],
  publishedAt: "2026-08-14",
  readingTime: 7,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "When a weather app shows tomorrow's forecast, it did not measure the atmosphere. It asked another computer for the data and displayed the answer. That question-and-answer loop is an API — Application Programming Interface — and once you can read one, half the internet turns from magic into plumbing.",
    },
    { type: "heading", level: 2, text: "A contract, not a handshake" },
    {
      type: "paragraph",
      text: "An API is a published contract: here are the requests I accept, here is the data I will send back, and here is what happens when you break the rules. The client and server never see each other's internals — they only honor the contract. That separation is why a mobile app and a website can share one backend, and why a well-designed API outlives every frontend that consumes it.",
    },
    {
      type: "paragraph",
      text: "Most web APIs you will meet follow REST conventions, which map everyday verbs onto HTTP methods. Read the table once and you can navigate any decent API documentation:",
    },
    {
      type: "list",
      items: [
        "GET — read something. Safe to repeat; should change nothing on the server.",
        "POST — create something, or trigger an action that has side effects.",
        "PUT / PATCH — update something, wholly or partially.",
        "DELETE — remove something. Status codes answer back: 200 success, 201 created, 400 your mistake, 401 unauthenticated, 404 not found, 500 their mistake.",
      ],
    },
    { type: "heading", level: 2, text: "Talking to a real API" },
    {
      type: "paragraph",
      text: "Below is the client-side half of the contract in plain JavaScript — fetch a resource, check the response before trusting it, and handle the failure path on purpose:",
    },
    {
      type: "code",
      language: "javascript",
      caption: "Fetch, check status, parse, and fail loudly when the contract breaks",
      code: `async function loadEvents() {
  const response = await fetch("/api/events");

  // Never assume success — the status code is part of the contract
  if (!response.ok) {
    throw new Error(\`API error: \${response.status} \${response.statusText}\`);
  }

  const events = await response.json();
  return events.filter((event) => event.status === "upcoming");
}

loadEvents()
  .then(renderEvents)
  .catch((error) => showErrorBanner(error.message));`,
    },
    {
      type: "callout",
      variant: "tip",
      title: "Read the error before the docs",
      text: "When an API call misbehaves, open the network tab before guessing: the status code and response body usually tell you exactly which side of the contract you violated.",
    },
    { type: "heading", level: 3, text: "Designing your own" },
    {
      type: "paragraph",
      text: "You will eventually build APIs, not just consume them. Keep the contract predictable: plural nouns for resources (`/events`, not `/getEvents`), meaningful status codes instead of 200-everything, validation with honest error messages, and versioning when you must change shape. A good API is the one the next developer can use without calling you.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "An API is a promise about shapes and behaviors — nothing more, nothing less. Learn to read requests and responses precisely, and the boundary between programs stops being mysterious.",
    },
    {
      type: "paragraph",
      text: "A good first exercise: pick a free public API, fetch it from the browser console, and render three fields on a plain HTML page. You will have touched requests, JSON, status codes, and error handling — the whole loop — in an afternoon.",
    },
  ],
};

const blogOpenSourceContribution: Blog = {
  id: "blog-007",
  slug: "open-source-your-first-contribution",
  title: "Open Source: Your First Contribution",
  excerpt:
    "The gap between \"I should contribute to open source\" and an actual merged pull request is smaller than it looks. A step-by-step path past the scary parts.",
  coverImage: coverOpenSource,
  coverImageAlt:
    "Abstract navy and gold artwork with branching paths representing open-source collaboration",
  author: getAuthor("usman-ali"),
  category: "Open Source",
  tags: ["Open Source", "Git", "GitHub", "Career"],
  publishedAt: "2026-08-07",
  readingTime: 8,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "Every developer carries a quiet guilt about open source: we all benefit from it, and most of us have never given back. The blockers are rarely skill — they are process fear. Which repository? What counts as a real contribution? What if maintainers reject the pull request? This article is the walk-through I wish someone had handed me: small, concrete, and rejection-tolerant.",
    },
    { type: "heading", level: 2, text: "Pick a project like a gardener, not a tourist" },
    {
      type: "paragraph",
      text: "The single biggest mistake is choosing by fame. Huge projects are wonderful, but their issues are contested terrain. Look instead for the signs of a healthy garden — evidence that newcomers are welcomed and pull requests actually get reviewed:",
    },
    {
      type: "list",
      items: [
        "A CONTRIBUTING.md file that explains the process in plain language.",
        "Issues labeled `good first issue` or `help wanted` — and some closed recently, not just accumulated.",
        "Pull requests from strangers that received kind, substantive review within weeks.",
        "A README recent enough that the setup instructions probably still work.",
      ],
    },
    {
      type: "callout",
      variant: "note",
      title: "Documentation is a real contribution",
      text: "Typo fixes, clearer setup steps, and translated error explanations are merged faster than features and help every user after you. Nobody worth respecting will mock a docs PR — the rudest reviewers are a tiny, visible minority.",
    },
    { type: "heading", level: 2, text: "The anatomy of a first pull request" },
    {
      type: "paragraph",
      text: "Once you have picked an issue, the mechanics are the same almost everywhere. This is the loop, start to merged:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Comment on the issue: \"I'd like to work on this — does the approach in short summary sound right?\" Thirty seconds of coordination can save a week of wrong direction.",
        "Fork the repository and clone your fork, then create a branch named after the change: `fix/typo-in-install-docs`.",
        "Make the smallest change that resolves the issue. Resist drive-by refactors; reviewers review what you said you would do.",
        "Run the project's tests and linter locally. CI failing on style is the most preventable disappointment in open source.",
        "Open the pull request with a clear title, a link to the issue, and screenshots when the change is visual.",
        "Respond to review comments promptly and without ego — iterate until merged, then celebrate properly.",
      ],
    },
    { type: "heading", level: 3, text: "Reading a codebase without drowning" },
    {
      type: "paragraph",
      text: "Contributing means navigating someone else's architecture. Start from the entry points — the router, the CLI, the index file — and follow one feature end to end. Search for the error message or UI string you want to change and walk backwards to the logic. You do not need to understand the whole codebase to fix one seam of it; nobody does.",
    },
    {
      type: "quote",
      text: "Nobody merges your first pull request because you are brilliant. They merge it because it is small, clear, and correct — which is exactly what you can control.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Pick a healthy small project, claim one labeled issue, and ship the smallest correct change. One merged PR permanently converts open source from an aspiration into a habit.",
    },
    {
      type: "paragraph",
      text: "When your first PR merges, the second is already easier — you know the project, the process, and the reviewer. The [GitHub Skills](https://skills.github.com/) courses are a gentle place to rehearse the mechanics before you do it live.",
    },
  ],
};

const blogDataScience: Blog = {
  id: "blog-008",
  slug: "a-practical-introduction-to-data-science",
  title: "A Practical Introduction to Data Science",
  excerpt:
    "Beyond the buzzword: what data science work actually looks like, the vocabulary you need first, and a first notebook you can finish this weekend.",
  coverImage: coverDataScience,
  coverImageAlt:
    "Abstract navy and gold artwork with chart-like shapes representing data science",
  author: getAuthor("mahnoor-shah"),
  category: "Data Science",
  tags: ["Data Science", "Python", "Pandas", "Beginners"],
  publishedAt: "2026-07-30",
  readingTime: 10,
  status: "published",
  seo: {
    description:
      "A practical, jargon-light introduction to data science for CS students: the workflow, the core vocabulary, and a first pandas notebook you can finish in a weekend.",
  },
  content: [
    {
      type: "paragraph",
      text: "Data science has a public-relations problem: the name promises insight, the job postings list forty technologies, and the tutorials start with linear algebra. In practice, most real data work is a humbler loop — get the data, look at it carefully, fix what is broken, measure something honestly, and explain it to someone who was not there. That loop is learnable in weeks, and it is one of the most transferable skill sets in computing.",
    },
    { type: "heading", level: 2, text: "The workflow that hides behind the title" },
    {
      type: "paragraph",
      text: "Ask any working data scientist how they spend their week and the answers converge on the same unglamorous distribution — which is exactly why it is worth knowing before you start learning tools:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Question first: decide what decision the analysis should inform. \"Explore the data\" is not a question; \"did our event attendance drop after we moved venues\" is.",
        "Collect: pull data from CSVs, databases, or APIs. Boring, non-negotiable, and where projects actually live or die.",
        "Clean: handle missing values, duplicated rows, impossible dates, and inconsistent categories. Expect this to dominate.",
        "Explore: distributions, correlations, group summaries — the visual detective work that surfaces what the question should have asked.",
        "Model (only if needed): a baseline beat a fancy model in most student projects. Start with the dumbest thing that could work.",
        "Communicate: a chart a dean understands beats a metric a statistician admires. The analysis is finished when the decision-maker changes their mind.",
      ],
    },
    { type: "heading", level: 2, text: "A first notebook, in fifteen lines" },
    {
      type: "paragraph",
      text: "The fastest honest start is [pandas](https://pandas.pydata.org/docs/) — the spreadsheet-with-superpowers library for Python. This small notebook-shaped snippet is the skeleton of almost every exploratory analysis you will ever write:",
    },
    {
      type: "code",
      language: "python",
      caption: "The universal exploratory loop: load, inspect, summarize, group",
      code: `import pandas as pd

# 1. Load — every CSV is a DataFrame
df = pd.read_csv("event_attendance.csv")

# 2. Inspect before you trust
print(df.head())          # what do the rows even look like?
print(df.info())          # which columns have missing values?
print(df.describe())      # sane ranges, or surprises?

# 3. Clean the one thing that will definitely be broken
df["date"] = pd.to_datetime(df["date"], errors="coerce")
df = df.dropna(subset=["date"])

# 4. Ask one honest question of the data
attendance_by_month = (
    df.groupby(df["date"].dt.to_period("M"))["attendees"]
    .sum()
    .sort_index()
)
print(attendance_by_month)`,
    },
    {
      type: "callout",
      variant: "tip",
      title: "Look at the data before you compute on it",
      text: "Every professional has a story about a \"great result\" that was a duplicate row, a unit mismatch, or a column of dates parsed as strings. `head()`, `info()`, `describe()` — every single time, before any cleverness.",
    },
    { type: "heading", level: 3, text: "Vocabulary you actually need" },
    {
      type: "paragraph",
      text: "You do not need the whole glossary on day one. Four distinctions carry you surprisingly far: population versus sample, correlation versus causation, training versus test data, and overfitting versus a genuinely general pattern. Almost every analytical mistake you will watch someone make is one of those four wearing a costume.",
    },
    {
      type: "quote",
      text: "Data science is mostly skepticism with a keyboard.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Start with a question, clean more than you expect, and earn the right to model by exploring first. Tools rotate — the loop of question, evidence, honesty, and explanation is the durable skill.",
    },
    {
      type: "paragraph",
      text: "Your weekend assignment: find any public dataset that genuinely interests you — campus, cricket, climate — and run the notebook skeleton above on it. One honest chart with one clear sentence of explanation is a complete, legitimate first data science project.",
    },
  ],
};

const blogGitGithub: Blog = {
  id: "blog-009",
  slug: "getting-started-with-git-and-github",
  title: "Getting Started with Git & GitHub: A Practical Guide",
  excerpt:
    "Version control is the first professional tool every student should master. A step-by-step starter guide to the workflow you will use every single day.",
  coverImage: coverGit,
  coverImageAlt:
    "Abstract navy and gold artwork with branching commit lines representing Git version control",
  author: getAuthor("usman-ali"),
  category: "Open Source",
  tags: ["Git", "GitHub", "Beginners", "Tools"],
  publishedAt: "2026-07-22",
  readingTime: 6,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "Ask a room of developers which tool improved their work most, and Git wins more polls than any language. It is also the tool students most often postpone — until the first group project, when three people edit the same file and someone's week of work vanishes. This guide is the minimum viable Git: the small set of commands that covers ninety percent of daily use.",
    },
    { type: "heading", level: 2, text: "The mental model: snapshots, not files" },
    {
      type: "paragraph",
      text: "Git is easiest to learn as a camera, not a filing cabinet. Your project is a folder; every commit is a snapshot of the entire project at one moment, with a note explaining what changed. Because snapshots are immutable, you can always return to any of them — which is what makes branching safe and experimentation cheap.",
    },
    {
      type: "paragraph",
      text: "The daily loop fits on an index card:",
    },
    {
      type: "code",
      language: "bash",
      caption: "The Git loop you will repeat thousands of times",
      code: `# See what changed before doing anything
git status
git diff

# Stage and snapshot with a message your future self will understand
git add .
git commit -m "Add form validation to the signup page"

# Share your work and pick up everyone else's
git push
git pull`,
    },
    {
      type: "callout",
      variant: "tip",
      title: "Commit messages are documentation",
      text: "\"fix\" tells nobody anything. \"Fix signup crash when email contains spaces\" saves an archaeology expedition six months later. Write every message for a reader you cannot see.",
    },
    { type: "heading", level: 2, text: "Git vs GitHub" },
    {
      type: "paragraph",
      text: "The confusion that trips every beginner: Git is the version-control tool that runs on your machine; GitHub is a website that hosts Git repositories and adds collaboration on top — pull requests, issues, reviews. You can use Git perfectly well with no GitHub at all, but the pair together is how modern teams — and open source — function.",
    },
    {
      type: "list",
      items: [
        "Repository — a project folder whose history Git tracks.",
        "Clone — download a repository with its full history.",
        "Branch — a parallel line of development; the main branch stays stable while you experiment.",
        "Pull request — a proposal saying \"here is my branch, please review and merge it\".",
        "Merge — combining a branch back into another; conflicts are Git asking you to resolve overlapping edits.",
      ],
    },
    { type: "heading", level: 3, text: "Recovering from the classic mistakes" },
    {
      type: "paragraph",
      text: "You will commit too early, commit the wrong file, and mess up a merge — everyone does. Before panicking, run `git status`, then `git log` — the answer is usually one command away, and Git rarely destroys work it has a snapshot of. The [official Git book](https://git-scm.com/book/en/v2) is free, genuinely readable, and covers every recovery scenario you will meet this year.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Learn status → add → commit → push as one reflex, commit small with honest messages, and let branches absorb the risk of experimenting. Fluency comes from using it daily — starting today.",
    },
  ],
};

const blogClassroomToRealWorld: Blog = {
  id: "blog-010",
  slug: "from-classroom-projects-to-real-world-software",
  title: "From Classroom Projects to Real-World Software",
  excerpt:
    "Assignments are graded in days and forgotten; real software runs for years. The mindset shifts that turn classroom code into something people rely on.",
  coverImage: coverClassroom,
  coverImageAlt:
    "Abstract navy and gold artwork with a bridge motif connecting classroom work to production software",
  author: getAuthor("danish-rehman"),
  category: "Software Engineering",
  tags: ["Software Engineering", "Projects", "Career", "Learning"],
  publishedAt: "2026-07-15",
  readingTime: 7,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "A classroom project and a real product differ in exactly one property: who suffers when it breaks. Assignments are read by one grader, once, with forgiveness built in. Real software is used by strangers on bad days, at 2 a.m., on a phone from 2018 — and it keeps running long after its authors have moved on. Bridging that gap is not about learning more frameworks; it is about absorbing a handful of uncomfortable shifts in responsibility.",
    },
    { type: "heading", level: 2, text: "Shift one: code is read more than it is written" },
    {
      type: "paragraph",
      text: "Assignments optimize for working once during a demo. Real code optimizes for being understood next year by someone who does not know you. That changes daily decisions in quiet ways: names that explain intent, functions that fit on one screen, and a README written for the confused stranger who is usually you, three weeks later.",
    },
    {
      type: "list",
      items: [
        "Name things for what they mean, not what they are — `daysUntilDeadline`, not `d2`.",
        "Keep functions single-purpose; when you need a paragraph comment to explain a function, split it.",
        "Delete dead code. Version control remembers it so your codebase does not have to.",
        "Make the boring choice by default — conventions exist so teams spend attention on real problems.",
      ],
    },
    {
      type: "quote",
      text: "Your code has two audiences: the machine that runs it and the human who inherits it. Only one of them reads the comments.",
    },
    { type: "heading", level: 2, text: "Shift two: users break things you never imagined" },
    {
      type: "paragraph",
      text: "Assignment data is politely formatted; user data is chaos with a typewriter. The first time a real person types their name into a date field, you learn validation the permanent way. Production thinking means handling the failure paths on purpose: what happens when the network drops mid-request, the file is empty, or two people submit the same form simultaneously?",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Write the error paths first",
      text: "For every input and every network call, write down what should happen when it fails — before writing the happy path. The happy path is never the interesting one in production.",
    },
    { type: "heading", level: 3, text: "Shift three: shipping is the beginning" },
    {
      type: "paragraph",
      text: "In class, submission ends the project. In the real world, deployment starts the relationship: logs to read, errors to fix, feedback to fold in, and version two arriving whether or not you planned it. This is why real teams care so much about tests and monitoring — they are how software stays maintainable after the authors' attention moves on.",
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "Treat one personal project like a product: document it, handle its failures, keep it deployed, and iterate from real feedback. One maintained project teaches more engineering than five abandoned ones.",
    },
    {
      type: "paragraph",
      text: "The encouraging part: nothing above requires permission or a job title. Pick your best classroom project this semester and give it the treatment — clean names, honest errors, a real README, a live URL. That single artifact will say more about you than any transcript line.",
    },
  ],
};

const blogHackathons: Blog = {
  id: "blog-011",
  slug: "why-every-cs-student-should-compete-in-hackathons",
  title: "Why Every CS Student Should Compete in Hackathons",
  excerpt:
    "Hackathons compress years of learning into a single weekend. Here is what you actually gain when you compete — and how to do your first one right.",
  coverImage: coverHackathons,
  coverImageAlt:
    "Abstract navy and gold artwork with energetic diagonal shapes representing hackathon competition",
  author: getAuthor("ayesha-noor"),
  category: "Career & Community",
  tags: ["Hackathons", "Community", "Career", "Projects"],
  publishedAt: "2026-07-08",
  readingTime: 5,
  status: "published",
  content: [
    {
      type: "paragraph",
      text: "A hackathon is the strangest educational format we have: no sleep, no syllabus, a hard deadline measured in hours, and a demo in front of actual humans. It should not work. It works spectacularly — because it forces the exact conditions that a semester of coursework cannot manufacture: scope pressure, teamwork under time, and a finish line.",
    },
    { type: "heading", level: 2, text: "What the weekend actually teaches" },
    {
      type: "paragraph",
      text: "The prizes are the least valuable thing in the building. What competitors quietly gain — and what interviews later reward — reads like a course catalog of its own:",
    },
    {
      type: "list",
      items: [
        "Scoping: cutting a project to what fits 24 hours is product judgment, and it cannot be learned from a textbook.",
        "Teamwork: merge conflicts at 3 a.m. teach negotiation faster than any group assignment rubric.",
        "Finishing: the demo must run, so you learn shipping discipline — integration, deployment, and graceful failure.",
        "Presentation: explaining a technical build in three minutes to non-specialists is a career skill hiding inside a contest.",
        "Network: teammates, mentors, and judges are the community you will be working beside for decades.",
      ],
    },
    {
      type: "quote",
      text: "Nobody remembers who won. Everybody remembers who built something surprising with a team they had just met.",
    },
    { type: "heading", level: 2, text: "Doing your first one right" },
    {
      type: "paragraph",
      text: "First-timers routinely lose the weekend to the same three traps. A little strategy fixes all of them before the clock starts:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Pick an idea embarrassingly small — one screen, one feature, done by hour ten. Judges reward working over ambitious.",
        "Assemble the team for complementary skills, not friendship alone: one builder, one builder, one presenter-polisher is a classic winning shape.",
        "Set up version control and deployment in the first hour, not the last. Demos die on localhost.",
        "Sleep at least a little. Hour-twenty debugging while exhausted is where code — and team morale — actually gets destroyed.",
      ],
    },
    {
      type: "callout",
      variant: "takeaway",
      title: "Key takeaway",
      text: "A hackathon is a compressed rehearsal of real software life: incomplete information, hard deadlines, teammates, and a public finish line. Compete once and your ordinary semester work gets easier.",
    },
    {
      type: "paragraph",
      text: "The society runs demo hackathons and contest events each semester — check the [events page](/events) for what is coming up, and enter the next one with a team you have never built with before. That is the whole point.",
    },
  ],
};

/* ---------------------------------------------------------------------------
 * Non-published articles — prove the status gate (must never render publicly)
 * ------------------------------------------------------------------------- */

const blogDesignSystemDraft: Blog = {
  id: "blog-012",
  slug: "designing-the-scs-website-design-system",
  title: "Designing the SCS Website Design System (Working Notes)",
  excerpt:
    "Draft working notes on the navy-and-gold design system behind this site — tokens, typography, and the component inventory. Not ready for publication.",
  coverImage: coverDesignSystem,
  coverImageAlt:
    "Abstract navy and gold artwork with overlapping swatches representing a design system",
  author: getAuthor("bilal-ahmed"),
  category: "Software Engineering",
  tags: ["Design Systems", "Software Engineering", "Community"],
  publishedAt: "2026-09-20",
  readingTime: 4,
  status: "draft",
  content: [
    {
      type: "paragraph",
      text: "THIS ARTICLE IS A DRAFT and must never appear on public pages — it exists so the published-status gate can be verified in QA. If you can read this on the site, there is a bug in getPublishedBlogs().",
    },
  ],
};

const blogOrientationArchived: Blog = {
  id: "blog-013",
  slug: "scs-orientation-2025-recap",
  title: "Recap: SCS Orientation 2025",
  excerpt:
    "An archived recap of last year's orientation week. Kept for record-keeping; hidden from public pages by the status gate.",
  coverImage: coverOrientation,
  coverImageAlt:
    "Abstract navy and gold artwork representing a past orientation event",
  author: getAuthor("ayesha-noor"),
  category: "Career & Community",
  tags: ["Community", "Learning"],
  publishedAt: "2025-09-30",
  readingTime: 3,
  status: "archived",
  content: [
    {
      type: "paragraph",
      text: "THIS ARTICLE IS ARCHIVED and must never appear on public pages — it exists so the status gate can be verified in QA. If you can read this on the site, there is a bug in getPublishedBlogs().",
    },
  ],
};

/* ---------------------------------------------------------------------------
 * Dataset export
 * ------------------------------------------------------------------------- */

/**
 * All demo articles — including draft/archived so the published-status gate
 * (lib/blogSearch → getPublishedBlogs) can be exercised against real data.
 * Public pages and services must consume published posts only.
 */
export const BLOGS: Blog[] = [
  blogInternshipRoadmap,
  blogGenerativeAi,
  blogFullStackApp,
  blogCybersecurity,
  blogRoleOfAi,
  blogUnderstandingApis,
  blogOpenSourceContribution,
  blogDataScience,
  blogGitGithub,
  blogClassroomToRealWorld,
  blogHackathons,
  blogDesignSystemDraft,
  blogOrientationArchived,
];


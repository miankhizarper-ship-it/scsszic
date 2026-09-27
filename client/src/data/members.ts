import type { Member } from "@/types";


import imgAlumAyeshaKhan from "@/assets/people/alum-ayesha-khan.jpg";
import imgAlumBilalMehsud from "@/assets/people/alum-bilal-mehsud.jpg";
import imgAlumHamzaAfridi from "@/assets/people/alum-hamza-afridi.jpg";
import imgAlumKamranYousafzai from "@/assets/people/alum-kamran-yousafzai.jpg";
import imgAlumMahnoorAli from "@/assets/people/alum-mahnoor-ali.jpg";
import imgAlumSanaDurrani from "@/assets/people/alum-sana-durrani.jpg";
import imgAlumUsmanGhani from "@/assets/people/alum-usman-ghani.jpg";
import imgAlumZainabBibi from "@/assets/people/alum-zainab-bibi.jpg";
import imgAuthorAyeshaNoor from "@/assets/people/author-ayesha-noor.jpg";
import imgAuthorBilalAhmed from "@/assets/people/author-bilal-ahmed.jpg";
import imgAuthorDanishRehman from "@/assets/people/author-danish-rehman.jpg";
import imgAuthorHafizUsman from "@/assets/people/author-hafiz-usman.jpg";
import imgAuthorMahnoorShah from "@/assets/people/author-mahnoor-shah.jpg";
import imgAuthorUsmanAli from "@/assets/people/author-usman-ali.jpg";
import imgTeamAhmadShah from "@/assets/people/team-ahmad-shah.jpg";
import imgTeamFatimaNoor from "@/assets/people/team-fatima-noor.jpg";
import imgTeamHiraAnwar from "@/assets/people/team-hira-anwar.jpg";
import imgTeamOwaisBangash from "@/assets/people/team-owais-bangash.jpg";
import imgTeamRabiaSultan from "@/assets/people/team-rabia-sultan.jpg";
import imgTeamSubhanUllah from "@/assets/people/team-subhan-ullah.jpg";

export const MEMBERS: Member[] = [
{
  id: "mem-001",
  username: "ahmad-shah",
  name: "Ahmad Shah",
  initials: "AS",
  avatar: imgTeamAhmadShah,
  avatarAlt: "Placeholder portrait tile for demo member Ahmad Shah — abstract navy and gold monogram",
  role: "President",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Leadership & Community",
  location: "Peshawar, Pakistan",
  bio: "Ahmad leads the society's direction — chairing the core team, representing SCS to the department, and making sure every semester has a plan. He started as a quiet first-year volunteer at the fresher's orientation and now runs the meetings he once nervously signed up for. His favourite part of the job: pairing new members with their first project team.",
  skills: [
    "Team Leadership",
    "Project Planning",
    "Public Speaking",
    "React",
    "TypeScript"
],
  interests: [
    "Community Building",
    "Web Development",
    "EdTech",
    "Mentorship"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "campus-connect"
],
  joinedAt: "2022-10-05",
  status: "active",
  featured: true,
},
{
  id: "mem-002",
  username: "fatima-noor",
  name: "Fatima Noor",
  initials: "FN",
  avatar: imgTeamFatimaNoor,
  avatarAlt: "Placeholder portrait tile for demo member Fatima Noor — abstract navy and gold monogram",
  role: "Vice President",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Leadership & Community",
  location: "Peshawar, Pakistan",
  bio: "Fatima keeps the society's internal machinery humming — coordinating between teams, planning the semester calendar, and following up on the hundred small things that make events happen. She believes the best communities are built on reliable logistics, and she has the spreadsheets to prove it.",
  skills: [
    "Operations",
    "Scheduling",
    "TypeScript",
    "React",
    "Node.js"
],
  interests: [
    "Community Building",
    "Developer Productivity",
    "Women in Tech"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "study-circle-scheduler"
],
  joinedAt: "2022-10-05",
  status: "active",
  featured: true,
},
{
  id: "mem-003",
  username: "owais-bangash",
  name: "Owais Bangash",
  initials: "OB",
  avatar: imgTeamOwaisBangash,
  avatarAlt: "Placeholder portrait tile for demo member Owais Bangash — abstract navy and gold monogram",
  role: "General Secretary",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Software Engineering",
  location: "Peshawar, Pakistan",
  bio: "Owais keeps records, manages society communications, and makes sure every session starts on time. Off secretarial duty he is a backend-in-training who loves clean APIs and well-named variables — and the person to beat at the society's quiz nights.",
  skills: [
    "Node.js",
    "Express",
    "MongoDB",
    "Technical Writing"
],
  interests: [
    "Open Source",
    "Quizzes & Competitions",
    "Backend Architecture"
],
  social: {
    "github": "#"
},
  projectSlugs: [
    "ctf-trainer"
],
  joinedAt: "2022-11-12",
  status: "active",
},
{
  id: "mem-004",
  username: "hira-anwar",
  name: "Hira Anwar",
  initials: "HA",
  avatar: imgTeamHiraAnwar,
  avatarAlt: "Placeholder portrait tile for demo member Hira Anwar — abstract navy and gold monogram",
  role: "Technical Lead",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Software Engineering",
  domain: "Software Engineering",
  location: "Peshawar, Pakistan",
  bio: "Hira guides the society's technical track — workshops, project teams, and the engineering standards behind society builds. She reviews every pull request that lands in an SCS repository and runs the code-review sessions where members learn to give (and take) feedback.",
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "System Design",
    "Code Review"
],
  interests: [
    "Clean Architecture",
    "Developer Education",
    "Open Source"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "campus-connect"
],
  joinedAt: "2022-10-18",
  status: "active",
  featured: true,
},
{
  id: "mem-005",
  username: "subhan-ullah",
  name: "Subhan Ullah",
  initials: "SU",
  avatar: imgTeamSubhanUllah,
  avatarAlt: "Placeholder portrait tile for demo member Subhan Ullah — abstract navy and gold monogram",
  role: "Media & Communications",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "UI/UX",
  location: "Peshawar, Pakistan",
  bio: "Subhan is the voice of the society online — announcements, social channels, and event coverage. He designed the visual template every SCS poster now follows, and he can usually be found at the back of events with a camera and a shot list.",
  skills: [
    "Figma",
    "Graphic Design",
    "Content Writing",
    "Photography"
],
  interests: [
    "Design Systems",
    "Social Media",
    "Event Photography"
],
  social: {
    "website": "#",
    "linkedin": "#"
},
  joinedAt: "2023-02-20",
  status: "active",
},
{
  id: "mem-006",
  username: "rabia-sultan",
  name: "Rabia Sultan",
  initials: "RS",
  avatar: imgTeamRabiaSultan,
  avatarAlt: "Placeholder portrait tile for demo member Rabia Sultan — abstract navy and gold monogram",
  role: "Event Coordinator",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Leadership & Community",
  location: "Peshawar, Pakistan",
  bio: "Rabia plans and executes the society's seminars, bootcamps, and hackathons — from venue logistics to speaker lineups. She has a knack for convincing busy professionals to give up an evening for students, and her events are the reason most new members join.",
  skills: [
    "Event Planning",
    "Public Speaking",
    "Program Management",
    "Notion"
],
  interests: [
    "Tech Talks",
    "Hackathons",
    "Community Building"
],
  social: {
    "linkedin": "#"
},
  projectSlugs: [
    "eventpulse"
],
  joinedAt: "2022-10-05",
  status: "active",
},
{
  id: "mem-007",
  username: "hafiz-usman",
  name: "Hafiz Usman",
  initials: "HU",
  avatar: imgAuthorHafizUsman,
  avatarAlt: "Placeholder portrait tile for demo member Hafiz Usman — abstract navy and gold monogram",
  role: "Contributing Writer",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Web Development",
  location: "Peshawar, Pakistan",
  bio: "Hafiz documents the student journey — internships, portfolios, and the habits that turn coursework into craft. His blog series on landing a first internship started as a Discord message and became the society's most-read article.",
  skills: [
    "Technical Writing",
    "React",
    "JavaScript",
    "SEO"
],
  interests: [
    "Blogging",
    "Career Growth",
    "Frontend Development"
],
  social: {
    "github": "#",
    "website": "#"
},
  projectSlugs: [
    "study-circle-scheduler"
],
  joinedAt: "2022-11-02",
  status: "active",
},
{
  id: "mem-008",
  username: "ayesha-noor",
  name: "Ayesha Noor",
  initials: "AN",
  avatar: imgAuthorAyeshaNoor,
  avatarAlt: "Placeholder portrait tile for demo member Ayesha Noor — abstract navy and gold monogram",
  role: "Community Contributor",
  batch: "Batch 2027",
  batchYear: 2027,
  department: "Computer Science",
  domain: "Web Development",
  location: "Peshawar, Pakistan",
  bio: "Ayesha writes about hackathons, community events, and the student competition circuit — usually from the front row. She joined SCS for the contests and stayed for the people, and her event recaps are how the whole campus knows what the society is up to.",
  skills: [
    "React",
    "Tailwind CSS",
    "Content Writing",
    "Event Coverage"
],
  interests: [
    "Hackathons",
    "Web Development",
    "Student Journalism"
],
  social: {
    "github": "#"
},
  projectSlugs: [
    "edupath-mentor-portal"
],
  joinedAt: "2023-09-14",
  status: "active",
},
{
  id: "mem-009",
  username: "usman-ali",
  name: "Usman Ali",
  initials: "UA",
  avatar: imgAuthorUsmanAli,
  avatarAlt: "Placeholder portrait tile for demo member Usman Ali — abstract navy and gold monogram",
  role: "Technical Writer",
  batch: "Batch 2027",
  batchYear: 2027,
  department: "Software Engineering",
  domain: "Software Engineering",
  location: "Peshawar, Pakistan",
  bio: "Usman writes practical tutorials — Git, tooling, and the workflows professional teams rely on. His 'first contribution' walkthrough has guided two cohorts of members through their own open-source pull requests.",
  skills: [
    "Git",
    "Docker",
    "CI/CD",
    "Technical Writing",
    "Python"
],
  interests: [
    "Open Source",
    "Developer Tooling",
    "Automation"
],
  social: {
    "github": "#",
    "website": "#"
},
  projectSlugs: [
    "campus-connect"
],
  joinedAt: "2023-09-14",
  status: "active",
},
{
  id: "mem-010",
  username: "bilal-ahmed",
  name: "Bilal Ahmed",
  initials: "BA",
  avatar: imgAuthorBilalAhmed,
  avatarAlt: "Placeholder portrait tile for demo member Bilal Ahmed — abstract navy and gold monogram",
  role: "ML Enthusiast & Writer",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "AI/ML",
  location: "Peshawar, Pakistan",
  bio: "Bilal explores AI, generative models, and what modern tooling means for everyday developers. He reproduces papers for fun and then explains them to the rest of us in plain language at the monthly AI study circle.",
  skills: [
    "Python",
    "PyTorch",
    "Transformers",
    "Pandas"
],
  interests: [
    "Generative AI",
    "NLP",
    "Paper Reading Groups"
],
  social: {
    "github": "#"
},
  projectSlugs: [
    "pashto-nlp-toolkit",
    "ctf-trainer"
],
  joinedAt: "2022-11-02",
  status: "active",
},
{
  id: "mem-011",
  username: "mahnoor-shah",
  name: "Mahnoor Shah",
  initials: "MS",
  avatar: imgAuthorMahnoorShah,
  avatarAlt: "Placeholder portrait tile for demo member Mahnoor Shah — abstract navy and gold monogram",
  role: "Contributing Writer",
  batch: "Batch 2027",
  batchYear: 2027,
  department: "Data Science",
  domain: "Data Science",
  location: "Peshawar, Pakistan",
  bio: "Mahnoor covers data science, security hygiene, and the unglamorous habits that keep projects alive. She builds small dataset projects end to end — scraping, cleaning, visualizing — and writes up every mistake so others skip it.",
  skills: [
    "Python",
    "pandas",
    "SQL",
    "Data Visualization"
],
  interests: [
    "Data Storytelling",
    "Security Hygiene",
    "Dashboard Design"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "quizboard"
],
  joinedAt: "2023-10-03",
  status: "active",
},
{
  id: "mem-012",
  username: "danish-rehman",
  name: "Danish Rehman",
  initials: "DR",
  avatar: imgAuthorDanishRehman,
  avatarAlt: "Placeholder portrait tile for demo member Danish Rehman — abstract navy and gold monogram",
  role: "Contributing Writer",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Software Engineering",
  domain: "Software Engineering",
  location: "Peshawar, Pakistan",
  bio: "Danish writes about the engineering side of student life — APIs, tooling, and shipping real projects between exams. He maintains the society's internal starter templates so new project teams skip a week of setup every semester.",
  skills: [
    "Node.js",
    "REST APIs",
    "TypeScript",
    "PostgreSQL"
],
  interests: [
    "Backend Development",
    "APIs",
    "Starter Templates"
],
  social: {
    "github": "#"
},
  projectSlugs: [
    "scs-dev-portfolio"
],
  joinedAt: "2022-12-11",
  status: "active",
},
{
  id: "mem-013",
  username: "kamran-yousafzai",
  name: "Kamran Yousafzai",
  initials: "KY",
  avatar: imgAlumKamranYousafzai,
  avatarAlt: "Placeholder portrait tile for demo member Kamran Yousafzai — abstract navy and gold monogram",
  role: "Senior Software Engineer",
  company: "Systems Limited",
  batch: "Batch 2022",
  batchYear: 2022,
  department: "Computer Science",
  domain: "Software Engineering",
  location: "Islamabad, Pakistan",
  bio: "Kamran joined SCS in his first semester and never really left — he ran the society's first programming contest series before graduating. Today he designs backend systems for national-scale fintech products, and he returns to SCS events as a guest judge and mentor whenever his schedule allows.",
  skills: [
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "System Design",
    "AWS"
],
  interests: [
    "Mentorship",
    "Fintech",
    "Distributed Systems"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  joinedAt: "2018-10-08",
  status: "alumni",
},
{
  id: "mem-014",
  username: "sana-durrani",
  name: "Sana Durrani",
  initials: "SD",
  avatar: imgAlumSanaDurrani,
  avatarAlt: "Placeholder portrait tile for demo member Sana Durrani — abstract navy and gold monogram",
  role: "AI Researcher",
  company: "LUMS",
  batch: "Batch 2022",
  batchYear: 2022,
  department: "Computer Science",
  domain: "AI/ML",
  location: "Lahore, Pakistan",
  bio: "Sana's curiosity about language and computation started in an SCS study circle on machine learning. She now researches NLP for under-served languages, with a long-term goal of building open datasets that make Pakistani languages first-class citizens in modern NLP.",
  skills: [
    "Python",
    "PyTorch",
    "NLP",
    "Transformers",
    "Research Writing"
],
  interests: [
    "Low-Resource Languages",
    "Open Datasets",
    "Academic Research"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "pashto-nlp-toolkit"
],
  joinedAt: "2018-11-20",
  status: "alumni",
  featured: true,
},
{
  id: "mem-015",
  username: "hamza-afridi",
  name: "Hamza Afridi",
  initials: "HA",
  avatar: imgAlumHamzaAfridi,
  avatarAlt: "Placeholder portrait tile for demo member Hamza Afridi — abstract navy and gold monogram",
  role: "Full-Stack Developer",
  company: "UK SaaS Startup",
  batch: "Batch 2023",
  batchYear: 2023,
  department: "Software Engineering",
  domain: "Web Development",
  location: "Remote — Manchester, UK",
  bio: "Hamza built his first production app for a university society — an event registration tool that replaced paper forms. That project became the portfolio piece that landed him a remote role with a UK-based SaaS startup, and he still reviews event tooling ideas for SCS teams.",
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Next.js",
    "Prisma"
],
  interests: [
    "SaaS Products",
    "Hackathons",
    "Open Source UI"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "eventpulse"
],
  joinedAt: "2019-10-15",
  status: "alumni",
},
{
  id: "mem-016",
  username: "ayesha-khan",
  name: "Ayesha Khan",
  initials: "AK",
  avatar: imgAlumAyeshaKhan,
  avatarAlt: "Placeholder portrait tile for demo member Ayesha Khan — abstract navy and gold monogram",
  role: "Data Scientist",
  company: "Peshawar Analytics Lab",
  batch: "Batch 2023",
  batchYear: 2023,
  department: "Data Science",
  domain: "Data Science",
  location: "Peshawar, Pakistan",
  bio: "Ayesha discovered data science through an SCS workshop on Python for analysis and immediately started applying it to everything she could find. She now builds demand-forecasting pipelines for regional businesses and volunteers as a data mentor for final-year projects.",
  skills: [
    "Python",
    "pandas",
    "SQL",
    "scikit-learn",
    "Data Visualization"
],
  interests: [
    "Forecasting",
    "Data Literacy",
    "Mentorship"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "crop-vision"
],
  joinedAt: "2019-11-05",
  status: "alumni",
},
{
  id: "mem-017",
  username: "bilal-mehsud",
  name: "Bilal Mehsud",
  initials: "BM",
  avatar: imgAlumBilalMehsud,
  avatarAlt: "Placeholder portrait tile for demo member Bilal Mehsud — abstract navy and gold monogram",
  role: "Cybersecurity Analyst",
  company: "SecureNet Systems",
  batch: "Batch 2024",
  batchYear: 2024,
  department: "Computer Science",
  domain: "Cybersecurity",
  location: "Peshawar, Pakistan",
  bio: "Bilal organized SCS's first capture-the-flag competition and used it to teach an entire cohort the basics of offensive security. Professionally he works in penetration testing and incident response — and he still runs the CTF tradition at SCS every semester, now as an alumni partner.",
  skills: [
    "Linux",
    "Networking",
    "Burp Suite",
    "Python",
    "Threat Analysis"
],
  interests: [
    "CTF Competitions",
    "Penetration Testing",
    "Security Awareness"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "ctf-trainer"
],
  joinedAt: "2020-10-12",
  status: "alumni",
},
{
  id: "mem-018",
  username: "mahnoor-ali",
  name: "Mahnoor Ali",
  initials: "MA",
  avatar: imgAlumMahnoorAli,
  avatarAlt: "Placeholder portrait tile for demo member Mahnoor Ali — abstract navy and gold monogram",
  role: "Research Assistant",
  company: "Center for AI Research",
  batch: "Batch 2024",
  batchYear: 2024,
  department: "Computer Science",
  domain: "AI/ML",
  location: "Peshawar, Pakistan",
  bio: "Mahnoor's final-year project — a crop-disease detection prototype — began as a hackathon idea and grew into a funded research role. She now works on computer-vision pipelines for precision agriculture, splitting her time between fieldwork, datasets, and paper deadlines.",
  skills: [
    "Python",
    "OpenCV",
    "TensorFlow",
    "Research Methods"
],
  interests: [
    "Computer Vision",
    "Precision Agriculture",
    "Open Datasets"
],
  social: {
    "github": "#",
    "linkedin": "#"
},
  projectSlugs: [
    "crop-vision"
],
  joinedAt: "2020-11-09",
  status: "alumni",
},
{
  id: "mem-019",
  username: "usman-ghani",
  name: "Usman Ghani",
  initials: "UG",
  avatar: imgAlumUsmanGhani,
  avatarAlt: "Placeholder portrait tile for demo member Usman Ghani — abstract navy and gold monogram",
  role: "Frontend Engineer",
  company: "WebNova Studio",
  batch: "Batch 2025",
  batchYear: 2025,
  department: "Computer Science",
  domain: "Web Development",
  location: "Peshawar, Pakistan",
  bio: "Usman was the society's go-to person for anything visual — event posters first, then web interfaces. He joined a digital studio right after graduating and now builds marketing sites and product UIs where engineering meets design. He frequently reviews portfolios for SCS juniors.",
  skills: [
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Framer Motion",
    "Figma"
],
  interests: [
    "UI Engineering",
    "Motion Design",
    "Portfolio Reviews"
],
  social: {
    "github": "#",
    "website": "#"
},
  projectSlugs: [
    "scs-dev-portfolio"
],
  joinedAt: "2021-10-11",
  status: "alumni",
},
{
  id: "mem-020",
  username: "zainab-bibi",
  name: "Zainab Bibi",
  initials: "ZB",
  avatar: imgAlumZainabBibi,
  avatarAlt: "Placeholder portrait tile for demo member Zainab Bibi — abstract navy and gold monogram",
  role: "Founder & CEO",
  company: "EduPath (student startup)",
  batch: "Batch 2026",
  batchYear: 2026,
  department: "Computer Science",
  domain: "Leadership & Community",
  location: "Peshawar, Pakistan",
  bio: "Zainab pitched the first version of EduPath at an SCS startup night and won the audience vote. She is building a mentorship marketplace that pairs current students with working graduates — and credits the society's project teams as her first experience of building something real with a team.",
  skills: [
    "Product Strategy",
    "Pitching",
    "React Native",
    "Firebase"
],
  interests: [
    "Startups",
    "Mentorship",
    "Community Building"
],
  social: {
    "linkedin": "#",
    "website": "#"
},
  projectSlugs: [
    "edupath-mentor-portal"
],
  joinedAt: "2022-10-05",
  status: "active",
},
{
  id: "mem-021",
  username: "haroon-rashid",
  name: "Haroon Rashid",
  initials: "HR",
  role: "Former Member",
  batch: "Batch 2025",
  batchYear: 2025,
  department: "Computer Science",
  domain: "Web Development",
  location: "Peshawar, Pakistan",
  bio: "A former member whose profile has been deactivated at their request. This record exists to prove the archived-status gate: Haroon must never appear in the public directory, on project teams, or as a feed author — direct links to /profile/haroon-rashid resolve to a Not Found state.",
  skills: [
    "PHP",
    "jQuery",
    "MySQL"
],
  interests: [
    "Legacy Systems"
],
  projectSlugs: [
    "legacy-event-portal"
],
  joinedAt: "2021-10-11",
  status: "archived",
},
];

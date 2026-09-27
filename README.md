# SCS Platform — Society of Computer Science, SZIC

Community platform for the **Society of Computer Science**, Shaikh Zayed Islamic
Centre (SZIC), University of Peshawar.

## Phase 1 — Foundation (current)

- Public website foundation with the full public route tree (Home implemented;
  remaining routes render clean placeholders)
- "Royal Academic Technology" design system (navy/gold, Plus Jakarta Sans + Inter)
- Reusable component architecture (UI primitives, layout, media cards, sections)
- Mock/seed data layer isolated in `client/src/data` (API-ready shapes)
- Express + TypeScript server skeleton with `/api/health`

## Stack

| Layer    | Tools                                                                 |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query, React Hook Form + Zod, Framer Motion |
| Backend  | Node.js, Express 5, TypeScript (MongoDB/Mongoose + R2 arrive Phase 2)  |

## Project structure

```
client/                 React SPA (Vite)
  public/               favicon, robots.txt
  src/
    assets/             logo (placeholder note), media (generated placeholders)
    components/
      ui/               Button, Container, SectionHeading, Logo, Badge, Reveal
      layout/           Navbar, MobileMenu, Footer, RootLayout, PlaceholderPage
      media/            EventCard, BlogCard, StatCard, ProfileCard, GalleryGrid, FeedPostPreview
      sections/         Home page sections + CTASection
    data/               mock/seed data (replace with API in Phase 2)
    hooks/              useScrolled, useLockBodyScroll
    lib/                queryClient, seo, motion, format, utils
    pages/              one file per route
    routes/             AppRoutes (router), paths (route constants)
    services/           apiClient (Phase 2 fetch layer)
    styles/             globals.css (Tailwind v4 theme tokens)
server/                 Express API (skeleton)
  src/
    config/  controllers/  middleware/  routes/  services/  utils/
```

## Commands (from the repo root)

```bash
bun install            # install all workspace dependencies (or: npm install)
bun run dev            # client dev server → http://localhost:3000 (Vite proxies /api → :4000)
bun run dev:server     # Express API on http://localhost:4000
bun run build          # client production build (type-checks first)
bun run typecheck      # TypeScript for client + server
bun run lint           # ESLint (client)
```

> npm users: the same tasks work via `npm run dev -w @scs/client`,
> `npm run build -w @scs/client`, etc.

## Roadmap

- [x] Phase 1 — foundation, design system, routing, Home page
- [ ] Phase 2 — authentication, MongoDB (Mongoose) models & APIs, admin/CMS,
      event registration, community feed, R2 media, full About/Events/Blog/Alumni pages

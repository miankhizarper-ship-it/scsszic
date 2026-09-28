# SCS Platform — Vercel Deployment Guide

Complete, step-by-step instructions to deploy the Society of Computer Science
platform with:

| Component  | Target                       |
| ---------- | ---------------------------- |
| Database   | MongoDB Atlas                |
| Backend    | Vercel (serverless Express)  |
| Frontend   | Vercel (static Vite build)   |

**Nothing deploys automatically.** Every step below is a manual action you
perform in the Atlas / Vercel / Git dashboards. This document never asks you
to paste secret values anywhere except directly into the dashboard fields that
need them — and never into the repository.

Deep technical reference: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 0. Prerequisites

- A **Git repository** (GitHub / GitLab / Bitbucket) containing this project.
  Vercel deploys from Git; create the repo and push this code first.
- A **MongoDB Atlas** account (free M0 tier is sufficient to start).
- A **Vercel** account (Hobby tier works; Pro removes function duration limits).
- Node.js ≥ 20.19 locally if you want to re-verify or seed from your machine.

Two Vercel **projects** will be created from the same repository:

- **`scs-api`** — Root Directory: `server` → runs the Express API serverlessly.
- **`scs-web`** — Root Directory: `client` → serves the built React frontend.

---

## 1. MongoDB Atlas setup

1. Create a project → create a cluster (M0 free tier is fine to begin).
2. **Database Access** → add a database user
   - Username + a strong generated password (you will need these in step 3.4).
   - Role: `readWrite` on the `scs` database (or `readWriteAnyDatabase` if you
     prefer simplicity on a single-tenant cluster).
3. **Network Access** → add an IP rule
   - For quick starts: `0.0.0.0/0` (allow from anywhere). Vercel serverless
     functions egress from a shared, rotating IP pool — per-IP allowlisting is
     not practical on the standard tier.
   - Hardening option: Atlas **Private Endpoint** (dedicated clusters only), or
     restrict by Vercel Secure Compute if available on your plan.
4. **Connect → Drivers** → copy the connection string. It looks like
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
   - Keep it out of chat logs, screenshots and the repo — it contains the
     password.
   - Append the database name to the path **or** rely on the separate
     `MONGODB_DB_NAME` variable (recommended; see the env table below).

---

## 2. Deploy the backend (`scs-api`)

1. Vercel dashboard → **Add New… → Project** → import your Git repository.
2. Configure the project:
   - **Framework Preset:** `Other` — ⚠️ if Vercel auto-detected *Vite*, change
     it to `Other` (the `vite` devDependency in `server/package.json` is only
     used by the seeder and fools the detector; `server/vercel.json` now
     declares `"framework": null` so detection is disabled at the repo level).
   - **Root Directory:** `server`  ← important
   - **Build Command:** leave empty (none) — the serverless TypeScript is
     bundled by Vercel's Node runtime; there is no separate build step.
   - **Output Directory:** leave empty
   - **Install Command:** leave default

   > If you see `Error: No Output Directory named "dist" found`, the Vite
   > preset is still active: set Framework Preset to `Other`, clear any
   > Build Command / Output Directory overrides in Project Settings → Build
   > & Output Settings, and redeploy.
3. Before deploying, add **Environment Variables** (Project → Settings →
   Environment Variables; select the *Production* target at minimum):

   | Name                 | Required | Notes                                                      |
   | -------------------- | -------- | ---------------------------------------------------------- |
   | `MONGODB_URI`        | ✅       | Atlas connection string from step 1.4                       |
   | `MONGODB_DB_NAME`    | ✅       | Database name, e.g. `scs`                                   |
   | `SESSION_SECRET`     | ✅       | ≥ 32 random characters (production refuses to boot without) |
   | `CORS_ORIGIN`        | ✅       | Your **real** deployed frontend origin — the URL shown in the browser when you open the client, e.g. `https://scsszic-client.vercel.app`. Do **not** copy example names from this guide. |
   | `NODE_ENV`           | —        | Vercel sets `production` automatically for prod deployments |
   | `COOKIE_SECURE`      | —        | Leave unset (defaults to `true` in production)              |
   | `COOKIE_SAME_SITE`   | —        | See §4 (cookie topology) — `none` for two `*.vercel.app` hosts, `lax` for same-apex custom domains |
   | `SESSION_TTL_HOURS`  | —        | Default `168` (7 days)                                      |
   | `MONGODB_TIMEOUT_MS` | —        | Default `10000`                                             |
   | `R2_ACCOUNT_ID`        | —      | Cloudflare R2 media uploads (see §8) — all five `R2_*` vars are optional; uploads answer 503 until all are set |

   Generate a session secret locally with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   and paste the output into the Vercel field only — never into the repo.

4. **Deploy.** On success, verify: `https://<your-api-host>/api/health` returns
   HTTP 200 with a JSON body. That is the whole API — auth, content and admin
   routes are all live under the same `/api` prefix as local development.

> **Note:** the required-variable guard is active: if `MONGODB_URI` or a
> sufficiently long `SESSION_SECRET` is missing, the API fails loudly at cold
> start (500 on first request + error in Vercel logs) instead of serving
> broken sessions.

> ⚠️ **Placeholder names:** project names used in this guide (`scs-api`,
> `scs-web`) are *examples only*. Your actual Vercel projects may be named
> differently (e.g. `scsszic-server`, `scsszic-client`). Every env value must
> use **your real deployed domains**, taken from the browser address bar of
> each deployment — not from this guide.

---

## 3. Deploy the frontend (`scs-web`)

1. Vercel → **Add New… → Project** → import the **same repository** again.
2. Configure the project:
   - **Framework Preset:** `Vite` (auto-detected)
   - **Root Directory:** `client`  ← important
   - **Build Command:** default (`npm run build`)
   - **Output Directory:** default (`dist`, auto-detected)
3. Add **Environment Variables**:

   | Name                | Required | Notes                                                            |
   | ------------------- | -------- | ---------------------------------------------------------------- |
   | `VITE_API_BASE_URL` | ✅       | `https://<your-api-host>/api` — **must end with `/api`** (service paths like `/auth/login` are appended to it) |

4. **Deploy.** Open the frontend URL — the public site should render and load
   content from the API.

> **SPA refresh:** `client/vercel.json` is preconfigured to rewrite every
> unknown path to `/index.html` (static files always win). That is what makes
> hard refresh and direct links to deep pages like `/events` or `/login`
> work — without it Vercel returns `404 NOT_FOUND` on refresh. It is picked
> up automatically; no dashboard setting needed.

---

## 4. Cookie topology (decide before first login)

The session is an HTTP-only cookie sent with `credentials: "include"`. Whether
browsers accept it depends on the two domains involved:

| Topology                                                             | `COOKIE_SAME_SITE` | Result                                                        |
| -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| Frontend `scs-web.vercel.app` + API `scs-api.vercel.app` (different sites) | `none`        | Works in Chrome/Firefox. **Safari (ITP) blocks these cookies** — logins will not persist there. |
| Custom domains on one apex, e.g. `www.scs.example.org` + `api.scs.example.org` | `lax` (default) | Same-site → cookies work in all modern browsers. **Recommended for production.** |

**Recommendation:** for real users (admin logins especially), attach custom
domains to both projects on a shared apex, keep `COOKIE_SAME_SITE=lax` (or
unset), and set `CORS_ORIGIN` to the exact frontend origin (scheme + host,
no trailing slash).

---

## 5. Seed the Atlas database

The production database starts empty. Seed it once, deliberately, from your
machine (the seeder is deterministic and idempotent — re-running produces the
same canonical dataset):

```bash
cd server
MONGODB_URI="<your atlas uri>" MONGODB_DB_NAME="scs" bun run db:seed
```

- Values passed inline override everything; your local `server/.env` is not
  modified and the URI is never printed by the tooling.
- Alternatively, temporarily paste the values into a local `server/.env`, run
  `bun run db:seed`, then remove them.

The seed creates the canonical content set (events, blogs, alumni, gallery,
videos, members, projects, feed) plus the demo accounts used by local QA.

---

## 6. Post-deployment smoke test

Run this checklist after every first deployment (and after major changes):

1. `https://<api-host>/api/health` → 200, JSON body present.
2. Frontend home page renders; events/blogs/gallery lists show seeded content.
3. Log in with an admin account → dashboard loads.
4. Refresh the page after login → still logged in (session cookie works).
5. Open an admin CMS page (e.g. Events) → list renders.
6. Log out → `/account` and admin pages are refused again.
7. Vercel function logs show no unexpected errors (some MongoDB cold-start
   latency on the first request is normal).

---

## 7. Troubleshooting

| Symptom                                  | Likely cause / fix                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `/api/health` 500 on cold start          | Missing `MONGODB_URI` or short `SESSION_SECRET` — check Vercel logs, fix env vars. |
| API returns 503 with `message` envelope  | Backend reachable but **MongoDB unreachable** — check Atlas network access (`0.0.0.0/0`) and the URI. |
| Browser console: CORS error              | `CORS_ORIGIN` does not exactly match the frontend origin (scheme + host + port).    |
| Browser: `ACAO` header has value `https://<some-other-host>` that is not equal to the supplied origin | `CORS_ORIGIN` holds an example/placeholder domain (e.g. `scs-web.vercel.app`) or has a trailing slash. Set it to the **real client origin** shown in the browser and **redeploy the backend** (env changes only apply after a redeploy). |
| Browser: `404` **and** CORS errors for URLs like `https://<api-host>/gallery` (no `/api` segment) | `VITE_API_BASE_URL` is missing the trailing `/api`. Set it to `https://<api-host>/api` in the **frontend** project and **redeploy the frontend** (Vite bakes the value at build time). |
| Login succeeds but session lost on refresh | Cookie topology — set `COOKIE_SAME_SITE=none` (vercel.app) or move both hosts to one apex (custom domains). Also confirm the site is served over HTTPS (secure cookies). |
| Frontend loads but all API calls fail    | `VITE_API_BASE_URL` missing or missing the trailing `/api`. Rebuild after changing it (Vite bakes it at build time). |
| Browser requests URLs like `https://<client-domain>/VITE_API_BASE_URL%20=%20https:/…` | The whole `NAME = value` line was pasted into the **Value** field. Environment variable **Name** and **Value** are separate fields: Name = `VITE_API_BASE_URL`, Value = `https://<api-host>/api` — **only the URL**, no `NAME =` prefix, no spaces, no quotes. Redeploy the frontend after saving. These requests show `404` before the SPA rewrite ships and `405` after (POST/PUT to a rewritten static page) — a `405` here means the deployment is new but the env value is still wrong. |
| First request after idle is slow         | Serverless cold start (DB connect + index verify). Normal; warm requests are fast.  |
| Build fails: `No Output Directory named "dist"` on the **API** project | The Vite framework preset was auto-applied (from the `vite` devDependency). Set Framework Preset = `Other`, clear Build Command + Output Directory, redeploy. `server/vercel.json` declares `"framework": null` to prevent this permanently. |
| Warning: `engines { "node": ">=20.19.0" } will automatically upgrade…` | Informational only — the range intentionally accepts any Node ≥ 20.19. Safe to ignore. |
| Uploads answer `503: Media storage is not configured` | The five `R2_*` variables are not (all) set on the **backend** project — see §8. Everything else keeps working. |
| Upload rejected `415: This file type is not supported` | File bytes are checked against an allow-list (images everywhere; mp4/webm only for the videos library) and must match the declared type. |
| Upload rejected `413` | Files are capped at 4 MB — Vercel's serverless request limit is 4.5 MB. Host larger media externally and paste its URL instead. |

---

## 8. Cloudflare R2 media uploads (Phase 10A)

Admins can upload images (and small mp4/webm clips for the Videos library)
through every CMS form — each media field keeps its URL text input and gains
an **Upload** button. Uploads go through the authenticated API
(`POST /api/admin/uploads`); the browser never sees any storage credential.
MongoDB keeps storing ordinary URL strings, so old content and new uploads
are fully interchangeable.

### 9.1 One-time Cloudflare setup (manual — never done by the app)

1. Cloudflare dashboard → **R2 → Create bucket** (e.g. `scs-media`).
2. **R2 → API → Create API token** with *Object Read & Write* scoped to that
   bucket — this yields the Access Key ID + Secret Access Key.
3. Enable **public access** so the site can display the files, either via:
   - the bucket's **r2.dev public URL** (quick, rate-limited — fine to start), or
   - a **custom domain** bound to the bucket (recommended for production).
   The public base (e.g. `https://pub-xxxx.r2.dev` or `https://media.your-domain.org`)
   is what goes into `R2_PUBLIC_URL` — no trailing slash.
4. No CORS configuration is needed on the bucket: uploads are made
   **server-to-server** from the API, never from the browser.

### 9.2 Environment variables (backend project only — 5, all required together)

| Name                 | Notes                                                            |
| -------------------- | ---------------------------------------------------------------- |
| `R2_ACCOUNT_ID`      | Cloudflare account id (builds the S3 endpoint)                   |
| `R2_ACCESS_KEY_ID`   | R2 API token access key — **server-side only**                   |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret — **server-side only, never to the client** |
| `R2_BUCKET_NAME`     | Bucket holding uploaded objects                                  |
| `R2_PUBLIC_URL`      | Public media base URL (r2.dev or custom domain), no trailing slash |

Set them in Vercel → **backend** project → Environment Variables, then
redeploy the backend. Until all five exist the API runs normally and the
upload/delete endpoints answer `503` with a clear message — nothing else
changes. For local development put real values in `server/.env` (git-ignored).

### 9.3 Behavior notes

- Objects are stored as `uploads/<library>/<yyyy>/<mm>/<uuid>.<ext>` — the
  original filename is never used, so collisions and path tricks are impossible.
- Accepted types: images (jpeg/png/webp/gif/avif) in every library;
  `video/mp4`/`video/webm` additionally in the **videos** library. The real
  bytes are sniffed and must match the declared type.
- Size cap 4 MB (Vercel's serverless request limit is 4.5 MB); larger media
  should be hosted externally and referenced by URL, as today.
- Deleting media (`DELETE /api/admin/uploads?key=…`) is admin-only and only
  accepts keys this app generated. Deleting an object does not rewrite
  existing content that references it — remove references first.

---

## 9. What was changed in this repository for Vercel

For the Vercel deployment itself, only five files — application code is
untouched:

1. **`server/api/index.ts`** (new) — serverless adapter that reuses the exact
   same Express app; connects MongoDB + verifies indexes once per warm
   instance before serving; no `listen()`.
2. **`server/vercel.json`** (new) — one rewrite: `/(.*)` → the function.
3. **`client/vercel.json`** (new) — SPA fallback: rewrites unknown paths to
   `/index.html` so refreshing deep links doesn't 404 (Vercel serves real
   static files first).
4. **`server/tsconfig.json`** (modified) — `"include": ["src", "api"]` so the
   entrypoint is typechecked.
5. **`server/package.json`** (modified) — declares `"engines": { "node": ">=20.19.0" }`.

`server/src/index.ts` (the `listen()`-based local entrypoint) is unchanged and
remains the local development server. No routes, controllers, repositories or
auth logic were modified. Details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Phase 10A (R2 media) added on top, without touching any of the above behavior:
`server/src/services/storage/*` (R2 service), `server/src/controllers/admin/
adminUploads.controller.ts`, two routes in `admin.routes.ts` (both behind the
existing `requireAdmin` guard), a FormData path in `client/src/services/
apiClient.ts`, `client/src/components/admin/UploadMediaButton.tsx`, Upload
buttons inside the existing CMS media fields, and the `R2_*` names in
`server/.env.example`. Media fields remain plain URL strings — no schema
changes, no migration.

---

## 10. Roles & CMS permissions (Phase 10B)

The admin panel supports three roles. Roles and permissions live on each user
account (MongoDB `users` collection) and are enforced **server-side** on every
request — the sidebar/filtering you see in the UI is only a reflection.

| Role | Access |
|------|--------|
| `admin` | Everything: all 9 CMS sections, Users, Audit, media uploads, dashboard |
| `manage` | Only the CMS sections explicitly granted to THAT account (events, blogs, alumni, members, projects, feed, gallery, videos, team). Never Users/Audit/uploads/dashboard |
| `member` | No admin-panel access (unchanged) |

Managing roles and permissions: sign in as an admin → **Users** → edit an
account → set the role (`member` / `manage` / `admin`). For `manage` accounts
a checkbox grid appears with the CMS sections; grants save with the same
PATCH. Notes:

- Grant changes take effect on the affected account's **next request** — no
  re-login needed (the server re-reads the user on every request).
- Switching an account away from `manage` automatically clears its stored
  section grants (no stale permissions).
- The final-admin safeguard covers every path that strips the admin role:
  the last administrator can never be demoted (to `member` **or** `manage`)
  or deleted.
- Every role/permission change is written to the audit trail
  (`user.role.updated`, `user.permissions.updated`).
- No migration is needed for existing databases: accounts without a
  `permissions` field behave as `[]`.

---

## 11. Community engagement & contact form

Two new public surfaces (both live on the same API, no env changes):

### 11.1 Feed likes & comments

Signed-in accounts (any role) can now engage with feed posts:

- `POST /api/feed/:id/like` — toggles the account's like (401 anonymous,
  404 unknown/archived post). Returns `{ liked, likes }`.
- `GET /api/feed/:id/comments` — the full thread, oldest first (public).
- `POST /api/feed/:id/comments` — adds a comment (`{ body }`, 1–1000 chars)
  authored from the SESSION account — never from client-supplied identity.
- `GET /api/feed/viewer-state?ids=a,b,c` — batched like-state for a page of
  posts (one request per page; anonymous callers receive an empty list).

Stored layout: real likes live in `feed_posts.likedBy` (account ids, never
serialized), real comments in the new `feed_comments` collection. Displayed
counts = the seeded demo baseline + real activity, so the demo dataset is
never drained and 9I seed-integrity checks stay green. No migration needed.

### 11.2 Contact page

`/contact` is now a real page: society email / campus location / community
options plus a contact form → `POST /api/contact` (anonymous).

- Server-side zod validation (name/email/subject/message bounds) with
  field-level 400 errors mapped back onto the form.
- Best-effort per-IP throttle: 5 messages / 10 minutes → 429 (in-memory;
  per warm serverless instance).
- Honeypot: a hidden `company` field that must stay empty — bot fills are
  answered with a success response but nothing is stored.
- Submissions persist to the `contact_messages` collection. There is
  deliberately NO read API yet — read them directly in MongoDB (Atlas web
  UI or `mongosh`); an admin inbox is a possible later addition.

---

## 12. Home page people sections & Team CMS (Phase 12)

The home page shows three admin-managed people sections, and the About
page's leadership strip reads the same data:

- **Leadership** — cards from the `team` collection with
  `group: "leaders"` (home shows up to 4; About lists them all).
- **Members spotlight** — up to 4 member-directory cards in the canonical
  order (members flagged *featured* surface first).
- **Developers** — cards with `group: "developers"`, rendered as a dark
  navy band (up to 4).

Manage every card in **Admin → Team** (`/admin/team`, permission-gated by
the new `team` CMS permission): group, name, position, one-liner,
initials, portrait (URL or R2 upload), social links, manual display order
(lower numbers first), and a Published/Archived status. Archiving hides a
card from every public surface without deleting it.

- Public endpoint: `GET /api/team?group=leaders|developers&limit=N` —
  published cards only, ordered by `order` then name.
- Admin endpoints: `GET/POST /api/admin/team`,
  `GET/PATCH/DELETE /api/admin/team/:id` — gated by
  `requireAdminOrPermission("team")`; every write is audited
  (`team.created` / `team.updated` / `team.deleted`).
- Empty sections hide themselves: with no published cards the home page
  and About page simply skip the section (no error boxes, no bare
  headings). Team cards are NOT seeded — add your real people in the
  admin panel.
- The blog section on the home page now renders three full-size article
  cards (featured article first, then the newest), replacing the old
  large-plus-small-thumbnails layout. No featured flag is required — the
  newest published articles always surface.
- The demo alumni dataset moved out of the client bundle into a
  seeder-only fixture (`server/src/scripts/fixtures/alumniDemo.ts`): the
  shipped site carries zero fictional people while QA keeps its
  deterministic 8-profile baseline. Production databases are never
  seeded — real alumni come from the admin CMS.

---

## 13. Admin restyle & page-scoped managers (Task 14)

The admin panel's people-card management moved from a standalone "Team"
section into PAGE-scoped managers, and the sidebar chrome was restyled:

- **Admin → Home Page** (`/admin/home-page`) — one page with three tabs:
  *Leadership* (team cards, group "leaders"), *Members spotlight* (star
  toggle pins a directory member to the home spotlight — featured members
  surface first, up to 4 cards), and *Developers* (group "developers").
- **Admin → About Page** (`/admin/about-page`) — manages the leadership
  strip shown on the About page. It reads the SAME "leaders" cards as the
  home Leadership section (one dataset, two surfaces; a notice on the page
  says exactly that).
- Create/edit forms live under the page they came from
  (`/admin/home-page/leaders/new`, `/admin/about-page/leaders/:id/edit`,
  …) with the card group LOCKED to that page; the old `/admin/team/*`
  URLs redirect to `/admin/home-page`.
- Permissions: the Home Page manager admits any-of `team`/`members` (tabs
  the account lacks are hidden); the About Page manager needs `team`.
  The permission label in the Users editor now reads "Team cards".
  Server endpoints and enforcement are unchanged from Phase 12.
- Sidebar restyle: the brand header shows the logo mark ONLY (no text);
  when the sidebar is collapsed the logo is hidden entirely. Scrollbars
  are hidden (`.no-scrollbar`), navigation is grouped into Pages /
  Content / Administration with micro labels, the active item carries a
  gold tint, and the mobile header + drawer share the same navy theme.
- Form fix: initials now auto-derive from the name while the field is
  untouched (previously the fallback ran only after validation, so saving
  a new card without typing initials failed client-side validation).


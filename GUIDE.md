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
   | `CORS_ORIGIN`        | ✅       | The frontend URL, e.g. `https://scs-web.vercel.app`         |
   | `NODE_ENV`           | —        | Vercel sets `production` automatically for prod deployments |
   | `COOKIE_SECURE`      | —        | Leave unset (defaults to `true` in production)              |
   | `COOKIE_SAME_SITE`   | —        | See §4 (cookie topology) — `none` for two `*.vercel.app` hosts, `lax` for same-apex custom domains |
   | `SESSION_TTL_HOURS`  | —        | Default `168` (7 days)                                      |
   | `MONGODB_TIMEOUT_MS` | —        | Default `10000`                                             |

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
| Browser: `404` **and** CORS errors for URLs like `https://<api-host>/gallery` (no `/api` segment) | `VITE_API_BASE_URL` is missing the trailing `/api`. Set it to `https://<api-host>/api` in the **frontend** project and **redeploy the frontend** (Vite bakes the value at build time). |
| Login succeeds but session lost on refresh | Cookie topology — set `COOKIE_SAME_SITE=none` (vercel.app) or move both hosts to one apex (custom domains). Also confirm the site is served over HTTPS (secure cookies). |
| Frontend loads but all API calls fail    | `VITE_API_BASE_URL` missing or missing the trailing `/api`. Rebuild after changing it (Vite bakes it at build time). |
| First request after idle is slow         | Serverless cold start (DB connect + index verify). Normal; warm requests are fast.  |
| Build fails: `No Output Directory named "dist"` on the **API** project | The Vite framework preset was auto-applied (from the `vite` devDependency). Set Framework Preset = `Other`, clear Build Command + Output Directory, redeploy. `server/vercel.json` declares `"framework": null` to prevent this permanently. |
| Warning: `engines { "node": ">=20.19.0" } will automatically upgrade…` | Informational only — the range intentionally accepts any Node ≥ 20.19. Safe to ignore. |

---

## 8. What was changed in this repository for Vercel

Only four files — application code is untouched:

1. **`server/api/index.ts`** (new) — serverless adapter that reuses the exact
   same Express app; connects MongoDB + verifies indexes once per warm
   instance before serving; no `listen()`.
2. **`server/vercel.json`** (new) — one rewrite: `/api/(.*)` → the function.
3. **`server/tsconfig.json`** (modified) — `"include": ["src", "api"]` so the
   entrypoint is typechecked.
4. **`server/package.json`** (modified) — declares `"engines": { "node": ">=20.19.0" }`.

`server/src/index.ts` (the `listen()`-based local entrypoint) is unchanged and
remains the local development server. No routes, controllers, repositories or
auth logic were modified. Details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

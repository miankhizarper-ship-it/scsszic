# SCS Platform — Deployment & Architecture Reference

Technical companion to [`../GUIDE.md`](../GUIDE.md). This document records
what the backend looked like before Vercel preparation, what exactly changed,
why those are the *minimal correct* changes, and how the system behaves at
runtime on Vercel. It is written so an engineer can audit the deployment
surface without reading the whole codebase.

---

## 1. Architecture overview

```
Local development                       Vercel production
─────────────────                       ─────────────────
browser :3000 (Vite)                    Vercel project "scs-web" (client/)
  └─ /api proxy → :4000                 Vercel project "scs-api"  (server/)
                                            └─ /api/* → api/index.ts (fn)
Express src/index.ts                          └─ createApp()  ← same app
  connect → indexes → listen()                    └─ routes/ health·auth·content·admin
MongoDB 127.0.0.1:27017                 MongoDB Atlas (MONGODB_URI)
```

- **One Express app.** `server/src/app.ts` exposes `createApp()`, mounting
  everything under `/api`: `health`, `auth`, content resources, and
  `admin` (role-guarded). There are no duplicate route implementations and
  no fork between "local" and "cloud" behaviour — both entrypoints call the
  same factory.
- **One session mechanism.** HTTP-only signed cookie (`scs_session`),
  server-side session store in MongoDB. No JWT, no localStorage — nothing
  changed for the cloud.
- **Client base URL.** `client/src/services/apiClient.ts` is the single
  network layer: `VITE_API_BASE_URL ?? "/api"`, `credentials: "include"` on
  every call. Local dev keeps the Vite proxy; production sets the env var.

---

## 2. Inspection record (pre-change backend, for the audit trail)

| Aspect                      | Found state                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| Express entrypoint          | `createApp()` factory in `server/src/app.ts` (CORS → json → cookieParser → `/api` router → 404 → errors) |
| Server startup              | `server/src/index.ts`: `main()` = connectDatabase → ensureDatabaseIndexes → `app.listen(env.port)` + SIGINT/SIGTERM graceful shutdown |
| `app` export                | None needed — `createApp()` returns the instance; no singleton existed       |
| Route mounting              | `routes/index.ts` mounts health/auth/content/admin on one `/api` router      |
| MongoDB initialization      | `db/client.ts`: process-wide singleton `MongoClient`, in-flight-connect dedupe, ping-verified connect, masked-URI diagnostics |
| Environment loading         | `config/env.ts`: `dotenv/config`; production fail-fast (`MONGODB_URI` required, `SESSION_SECRET` ≥ 32); dev fallbacks documented in `.env.example` |
| Cookie posture              | `auth/cookies.ts`: `httpOnly` always; `secure`/`sameSite` from `COOKIE_SECURE` / `COOKIE_SAME_SITE` |
| Client API base             | `VITE_API_BASE_URL ?? "/api"`; Vite dev proxy `/api` → `http://localhost:4000` |
| Bun-specific APIs           | None in `server/src` (Bun/tsx are only local *runners*; the code is plain Node + ESM) |

Conclusion of the inspection: the codebase was already serverless-friendly.
The only structural mismatch was the **startup contract living inside the
`listen()` entrypoint** — which `server/api/index.ts` now reproduces without
touching `index.ts` itself.

---

## 3. Changes made for Vercel (complete list)

### 3.1 Added — `server/api/index.ts` (the only new code)

A thin adapter, ~70 lines, with three responsibilities:

1. **Reuse the real app** — `const app = createApp();` then, per request,
   `app(req, res)`. An Express application object *is* a Node request
   handler; `app.listen()` does exactly this internally. No controller,
   route, middleware or auth file was modified or duplicated.
2. **Reproduce the startup contract per serverless instance** —

   ```
   ready ??= (async () => {
     await connectDatabase();                    // verified round-trip
     await ensureDatabaseIndexes(getDatabase()); // idempotent
   })();
   ```

   The `ready` promise is module-level, so a warm Vercel instance performs
   the connect+index sequence **at most once** and every subsequent request
   awaits the same completed promise (microtask, no reconnect). A failed
   initialization resets `ready = null` so the next invocation retries —
   a transient Atlas blip self-heals instead of poisoning the instance.
3. **Preserve failure semantics** — if initialization fails, the error is
   logged (no URI/credential material, per `db/client.ts` policy) and the
   request still enters the Express app, so persistence-backed endpoints
   respond with the documented **503** service-unavailable envelope from
   `db/errors.ts` rather than an opaque platform 500.

It also exports `config = { api: { bodyParser: false } }` so Vercel does not
pre-consume request bodies — `express.json({ limit: "1mb" })` reads the raw
stream exactly as it does locally, keeping validation byte-identical.

### 3.2 Added — `server/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }]
}
```

Two responsibilities:

1. **`"framework": null`** — disables Vercel's framework auto-detection for
   the API project. Without it, the detector sees `vite` in
   `server/package.json` devDependencies (used only by `seed.ts`) and applies
   the *Vite preset*, which runs the `build` script (`tsc`, emits nothing due
   to `noEmit`) and then fails with `No Output Directory named "dist" found`.
   A serverless API has no static output; `framework: null` removes the
   build/output expectations entirely — the Node runtime bundles
   `api/index.ts` at deploy time on its own.
2. **The rewrite** — Vercel maps the filesystem function `api/index.ts` to
   the route `/api` only; deeper paths (`/api/auth/login`, `/api/events?…`)
   would 404 without it. The rewrite forwards the **original URL** to the
   function, so Express sees `/api/auth/login` and the existing
   `app.use("/api", apiRouter)` mount works unchanged. No other routing,
   headers, builds, or framework shims are configured.

### 3.3 Modified — `server/tsconfig.json`

`"include": ["src", "api"]` — extends local typechecking (`tsc --noEmit`)
to the new entrypoint so it is covered by `bun run typecheck` in CI and QA.
No compiler options changed.

### 3.4 Modified — `server/package.json`

Added `"engines": { "node": ">=20.19.0" }` (mirrors the monorepo root) so the
Vercel project pins a runtime that matches the code's expectations. No
dependency changes; no scripts changed.

### 3.5 Explicitly NOT changed

`src/index.ts`, all routes/controllers/repositories, auth + session logic,
validation schemas, audit logging, error handling, the client application,
Vite config, and both `.env.example` files. The production startup guard in
`config/env.ts` (refuse to boot without `MONGODB_URI` / long
`SESSION_SECRET`) is intentionally kept — it applies identically on Vercel.

---

## 4. Request lifecycle on Vercel

```
GET https://scs-api.vercel.app/api/events?category=competition
  → Vercel edge routing: no static file matches
  → rewrite /api/(.*) → /api  (server/vercel.json)
  → serverless function api/index.ts invoked with the ORIGINAL URL
      → initialize(): ready promise?  cold: connect + indexes (once)
                                      warm: resolved promise (≈0 ms)
      → app(req, res)                 → same middleware chain as local
      → express.json / cookieParser   → apiRouter (/api/events…)
      → repository → cached MongoClient pool → Atlas
  → response envelope { data, meta } or { message, errors? }
```

- **Cold start** (new instance): Node boot + module load + MongoDB connect
  (hundreds of ms against Atlas, capped by `MONGODB_TIMEOUT_MS`) + index
  verification (a handful of `createIndexes` calls, idempotent) → then the
  request is served. Subsequent requests on the same instance skip all of it.
- **Concurrency**: Vercel may run multiple instances; each builds its own
  `ready` promise — Atlas connection pools stay per-instance, which is the
  normal, correct serverless model.
- **Sessions** live in MongoDB (`sessions` collection, TTL index), not in
  instance memory, so any instance can serve any request — serverless-safe.

---

## 5. Environment variable reference (names only — values are secrets)

Backend (`scs-api` project):

| Variable             | Status on Vercel | Behaviour                                                                 |
| -------------------- | ---------------- | ------------------------------------------------------------------------- |
| `MONGODB_URI`        | **required**     | Atlas SRV connection string; missing → loud startup failure                |
| `MONGODB_DB_NAME`    | **required**     | Target database name                                                      |
| `SESSION_SECRET`     | **required**     | ≥ 32 chars; missing/short → loud startup failure (no fallback in prod)     |
| `CORS_ORIGIN`        | **required**     | Exact frontend origin; default `http://localhost:3000` would break the web app |
| `NODE_ENV`           | automatic        | Vercel sets `production` on prod deployments; drives fail-fast guards      |
| `COOKIE_SECURE`      | optional         | Unset → `true` in production (HTTPS-only cookies)                          |
| `COOKIE_SAME_SITE`   | optional         | Unset → `lax`; set `none` only for cross-site `*.vercel.app` topologies    |
| `SESSION_TTL_HOURS`  | optional         | Default `168`                                                             |
| `MONGODB_TIMEOUT_MS` | optional         | Default `10000`; also bounds serverless cold-start DB waits                |
| `PORT`               | ignored          | Serverless has no listener; harmless if set                                |
| `DEV_SEED_*`         | not needed       | Only used by the local seeder; do not set in the cloud                     |

Frontend (`scs-web` project):

| Variable            | Status   | Behaviour                                                                     |
| ------------------- | -------- | ----------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | required | `https://<api-host>/api` — trailing `/api` mandatory; baked in at build time  |

No values are committed anywhere: `.gitignore` excludes `.env`; the repo
ships only `server/.env.example` with empty values.

---

## 6. Security posture (unchanged by the migration)

- Auth surfaces remain `requireAuth` / `requireRole("admin")`; the Vercel
  adapter adds no bypass and exposes no additional endpoint.
- Session cookie: `HttpOnly` always, `Secure` in production, signed with
  `SESSION_SECRET`; server-side store in MongoDB; origin-guarded state
  changes as before.
- Startup guards run per instance on Vercel: a misconfigured deployment
  fails loudly (see troubleshooting) instead of serving broken sessions.
- MongoDB credentials live only in the Vercel env store; connection
  diagnostics mask userinfo (`maskMongoUri`) and never echo the URI.
- Client JS still cannot read the session cookie; nothing moved to
  localStorage/sessionStorage.

---

## 7. Local verification results (executed during this preparation)

| Check                                              | Result |
| -------------------------------------------------- | ------ |
| `server` TypeScript (`tsc --noEmit`, incl. `api/`) | PASS   |
| `client` TypeScript (`tsc -b`)                     | PASS   |
| ESLint (`client`)                                  | PASS   |
| Client production build (`vite build`)             | PASS   |
| Local API start (`src/index.ts`, `listen()` path)  | PASS — `/api/health` 200 |
| Local frontend start (Vite :3000)                  | PASS   |
| Vite proxy → API (`:3000/api/health`)              | PASS   |
| **Serverless-path smoke** (`api/index.ts` handler invoked without `listen`, like Vercel): health 200 (cold) · health 200 (warm, no reconnect) · `/api/auth/me` anonymous 401 · unknown `/api/*` 404 | PASS |

The chunk-size build notice (`index-*.js` > 500 kB) is the known, previously
investigated informational item; no action was taken within this scope.

---

## 8. Known limitations (deployment considerations, not defects)

1. **Cross-site cookies on two `*.vercel.app` hosts** — Chrome/Firefox accept
   `SameSite=None; Secure`; Safari ITP blocks them, so sessions do not
   persist there. Mitigation: custom domains on one apex (recommended) or
   same-site hosting arrangements.
2. **Cold starts** — first request after idle pays Node boot + DB connect.
   Acceptable for a society site; Vercel Pro / provisioned concurrency can
   soften it later if ever needed.
3. **Function limits** — Hobby plan caps execution duration and payload
   sizes; the API's workloads (JSON CRUD ≤ 1 MB bodies) fit comfortably.
4. **Atlas network access** — `0.0.0.0/0` is the practical default for
   serverless egress; tighten via Atlas Private Endpoint / Vercel Secure
   Compute if the plan supports it.

---

## 9. Deployment checklist (condensed)

- [ ] Atlas cluster + DB user + `0.0.0.0/0` network rule
- [ ] Repo pushed to Git; Vercel project `scs-api` (Root `server`, no build)
- [ ] `MONGODB_URI`, `MONGODB_DB_NAME`, `SESSION_SECRET`, `CORS_ORIGIN` set
- [ ] Vercel project `scs-web` (Root `client`, Vite preset)
- [ ] `VITE_API_BASE_URL` set (ends with `/api`)
- [ ] `scs-api` `/api/health` → 200
- [ ] `bun run db:seed` executed once against Atlas (from local machine)
- [ ] Cookie topology decided (`COOKIE_SAME_SITE`) — see GUIDE §4
- [ ] GUIDE §6 smoke test checklist passed

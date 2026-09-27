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
2. **The rewrite** — a catch-all `/(.*)` → `/api` sends every request on the
   API host to the Express app (correct for a backend-only project with no
   static files). The function receives the **original URL**, so Express sees
   `/api/auth/login` and the existing `app.use("/api", apiRouter)` mount
   works unchanged. Two deliberate consequences:
   - known `/api/*` routes are served exactly as locally;
   - **stray paths** (e.g. `/gallery` from a client whose `VITE_API_BASE_URL`
     is missing the `/api` suffix) reach Express instead of dying at the
     edge — the app's JSON 404 (`notFoundHandler`) responds **with CORS
     headers** (the `cors` middleware is global), so misconfiguration shows
     up as a legible 404 instead of an opaque edge 404 that browsers report
     as a CORS failure.
   No other routing, headers, builds, or framework shims are configured.

### 3.3 Added — `client/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

SPA fallback for the frontend project. React Router owns URLs such as
`/events`, `/blogs`, `/login`; on a hard refresh (or a shared direct link)
the request hits the Vercel edge **before** the app has loaded, no static
file exists at that path, and without this rewrite Vercel answers its own
`404 NOT_FOUND`. Vercel's routing checks the filesystem first, so real
assets (`/assets/*`, favicon) are never intercepted — only unmatched paths
fall back to `index.html`, where the router takes over. This mirrors the
development behavior of the Vite dev server, which returns `index.html`
for unknown paths out of the box.

### 3.4 Modified — `server/tsconfig.json`

`"include": ["src", "api"]` — extends local typechecking (`tsc --noEmit`)
to the new entrypoint so it is covered by `bun run typecheck` in CI and QA.
No compiler options changed.

### 3.5 Modified — `server/package.json`

Added `"engines": { "node": ">=20.19.0" }` (mirrors the monorepo root) so the
Vercel project pins a runtime that matches the code's expectations. No
dependency changes; no scripts changed.

### 3.6 Explicitly NOT changed

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
  → rewrite /(.*) → /api  (server/vercel.json)
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

---

## 9. Phase 10A — Cloudflare R2 media storage (additive)

### 9.1 Architecture

New server-only storage service — `server/src/services/storage/`:

| File | Responsibility |
| --- | --- |
| `config.ts` | Reads the five `R2_*` variables; `null` until all five exist (feature-detect, no boot-time fail-fast) |
| `validation.ts` | MIME allow-lists, magic-byte sniffing, folder enum, 4 MB cap, object-key pattern |
| `keys.ts` | Server-generated keys `uploads/<folder>/<yyyy>/<mm>/<uuid>.<ext>` |
| `multipart.ts` | multer memoryStorage wrapper — in-memory only, multer errors → 413/400 |
| `index.ts` | `uploadObject` / `deleteObject` / `headObject` / `isStorageConfigured`; StorageError codes → controller maps to 415/413/400/503/502 |

Endpoints (both inside the existing `requireAdmin` namespace guard):

```
POST   /api/admin/uploads   multipart: file (binary), folder (enum)  → 201 { data: { url, key, contentType, size } }
DELETE /api/admin/uploads?key=<key>                                  → 200 { data: { key, deleted: true } }
```

Client: `apiFetch` passes FormData through untouched (browser sets the
multipart boundary); `adminService.uploadMedia(file, folder)` is the single
boundary; `UploadMediaButton` sits beside every CMS media URL input — the
input keeps working for external/local URLs, so no UX redesign and no
permission/UI changes.

### 9.2 URL strategy (decision record)

MongoDB media fields have always been plain strings (`/src/assets/…` seed
paths; gallery/videos already validate `(/|https?://…)` via `mediaRefSchema`).
The lowest-friction production model is therefore **public bucket URLs**:
`url = ${R2_PUBLIC_URL}/${key}` with `R2_PUBLIC_URL` being the bucket's
r2.dev public URL or a custom domain. Stored metadata stays ordinary strings,
every existing public renderer keeps working unchanged, and old + new URLs
are freely interchangeable. Signed server-generated access URLs were rejected
(expires — bad for stored metadata); server proxying was rejected (bandwidth
through serverless functions). Bucket public-read is a manual Cloudflare
console step — the app never creates buckets or credentials.

### 9.3 Serverless + security notes

- Request bytes live only in multer memory buffers during one invocation —
  no filesystem persistence; the S3 client is created lazily and cached per
  warm instance (same model as `db/client.ts`).
- 4 MB file cap keeps requests under Vercel's 4.5 MB serverless body limit.
- Credentials live in backend env vars only; they never reach the client
  bundle, logs, audit records or API responses. Failures are summarized by
  error name/code (no raw SDK objects, no signed URLs).
- Validation order: input validation (empty/size/MIME sniffing) runs BEFORE
  the configuration gate, so malformed uploads answer 415/413/400 even on a
  server without R2 configured, and 503 is reserved for server state.
- Delete accepts only keys matching the app's own generated-key pattern —
  arbitrary object deletion is impossible even for authenticated admins of
  a different deployment sharing the bucket.
- Audit actions `media.uploaded` / `media.deleted` (folder/type/size scalars
  only) flow through the existing centralized audit logger.

### 9.4 Phase 10A verification (executed locally)

- server `tsc --noEmit` CLEAN · client `tsc -b` CLEAN · both ESLint CLEAN ·
  client production build OK (pre-existing chunk advisory only)
- `scripts/qa-phase10a-storage.ts` (fake S3 client, real HTTP + auth):
  34/34 PASS — authorized 201 upload with PutObject wiring asserted, MIME
  mismatch/unsupported 415, oversized 413, anonymous 401, member 403,
  delete auth + key checks, R2 upstream failure → 502 envelope, head
  NotFound → null, seeded `/src/assets/…` media untouched in public APIs
- `scripts/qa-phase10a-api.sh` (live server WITHOUT R2 env): 21/21 PASS —
  validation precedes the 503 storage gate; compatibility of all public
  media URLs confirmed
- Regression: `qa-phase9i-api.sh` 143/143 PASS after the integration
- Browser (dev server + agent-browser): admin login, Upload buttons rendered
  on event/gallery/videos/blog forms, public gallery + home render all
  seeded images (network-verified, no page errors)

## 10. Deployment checklist (condensed)

- [ ] Atlas cluster + DB user + `0.0.0.0/0` network rule
- [ ] Repo pushed to Git; Vercel project `scs-api` (Root `server`, no build)
- [ ] `MONGODB_URI`, `MONGODB_DB_NAME`, `SESSION_SECRET`, `CORS_ORIGIN` set
- [ ] Vercel project `scs-web` (Root `client`, Vite preset)
- [ ] `VITE_API_BASE_URL` set (ends with `/api`)
- [ ] `scs-api` `/api/health` → 200
- [ ] `bun run db:seed` executed once against Atlas (from local machine)
- [ ] Cookie topology decided (`COOKIE_SAME_SITE`) — see GUIDE §4
- [ ] GUIDE §6 smoke test checklist passed
- [ ] (optional) R2 bucket + public URL + five `R2_*` vars on the backend — see GUIDE §8

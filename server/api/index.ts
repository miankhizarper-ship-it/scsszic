import type { IncomingMessage, ServerResponse } from "node:http";

import { createApp } from "../src/app.js";
import { connectDatabase, getDatabase } from "../src/db/client.js";
import { ensureDatabaseIndexes } from "../src/db/indexes.js";
import { logger } from "../src/utils/logger.js";

/**
 * Vercel serverless entrypoint — production deploy target for the SCS API.
 *
 * This is an ADAPTER, not a second server. It reuses the exact same Express
 * application as src/index.ts (createApp()) — same routes, same middleware,
 * same auth — and only replaces the long-lived `app.listen()` startup with
 * the per-instance initialization Vercel's serverless runtime expects:
 *
 *   src/index.ts (local):   connect → indexes → app.listen(PORT)
 *   api/index.ts  (Vercel): connect → indexes → handler(req, res)
 *
 * Connection reuse (serverless model):
 *   Vercel keeps a warm Lambda instance alive across invocations. The
 *   module-level `ready` promise runs connectDatabase() + index verification
 *   AT MOST ONCE per warm instance, so the MongoDB driver's pool is created
 *   once and reused for every request — never one connection per request.
 *   Cold starts (new instance) pay the connection cost once, identically to
 *   the local server's startup order. A failed initialization is NOT cached:
 *   the next invocation retries, so a transient Atlas blip self-heals.
 *
 * Failure semantics preserved: if MongoDB is unreachable, requests still
 * flow into the Express app — repositories surface the documented 503
 * service-unavailable envelope (db/errors.ts) instead of an opaque 500.
 *
 * Routing: server/vercel.json rewrites /api/* to this function, so Express
 * receives the ORIGINAL path (e.g. /api/auth/login) and mounts it under the
 * same "/api" root as local development. No route duplication anywhere.
 */

/** Vercel: disable the platform's pre-parsing so express.json() reads the
 *  raw stream itself — byte-for-byte the same body handling as local dev. */
export const config = { api: { bodyParser: false } };

/** The one and only SCS Express app instance for this serverless instance. */
const app = createApp();

/** Per-instance init cache (undefined = not started, promise = in/done). */
let ready: Promise<void> | null = null;

function initialize(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectDatabase();
      // Same startup contract as src/index.ts — verified, idempotent.
      await ensureDatabaseIndexes(getDatabase());
    })();
    // Never cache a failed init: next request retries the connection.
    void ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    await initialize();
  } catch (error) {
    // Logged once per failed cold start; the app below responds with the
    // standard 503 envelope when persistence is actually needed.
    logger.error(
      "Serverless initialization failed:",
      error instanceof Error ? error.message : error,
    );
  }

  // The Express app IS a request handler — this is what app.listen() calls
  // internally. Delegating keeps controllers/routes/middleware untouched.
  app(req, res);
}

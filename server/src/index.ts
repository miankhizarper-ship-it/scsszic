import { createApp } from "./app.js";
import { closeDatabase, connectDatabase, getDatabase } from "./db/client.js";
import { ensureDatabaseIndexes } from "./db/indexes.js";
import { ensureDefaultCategories } from "./repositories/content/categoriesRepository.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

/**
 * SCS API server entry point.
 *
 * Startup order (spec §22) — the server accepts traffic that needs
 * persistence ONLY after MongoDB is connected and indexes are verified:
 *
 *   1. "SCS server starting…"          process boots, config resolved
 *   2. connectDatabase()               verified MongoDB round-trip
 *   3. ensureDatabaseIndexes()         unique/TTL indexes (idempotent)
 *   4. app.listen()                    "API ready — listening on …"
 *
 * A failed database connection aborts startup with an actionable error
 * (never echoing the URI or credentials) instead of serving 503s forever.
 */

async function main(): Promise<void> {
  logger.info("SCS server starting…");

  await connectDatabase();
  await ensureDatabaseIndexes(getDatabase());
  // Phase 10C — seed the managed category vocabulary for sections that have
  // none (idempotent; admin-maintained lists are never overwritten).
  await ensureDefaultCategories();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`API ready — listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  /** Graceful shutdown: stop accepting, close MongoDB pool, exit. */
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — closing server…`);
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
    // Hard stop if connections refuse to drain.
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Fatal startup error:", error instanceof Error ? error.message : error);
  process.exit(1);
});

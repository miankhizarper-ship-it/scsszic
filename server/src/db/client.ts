import { MongoClient, type Db } from "mongodb";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * MongoDB connection — Phase 8 persistence foundation.
 *
 * A single MongoClient is created per process and reused for every request
 * (the driver maintains its own connection pool). Connection lifecycle:
 *
 *   connectDatabase()  explicit, awaited during server startup BEFORE the
 *                      HTTP listener accepts traffic that needs persistence
 *   getDatabase()      lazy accessor used by repositories/collections
 *   pingDatabase()     health probe (short timeout, never throws)
 *   closeDatabase()    graceful shutdown hook
 *
 * Security / diagnostics:
 *  - MONGODB_URI is never logged. Startup diagnostics print a MASKED uri
 *    (scheme + host + db name, credentials redacted).
 *  - Connection failures produce an actionable error (what to check, where
 *    to configure) without echoing the URI or any credentials.
 */

let client: MongoClient | null = null;
let database: Db | null = null;
let connecting: Promise<Db> | null = null;

/** Mask userinfo in a MongoDB URI for safe diagnostics. */
export function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = "•••";
      parsed.password = "•••";
    }
    return parsed.toString();
  } catch {
    return "mongodb://<unparseable-uri>";
  }
}

function mongoHosts(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return "unknown-host";
  }
}

/**
 * Connect (once) and return the database handle. Safe to call repeatedly —
 * subsequent calls await the same connection.
 */
export async function connectDatabase(): Promise<Db> {
  if (database) return database;
  if (connecting) return connecting;

  connecting = (async () => {
    const startedAt = Date.now();
    logger.info(
      `Connecting to MongoDB at ${mongoHosts(env.mongodbUri)} (db: ${env.mongodbDbName})…`,
    );

    client = new MongoClient(env.mongodbUri, {
      // Fail fast with an actionable message instead of hanging the boot.
      serverSelectionTimeoutMS: env.mongodbTimeoutMs,
      connectTimeoutMS: env.mongodbTimeoutMs,
      // Retry writes once for resilience against transient blips.
      retryWrites: true,
      appName: "scs-server",
    });

    try {
      await client.connect();
      // Force an actual round-trip so "connected" means "verified reachable".
      database = client.db(env.mongodbDbName);
      await database.command({ ping: 1 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      // NEVER log the URI itself — only the masked form and remediation steps.
      logger.error(
        `MongoDB connection failed after ${Date.now() - startedAt}ms (${maskMongoUri(env.mongodbUri)}).`,
      );
      throw new Error(
        "Could not connect to MongoDB. Check that the server is running and reachable, " +
          "and that MONGODB_URI / MONGODB_DB_NAME in server/.env are correct. " +
          `Driver detail: ${detail}`,
      );
    }

    logger.info(
      `MongoDB connected (${mongoHosts(env.mongodbUri)}, db: ${env.mongodbDbName}) in ${Date.now() - startedAt}ms`,
    );
    return database;
  })();

  try {
    return await connecting;
  } finally {
    // Allow future reconnects after a fatal failure while avoiding duplicate
    // connection attempts for concurrent callers of a successful one.
    if (!database) connecting = null;
  }
}

/** Database handle for repositories — throws if startup skipped connectDatabase(). */
export function getDatabase(): Db {
  if (!database) {
    throw new Error(
      "Database not initialized. Ensure connectDatabase() completed before serving requests.",
    );
  }
  return database;
}

/** Short-timeout ping for the health endpoint. Resolves false — never throws. */
export async function pingDatabase(): Promise<boolean> {
  if (!client || !database) return false;
  try {
    await database.command({ ping: 1 }, { timeoutMS: 2_000 });
    return true;
  } catch {
    return false;
  }
}

/** Graceful shutdown — closes the driver pool. Idempotent. */
export async function closeDatabase(): Promise<void> {
  if (!client) return;
  try {
    await client.close();
    logger.info("MongoDB connection closed.");
  } catch (error) {
    logger.warn("MongoDB close encountered an error:", error);
  } finally {
    client = null;
    database = null;
    connecting = null;
  }
}

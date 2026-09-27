import { MongoSessionStore } from "../repositories/mongoSessionStore.js";
import { MongoUserRepository } from "../repositories/mongoUserRepository.js";

/**
 * Composition root for the authentication persistence layer.
 *
 * PHASE 8: these singletons are MongoDB-backed implementations of the same
 * Phase 7 interfaces. Route handlers, middleware, and controllers are
 * untouched — the swap happened entirely behind `UserRepository` and
 * `SessionStore`.
 *
 * The repositories resolve their collections lazily (per call), so these
 * bindings can exist at module load while `connectDatabase()` runs during
 * startup. Calling any method before the connection completes will fail
 * with a clear "Database not initialized" error — the server deliberately
 * starts listening only after the database is connected.
 */
export const userRepository = new MongoUserRepository();
export const sessionStore = new MongoSessionStore();

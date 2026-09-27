import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";

/**
 * Express application factory.
 *
 * Phase 7 added cookie parsing (HTTP-only session cookies) and JSON body
 * limits sized for auth payloads. Phase 8 mounts the MongoDB-backed content
 * router behind the same /api root — see routes/index.ts.
 *
 * Middleware order matters:
 *   cors (credentials) → json → cookieParser → /api router → 404 → errors
 */
export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  // Required by the auth layer: req.cookies[SESSION_COOKIE_NAME]. Cookies are
  // HTTP-only (unreadable by client JS) — this parser only serves the server.
  app.use(cookieParser());

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

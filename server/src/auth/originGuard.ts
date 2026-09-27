import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

/**
 * Origin verification for state-changing auth routes (spec §15 — CSRF posture).
 *
 * Final approach, documented:
 *  1. The session cookie is SameSite=Lax by default, which already blocks
 *     cross-site POSTs from third-party pages in every modern browser.
 *  2. As defense-in-depth, this middleware additionally requires that the
 *     Origin header (sent automatically on cross-origin and same-origin
 *     fetch POSTs by browsers) matches the allow-list below when present.
 *  3. Requests without an Origin (curl, server-to-server, some same-origin
 *     tooling) are allowed — Origin checking is a browser-attack mitigation,
 *     and non-browser clients have no ambient-cookie CSRF risk surface.
 *
 * This deliberately avoids a full CSRF-token framework: with HTTP-only +
 * SameSite cookies plus Origin verification, the added value of synchronizer
 * tokens is marginal for this API surface. The middleware is the single choke
 * point if a token strategy is ever layered in.
 */

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const add = (value: string | undefined) => {
    if (!value) return;
    try {
      // Store normalized origins (scheme://host[:port], no trailing slash).
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed values — never trust env-formatted URLs blindly.
    }
  };

  add(env.corsOrigin);
  // Local dev conveniences: Vite (3000) and the API itself (4000), any host form.
  add(`http://localhost:${env.port === 4000 ? 4000 : env.port}`);
  add("http://localhost:3000");
  add("http://127.0.0.1:3000");
  add(`http://localhost:${env.port}`);
  add(`http://127.0.0.1:${env.port}`);

  return origins;
}

const ALLOWED_ORIGINS = allowedOrigins();

export function verifySameOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;

  if (!origin) {
    next(); // Non-browser client — see note 3 above.
    return;
  }

  try {
    if (ALLOWED_ORIGINS.has(new URL(origin).origin)) {
      next();
      return;
    }
  } catch {
    // fall through to rejection
  }

  res.status(403).json({ message: "Request origin is not allowed." });
}

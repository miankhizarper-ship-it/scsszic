import type { ErrorRequestHandler, Request, Response } from "express";

import { logger } from "../utils/logger.js";

/** 404 for unmatched API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/** Central error handler — keep responses uniform; never leak stack traces. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Malformed JSON request bodies (body-parser "entity.parse.failed") are a
  // client input problem, not a server fault — answer 400 like every other
  // validation failure. Phase 9C (Events CMS) sends structured JSON bodies,
  // so this keeps the existing `{ message }` convention honest.
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    res.status(400).json({ message: "Invalid JSON body." });
    return;
  }
  // Phase 9I hardening: bodies beyond the 1mb JSON limit are a client input
  // problem too — body-parser classifies them as "entity.too.large". They used
  // to fall through to the generic 500, which misreported a client mistake as
  // a server fault; 413 is the correct, honest status.
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json({ message: "Request body is too large." });
    return;
  }
  logger.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
};

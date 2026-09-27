import type { Request, Response } from "express";

import { pingDatabase } from "../db/client.js";

/**
 * GET /api/health — liveness probe for the API server.
 *
 * Phase 8: the probe now reflects the REAL persistence state (spec §22) —
 * `database: "up"` only after a verified MongoDB round-trip. The HTTP status
 * stays 200 for liveness tooling; consumers read the `database` field to
 * decide whether content-dependent features can work.
 */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const databaseUp = await pingDatabase();

  res.status(200).json({
    status: "ok",
    service: "scs-server",
    version: "0.1.0",
    database: databaseUp ? "up" : "down",
    timestamp: new Date().toISOString(),
  });
}

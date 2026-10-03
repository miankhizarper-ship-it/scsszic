import { Router } from "express";

import { requireAnyRole, requireAuth } from "../auth/authMiddleware.js";
import { getImagekitUploadAuth } from "../controllers/media/imagekit.controller.js";

/**
 * /api/media routes (Task 37) — community media upload signing.
 *
 *   GET /api/media/imagekit-auth?folder=feed|avatar
 *       Mint a short-lived ImageKit upload token for the browser-direct
 *       upload path (feed artwork / member avatars).
 *       requireAuth + member|manage|admin — plain "user" accounts and
 *       anonymous callers are rejected upstream of the controller.
 *
 * The server only SIGNS; the file bytes go browser → ImageKit. Uploads
 * therefore cost zero serverless time and the private key stays server-side.
 */
export const mediaRouter = Router();

const COMMUNITY_ROLES = ["member", "manage", "admin"] as const;

mediaRouter.get(
  "/media/imagekit-auth",
  requireAuth,
  requireAnyRole(COMMUNITY_ROLES),
  getImagekitUploadAuth,
);

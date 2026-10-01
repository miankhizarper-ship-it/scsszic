import { Router } from "express";

import { requireAuth, requireRole } from "../auth/authMiddleware.js";
import {
  createMyFeedPost,
  getMyMemberProfile,
  updateMyMemberProfile,
} from "../controllers/me.controller.js";

/**
 * /api/me routes — the signed-in member's self-service surface (Task 29).
 *
 *   GET /api/me/member-profile   the member's own directory record
 *                                (requireRole("member"))
 *   PUT /api/me/member-profile   self-editable profile fields — skills,
 *                                interests, about/bio, social links,
 *                                projects, avatar, location, department
 *                                (requireRole("member"))
 *   POST /api/me/feed            publish a community post as the member
 *                                (requireRole("member"), 1/minute throttle)
 *
 * Plain "user" accounts get a 403 here BY DESIGN — members-only powers live
 * on this namespace, and every handler re-verifies the account↔member
 * linkage against the database (the role alone never authorizes a write).
 * Likes/comments (user-visible powers) stay on the content router's
 * requireAuth endpoints — every signed-in account may engage.
 */
export const meRouter = Router();

meRouter.get("/me/member-profile", requireAuth, requireRole("member"), getMyMemberProfile);
meRouter.put("/me/member-profile", requireAuth, requireRole("member"), updateMyMemberProfile);
meRouter.post("/me/feed", requireAuth, requireRole("member"), createMyFeedPost);

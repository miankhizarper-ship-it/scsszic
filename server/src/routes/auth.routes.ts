import { Router } from "express";

import {
  getAdminPing,
  getMe,
  postLogin,
  postLogout,
  postSignup,
} from "../controllers/auth.controller.js";
import { optionalAuth, requireAuth, requireRole } from "../auth/authMiddleware.js";
import { verifySameOrigin } from "../auth/originGuard.js";

/**
 * /api/auth routes — Phase 7 authentication foundation.
 *
 *  POST /api/auth/signup        create account + session   (origin-checked)
 *  POST /api/auth/login         email/username + password  (origin-checked)
 *  GET  /api/auth/me            current session probe      (optionalAuth)
 *  POST /api/auth/logout        invalidate session         (origin-checked)
 *  GET  /api/auth/admin/ping    authorization smoke test   (requireAuth + admin)
 */
export const authRouter = Router();

authRouter.post("/auth/signup", verifySameOrigin, postSignup);
authRouter.post("/auth/login", verifySameOrigin, postLogin);
authRouter.get("/auth/me", optionalAuth, getMe);
authRouter.post("/auth/logout", verifySameOrigin, optionalAuth, postLogout);

authRouter.get("/auth/admin/ping", requireAuth, requireRole("admin"), getAdminPing);

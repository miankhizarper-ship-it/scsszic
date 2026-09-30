import { Router } from "express";

import {
  getAdminPing,
  getMe,
  getVerifyEmail,
  postLogin,
  postLogout,
  postResendVerification,
  postSignup,
} from "../controllers/auth.controller.js";
import { getGoogleAuthStart, getGoogleCallback } from "../controllers/googleAuth.controller.js";
import { optionalAuth, requireAuth, requireRole } from "../auth/authMiddleware.js";
import { verifySameOrigin } from "../auth/originGuard.js";

/**
 * /api/auth routes — Phase 7 authentication foundation + email verification
 * + Google OAuth.
 *
 *  POST /api/auth/signup                 create account + session   (origin-checked)
 *  POST /api/auth/login                  email/username + password  (origin-checked)
 *  GET  /api/auth/me                     current session probe      (optionalAuth)
 *  POST /api/auth/logout                 invalidate session         (origin-checked)
 *  GET  /api/auth/verify-email           email-link verification    (public — the token IS the credential)
 *  POST /api/auth/resend-verification    fresh link for unverified  (optionalAuth — session OR {email} body, origin-checked)
 *  GET  /api/auth/google                 start "Continue with Google" (302 to Google; state cookie = CSRF)
 *  GET  /api/auth/google/callback        Google lands here          (public — code+state IS the credential)
 *  GET  /api/auth/admin/ping             authorization smoke test   (requireAuth + admin)
 */
export const authRouter = Router();

authRouter.post("/auth/signup", verifySameOrigin, postSignup);
authRouter.post("/auth/login", verifySameOrigin, postLogin);
authRouter.get("/auth/me", optionalAuth, getMe);
authRouter.post("/auth/logout", verifySameOrigin, optionalAuth, postLogout);
authRouter.get("/auth/verify-email", getVerifyEmail);
// optionalAuth: signed-in callers resend for their own account; anonymous
// callers may pass { email } (the "check your inbox" page path). The
// controller enforces the throttle + anti-enumeration rules.
authRouter.post("/auth/resend-verification", verifySameOrigin, optionalAuth, postResendVerification);

// Google OAuth — browser NAVIGATIONS, not fetches: the origin guard does not
// apply; the HTTP-only state cookie is the CSRF defense for the callback.
authRouter.get("/auth/google", getGoogleAuthStart);
authRouter.get("/auth/google/callback", getGoogleCallback);

authRouter.get("/auth/admin/ping", requireAuth, requireRole("admin"), getAdminPing);

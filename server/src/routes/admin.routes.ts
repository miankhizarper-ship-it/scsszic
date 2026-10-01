import { Router } from "express";

import {
  requireAdminOrPermission,
  requireAdminSection,
  requirePanelAccess,
} from "../auth/authMiddleware.js";
import { getAdminPing } from "../controllers/admin/admin.controller.js";
import { getAdminDashboard } from "../controllers/admin/dashboard.controller.js";
import {
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvent,
  listAdminEvents,
  updateAdminEvent,
  updateAdminEventStatus,
} from "../controllers/admin/adminEvents.controller.js";
import {
  createAdminBlog,
  deleteAdminBlog,
  getAdminBlog,
  listAdminBlogs,
  updateAdminBlog,
  updateAdminBlogStatus,
} from "../controllers/admin/adminBlogs.controller.js";
import {
  createAdminAlumnus,
  deleteAdminAlumnus,
  getAdminAlumnus,
  listAdminAlumni,
  updateAdminAlumnus,
} from "../controllers/admin/adminAlumni.controller.js";
import {
  createAdminMember,
  deleteAdminMember,
  getAdminMember,
  listAdminMemberCandidates,
  listAdminMembers,
  updateAdminMember,
  updateAdminMemberStatus,
} from "../controllers/admin/adminMembers.controller.js";
import {
  createAdminTeamCard,
  deleteAdminTeamCard,
  getAdminTeamCard,
  listAdminTeam,
  updateAdminTeamCard,
} from "../controllers/admin/adminTeam.controller.js";
import {
  createAdminProject,
  deleteAdminProject,
  getAdminProject,
  listAdminProjects,
  updateAdminProject,
  updateAdminProjectStatus,
} from "../controllers/admin/adminProjects.controller.js";
import {
  createAdminFeedPost,
  deleteAdminFeedPost,
  getAdminFeedPost,
  listAdminFeed,
  updateAdminFeedPost,
  updateAdminFeedPostStatus,
} from "../controllers/admin/adminFeed.controller.js";
import {
  createAdminAlbum,
  deleteAdminAlbum,
  getAdminAlbum,
  listAdminGallery,
  updateAdminAlbum,
  updateAdminAlbumStatus,
} from "../controllers/admin/adminGallery.controller.js";
import {
  createAdminVideo,
  deleteAdminVideo,
  getAdminVideo,
  listAdminVideos,
  updateAdminVideo,
  updateAdminVideoStatus,
} from "../controllers/admin/adminVideos.controller.js";
import {
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../controllers/admin/adminUsers.controller.js";
import { listAdminAudit } from "../controllers/admin/adminAudit.controller.js";
import {
  deleteAdminMedia,
  uploadAdminMedia,
} from "../controllers/admin/adminUploads.controller.js";
import {
  getAdminSettings,
  updateAdminSettings,
} from "../controllers/admin/adminSettings.controller.js";
import {
  addAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  renameAdminCategory,
} from "../controllers/admin/adminCategories.controller.js";
import { getAdminSlugCheck } from "../controllers/admin/adminSlug.controller.js";
import { generateAdminAiField } from "../controllers/admin/adminAi.controller.js";
import { isSlugCheckSection } from "../repositories/content/slugAvailabilityRepository.js";
import { uploadSingleFile } from "../services/storage/multipart.js";

/**
 * /api/admin routes — Phase 9A (admin foundation).
 *
 * The ENTIRE namespace sits behind requireAdmin:
 *   anonymous              → 401 (no/invalid session cookie)
 *   authenticated member   → 403 (role check)
 *   authenticated admin    → allowed
 *
 * Authorization is decided HERE, server-side, over the existing HTTP-only
 * cookie session — there is no JWT, no admin token, and no second auth
 * system. Client-side admin checks are routing UX only and carry no
 * security weight.
 *
 * Phase 9A shipped the smoke-test endpoint; Phase 9B adds the dashboard;
 * Phase 9C adds the Events CMS:
 *  GET    /api/admin/ping            admin authorization smoke test (Phase 9A)
 *  GET    /api/admin/dashboard       real MongoDB counts + recent content (Phase 9B)
 *  GET    /api/admin/events          list + search/filter/sort/paginate (Phase 9C)
 *  GET    /api/admin/events/:id      single event (Phase 9C)
 *  POST   /api/admin/events          create (Phase 9C)
 *  PATCH  /api/admin/events/:id      partial update (Phase 9C)
 *  PATCH  /api/admin/events/:id/status  lifecycle transition (Phase 9C)
 *  DELETE /api/admin/events/:id      delete (Phase 9C)
 *
 * Phase 9D adds the Blogs CMS (same conventions, publication lifecycle):
 *  GET    /api/admin/blogs           list + search/filter/sort/paginate
 *  GET    /api/admin/blogs/:id      single blog (any status)
 *  POST   /api/admin/blogs           create
 *  PATCH  /api/admin/blogs/:id      partial update
 *  PATCH  /api/admin/blogs/:id/status  draft/published/archived transition
 *  DELETE /api/admin/blogs/:id      delete
 *
 * Phase 9E adds the Alumni + Members CMS (same conventions):
 *  GET    /api/admin/alumni          list + search/filter/sort/paginate
 *  GET    /api/admin/alumni/:id     single profile
 *  POST   /api/admin/alumni          create
 *  PATCH  /api/admin/alumni/:id     partial update
 *  DELETE /api/admin/alumni/:id     delete
 *  (no alumni status route — the alumni model has no lifecycle field)
 *  GET    /api/admin/members         list + search/filter/sort/paginate
 *  GET    /api/admin/members/:id    single member (any directory status)
 *  POST   /api/admin/members         create
 *  PATCH  /api/admin/members/:id    partial update
 *  PATCH  /api/admin/members/:id/status  active/alumni/archived transition
 *  DELETE /api/admin/members/:id    delete
 *
 * Phase 9F adds the Projects + Feed CMS (same conventions):
 *  GET    /api/admin/projects        list + search/filter/sort/paginate
 *  GET    /api/admin/projects/:id   single project (any status)
 *  POST   /api/admin/projects        create
 *  PATCH  /api/admin/projects/:id   partial update
 *  PATCH  /api/admin/projects/:id/status  active/completed/archived transition
 *  DELETE /api/admin/projects/:id   delete
 *  GET    /api/admin/feed            list + search/filter/sort/paginate
 *  GET    /api/admin/feed/:id      single post (any status)
 *  POST   /api/admin/feed            create
 *  PATCH  /api/admin/feed/:id      partial update
 *  PATCH  /api/admin/feed/:id/status  published/archived transition
 *  DELETE /api/admin/feed/:id      delete
 *
 * Phase 9G adds the Gallery + Videos CMS (same conventions). The public
 * domain calls the videos "watch videos"; the admin route keeps the
 * intuitive /videos path while payloads stay the exact WatchVideo shape.
 *  GET    /api/admin/gallery         list + search/filter/sort/paginate
 *  GET    /api/admin/gallery/:id    single album (any status)
 *  POST   /api/admin/gallery         create
 *  PATCH  /api/admin/gallery/:id    partial update (embedded photo array —
 *                                    order, captions, add/remove — is the
 *                                    model's own photo management surface;
 *                                    photoCount is recomputed server-side)
 *  PATCH  /api/admin/gallery/:id/status  published/archived transition
 *  DELETE /api/admin/gallery/:id    delete
 *  GET    /api/admin/videos          list + search/filter/sort/paginate
 *  GET    /api/admin/videos/:id    single video (any status)
 *  POST   /api/admin/videos          create
 *  PATCH  /api/admin/videos/:id    partial update
 *  PATCH  /api/admin/videos/:id/status  published/archived transition
 *  DELETE /api/admin/videos/:id    delete
 *
 * Phase 9H adds the Users CMS + the Audit log (same conventions). The user
 * management surface is exactly what the existing auth model supports —
 * displayName/role updates and deletion with final-admin safeguards; there
 * is deliberately NO create route (accounts are the signup flow's job) and
 * no status route (the model has no status dimension). The audit API is
 * read-only: records are written by the server's centralized audit logger,
 * never by clients.
 *  GET    /api/admin/users         list + search/filter/sort/paginate
 *  GET    /api/admin/users/:id    single account (safe fields only)
 *  PATCH  /api/admin/users/:id    displayName/role update (final-admin
 *                                 safeguard; no password/username/email here)
 *  DELETE /api/admin/users/:id    delete (never the last admin, never the
 *                                 signed-in account; sessions invalidated)
 *  GET    /api/admin/audit        newest-first audit trail + actor/action/
 *                                 resource/date filters + pagination
 *
 * Like every sub-router here, paths are written in full and the router is
 * mounted at the apiRouter root — the "/admin" prefix scopes the namespace
 * guard to /api/admin/* only, so unknown /api/* paths still fall through to
 * the 404 handler instead of being swallowed by this router.
 *
 * Phase 10B — granular authorization. The namespace guard is now
 * requirePanelAccess (auth + role admin|manage; members still 403). On top
 * of it:
 *   - requireAdminSection keeps users/audit/uploads/dashboard/ping
 *     admin-ONLY (manage users must never reach user management, the audit
 *     trail, media uploads, or aggregate stats);
 *   - requireAdminOrPermission(section) gates each CMS section — the admin
 *     role always passes; a manage role passes only when THAT user's own
 *     permissions include the section. Permission checks read req.user,
 *     which requireAuth re-resolves from MongoDB on every request, so grants
 *     and revocations take effect on the next request without session churn.
 * Client-side sidebar filtering is routing UX only and carries no security
 * weight, exactly as before.
 */
export const adminRouter = Router();

adminRouter.use("/admin", requirePanelAccess);

// Admin-only sections — manage users are rejected here (403, generic envelope).
adminRouter.use("/admin/ping", requireAdminSection);
adminRouter.use("/admin/dashboard", requireAdminSection);
adminRouter.use("/admin/uploads", requireAdminSection);
adminRouter.use("/admin/users", requireAdminSection);
adminRouter.use("/admin/audit", requireAdminSection);
// Site settings (Task 15) — global configuration (footer social links) is
// an administrator responsibility, exactly like Users/Audit/Uploads.
adminRouter.use("/admin/settings", requireAdminSection);

// AI field-fill assistant (Task 28) — any panel user (admin, or a manage
// user with any grant) may generate text for the CMS forms they can reach.
// The endpoint only produces text (writes nothing); GROQ_API_KEY gates it
// server-side and the controller rate-limits per user.
adminRouter.use("/admin/ai", requirePanelAccess);

// CMS sections — permission-gated (admin always; manage per-user grants).
adminRouter.use("/admin/events", requireAdminOrPermission("events"));
adminRouter.use("/admin/blogs", requireAdminOrPermission("blogs"));
adminRouter.use("/admin/alumni", requireAdminOrPermission("alumni"));
adminRouter.use("/admin/members", requireAdminOrPermission("members"));
adminRouter.use("/admin/projects", requireAdminOrPermission("projects"));
adminRouter.use("/admin/feed", requireAdminOrPermission("feed"));
adminRouter.use("/admin/gallery", requireAdminOrPermission("gallery"));
adminRouter.use("/admin/videos", requireAdminOrPermission("videos"));
adminRouter.use("/admin/team", requireAdminOrPermission("team"));

// Category vocabulary (Phase 10C) — same per-section permission gates: a
// manage user with the "events" grant manages event categories, never blog
// categories. Unknown sections fall through to the controller's 400.
adminRouter.use("/admin/categories/events", requireAdminOrPermission("events"));
adminRouter.use("/admin/categories/blogs", requireAdminOrPermission("blogs"));
adminRouter.use("/admin/categories/gallery", requireAdminOrPermission("gallery"));
adminRouter.use("/admin/categories/videos", requireAdminOrPermission("videos"));
adminRouter.use("/admin/categories/projects", requireAdminOrPermission("projects"));

// Slug availability (Phase 10C) — the section arrives as a query param, so
// the same permission gate is applied dynamically after validating it.
adminRouter.get(
  "/admin/slug-check",
  (req, res, next) => {
    const section = typeof req.query.section === "string" ? req.query.section : "";
    if (!isSlugCheckSection(section)) {
      res.status(400).json({ message: "Unknown section." });
      return;
    }
    requireAdminOrPermission(section)(req, res, next);
  },
  getAdminSlugCheck,
);

adminRouter.get("/admin/ping", getAdminPing);
adminRouter.get("/admin/dashboard", getAdminDashboard);

// Media uploads (Phase 10A) — Cloudflare R2 via the storage service. Both
// routes stay ADMIN-ONLY (Phase 10B requireAdminSection above): manage users
// work with URL inputs; per-permission upload grants are a later decision.
// The multipart body is parsed in-memory (serverless-safe), never on disk.
adminRouter.post("/admin/uploads", uploadSingleFile("file"), uploadAdminMedia);
adminRouter.delete("/admin/uploads", deleteAdminMedia);

adminRouter.get("/admin/events", listAdminEvents);
adminRouter.get("/admin/events/:id", getAdminEvent);
adminRouter.post("/admin/events", createAdminEvent);
adminRouter.patch("/admin/events/:id", updateAdminEvent);
adminRouter.patch("/admin/events/:id/status", updateAdminEventStatus);
adminRouter.delete("/admin/events/:id", deleteAdminEvent);

adminRouter.get("/admin/blogs", listAdminBlogs);
adminRouter.get("/admin/blogs/:id", getAdminBlog);
adminRouter.post("/admin/blogs", createAdminBlog);
adminRouter.patch("/admin/blogs/:id", updateAdminBlog);
adminRouter.patch("/admin/blogs/:id/status", updateAdminBlogStatus);
adminRouter.delete("/admin/blogs/:id", deleteAdminBlog);

adminRouter.get("/admin/alumni", listAdminAlumni);
adminRouter.get("/admin/alumni/:id", getAdminAlumnus);
adminRouter.post("/admin/alumni", createAdminAlumnus);
adminRouter.patch("/admin/alumni/:id", updateAdminAlumnus);
adminRouter.delete("/admin/alumni/:id", deleteAdminAlumnus);

adminRouter.get("/admin/members", listAdminMembers);
// Task 29 — candidates BEFORE /:id (Express matches in registration order;
// the static path must win over the parameterized one).
adminRouter.get("/admin/members/candidates", listAdminMemberCandidates);
adminRouter.get("/admin/members/:id", getAdminMember);
adminRouter.post("/admin/members", createAdminMember);
adminRouter.patch("/admin/members/:id", updateAdminMember);
adminRouter.patch("/admin/members/:id/status", updateAdminMemberStatus);
adminRouter.delete("/admin/members/:id", deleteAdminMember);

// Team cards (Phase 12) — leadership + developers card CMS. Two-state
// lifecycle (published/archived) is edited via PATCH; no separate status
// route (the model has no rich lifecycle to transition through).
adminRouter.get("/admin/team", listAdminTeam);
adminRouter.get("/admin/team/:id", getAdminTeamCard);
adminRouter.post("/admin/team", createAdminTeamCard);
adminRouter.patch("/admin/team/:id", updateAdminTeamCard);
adminRouter.delete("/admin/team/:id", deleteAdminTeamCard);

adminRouter.get("/admin/projects", listAdminProjects);
adminRouter.get("/admin/projects/:id", getAdminProject);
adminRouter.post("/admin/projects", createAdminProject);
adminRouter.patch("/admin/projects/:id", updateAdminProject);
adminRouter.patch("/admin/projects/:id/status", updateAdminProjectStatus);
adminRouter.delete("/admin/projects/:id", deleteAdminProject);

adminRouter.get("/admin/feed", listAdminFeed);
adminRouter.get("/admin/feed/:id", getAdminFeedPost);
adminRouter.post("/admin/feed", createAdminFeedPost);
adminRouter.patch("/admin/feed/:id", updateAdminFeedPost);
adminRouter.patch("/admin/feed/:id/status", updateAdminFeedPostStatus);
adminRouter.delete("/admin/feed/:id", deleteAdminFeedPost);

adminRouter.get("/admin/gallery", listAdminGallery);
adminRouter.get("/admin/gallery/:id", getAdminAlbum);
adminRouter.post("/admin/gallery", createAdminAlbum);
adminRouter.patch("/admin/gallery/:id", updateAdminAlbum);
adminRouter.patch("/admin/gallery/:id/status", updateAdminAlbumStatus);
adminRouter.delete("/admin/gallery/:id", deleteAdminAlbum);

adminRouter.get("/admin/videos", listAdminVideos);
adminRouter.get("/admin/videos/:id", getAdminVideo);
adminRouter.post("/admin/videos", createAdminVideo);
adminRouter.patch("/admin/videos/:id", updateAdminVideo);
adminRouter.patch("/admin/videos/:id/status", updateAdminVideoStatus);
adminRouter.delete("/admin/videos/:id", deleteAdminVideo);

adminRouter.get("/admin/users", listAdminUsers);
adminRouter.get("/admin/users/:id", getAdminUser);
adminRouter.patch("/admin/users/:id", updateAdminUser);
adminRouter.delete("/admin/users/:id", deleteAdminUser);

adminRouter.get("/admin/audit", listAdminAudit);

// Site settings (Task 15) — admin-only gate above. PUT is replace-all: the
// editor submits the FULL link list (the settings doc is one small record).
adminRouter.get("/admin/settings", getAdminSettings);
adminRouter.put("/admin/settings", updateAdminSettings);

// AI field-fill assistant (Task 28) — guarded by requirePanelAccess above.
// One endpoint: kind (which field) + source (pasted material) → text/items.
adminRouter.post("/admin/ai/field", generateAdminAiField);

// Category vocabulary (Phase 10C) — guarded per section above. The section
// enum is re-validated inside the controller for defense in depth.
adminRouter.get("/admin/categories/:section", listAdminCategories);
adminRouter.post("/admin/categories/:section", addAdminCategory);
adminRouter.patch("/admin/categories/:section/:id", renameAdminCategory);
adminRouter.delete("/admin/categories/:section/:id", deleteAdminCategory);

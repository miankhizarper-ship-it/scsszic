import { Router } from "express";

import {
  createDetailHandler,
  createFeedListHandler,
  createListHandler,
  createRelatedHandler,
  createUsernameDetailHandler,
} from "../controllers/content/content.controller.js";
import { alumniRepository } from "../repositories/content/alumniRepository.js";
import { blogsRepository } from "../repositories/content/blogsRepository.js";
import { eventsRepository } from "../repositories/content/eventsRepository.js";
import { feedRepository } from "../repositories/content/feedRepository.js";
import { galleryRepository } from "../repositories/content/galleryRepository.js";
import { membersRepository } from "../repositories/content/membersRepository.js";
import { projectsRepository } from "../repositories/content/projectsRepository.js";
import { videosRepository } from "../repositories/content/videosRepository.js";

/**
 * /api content routes — Phase 8 (MongoDB-backed, spec §10).
 *
 * Every listing is server-filtered/paginated with facets in meta; every
 * detail lookup enforces its publication rule in the repository (archived /
 * draft content can never leak, spec §13).
 *
 *  GET /api/events                 GET /api/events/:slug            (+ related)
 *  GET /api/blogs                  GET /api/blogs/:slug             (+ related)
 *  GET /api/alumni                 GET /api/alumni/:slug            (+ related)
 *  GET /api/gallery                GET /api/gallery/:albumSlug      (+ related)
 *  GET /api/watch                  GET /api/watch/:videoSlug        (+ related)
 *  GET /api/members                GET /api/members/:username       (+ related)
 *  GET /api/projects               GET /api/projects/:projectSlug   (+ related)
 *  GET /api/feed                   (cross-refs enriched server-side)
 */
export const contentRouter = Router();

/* ------------------------------ Events ------------------------------ */
contentRouter.get("/events", createListHandler("events", eventsRepository));
contentRouter.get("/events/:slug", createDetailHandler(eventsRepository, "Event not found"));
contentRouter.get(
  "/events/:slug/related",
  createRelatedHandler(
    { load: (s) => eventsRepository.getBySlug(s), related: (c, n) => eventsRepository.related(c, n) },
    "Event not found",
  ),
);

/* ------------------------------ Blogs ------------------------------- */
contentRouter.get("/blogs", createListHandler("blogs", blogsRepository));
contentRouter.get("/blogs/:slug", createDetailHandler(blogsRepository, "Article not found"));
contentRouter.get(
  "/blogs/:slug/related",
  createRelatedHandler(
    { load: (s) => blogsRepository.getBySlug(s), related: (c, n) => blogsRepository.related(c, n) },
    "Article not found",
  ),
);

/* ------------------------------ Alumni ------------------------------ */
contentRouter.get("/alumni", createListHandler("alumni", alumniRepository));
contentRouter.get(
  "/alumni/:slug",
  (req, _res, next) => {
    // Normalize the domain-specific param name for the shared username
    // handler (same pattern as gallery/watch/projects routes below).
    // DEFECT FIX (found by Phase 9E QA): the handler reads
    // req.params.username but this route names the param ":slug", so every
    // public alumni detail lookup 404'd — the directory card links and the
    // admin CMS "View public profile" action both depend on it.
    (req.params as Record<string, string | undefined>).username = req.params.slug;
    next();
  },
  createUsernameDetailHandler(alumniRepository, "Alumni profile not found"),
);
contentRouter.get(
  "/alumni/:slug/related",
  createRelatedHandler(
    { load: (s) => alumniRepository.getByUsername(s), related: (c, n) => alumniRepository.related(c, n) },
    "Alumni profile not found",
  ),
);

/* ------------------------------ Gallery ----------------------------- */
contentRouter.get("/gallery", createListHandler("gallery", galleryRepository));
contentRouter.get(
  "/gallery/:albumSlug",
  (req, _res, next) => {
    // Normalize the domain-specific param name for the shared handler.
    (req.params as Record<string, string | undefined>).slug = req.params.albumSlug;
    next();
  },
  createDetailHandler(galleryRepository, "Album not found"),
);
contentRouter.get(
  "/gallery/:albumSlug/related",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.albumSlug;
    next();
  },
  createRelatedHandler(
    { load: (s) => galleryRepository.getBySlug(s), related: (c, n) => galleryRepository.related(c, n) },
    "Album not found",
  ),
);

/* ------------------------------- Watch ------------------------------ */
contentRouter.get("/watch", createListHandler("watch", videosRepository));
contentRouter.get(
  "/watch/:videoSlug",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.videoSlug;
    next();
  },
  createDetailHandler(videosRepository, "Video not found"),
);
contentRouter.get(
  "/watch/:videoSlug/related",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.videoSlug;
    next();
  },
  createRelatedHandler(
    { load: (s) => videosRepository.getBySlug(s), related: (c, n) => videosRepository.related(c, n) },
    "Video not found",
  ),
);

/* ------------------------------ Members ----------------------------- */
contentRouter.get("/members", createListHandler("members", membersRepository));
contentRouter.get(
  "/members/:username",
  createUsernameDetailHandler(membersRepository, "Member profile not found"),
);
contentRouter.get(
  "/members/:username/related",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.username;
    next();
  },
  createRelatedHandler(
    { load: (s) => membersRepository.getByUsername(s), related: (c, n) => membersRepository.related(c, n) },
    "Member profile not found",
  ),
);

/* ------------------------------ Projects ---------------------------- */
contentRouter.get("/projects", createListHandler("projects", projectsRepository));
contentRouter.get(
  "/projects/:projectSlug",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.projectSlug;
    next();
  },
  createDetailHandler(projectsRepository, "Project not found"),
);
contentRouter.get(
  "/projects/:projectSlug/related",
  (req, _res, next) => {
    (req.params as Record<string, string | undefined>).slug = req.params.projectSlug;
    next();
  },
  createRelatedHandler(
    { load: (s) => projectsRepository.getBySlug(s), related: (c, n) => projectsRepository.related(c, n) },
    "Project not found",
  ),
);

/* -------------------------------- Feed ------------------------------ */
contentRouter.get("/feed", createFeedListHandler(feedRepository));

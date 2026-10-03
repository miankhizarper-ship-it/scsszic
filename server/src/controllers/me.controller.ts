import type { RequestHandler } from "express";

import { withErrorBoundary } from "./content/content.controller.js";
import { adminMembersRepository } from "../repositories/content/adminMembersRepository.js";
import { adminFeedRepository } from "../repositories/content/adminFeedRepository.js";
import {
  memberSelfUpdateSchema,
  memberFieldErrors,
} from "../http/memberSchemas.js";
import { memberFeedCreateSchema, meFieldErrors } from "../http/meSchemas.js";
import { collections } from "../db/collections.js";
import { recordAudit } from "../audit/auditLogger.js";
import { generateUniqueHandle } from "../repositories/content/slugAvailabilityRepository.js";

/**
 * Task 29 — /api/me/* controllers: the signed-in MEMBER's self-service
 * surface. Profile routes assume the route layer already enforced
 * requireAuth + requireRole("member"), so req.user is a society member
 * whose account owns exactly one member-directory record (members.userId).
 *
 *   GET  /api/me/member-profile   the member's own directory record
 *   PUT  /api/me/member-profile   self-editable fields only (skills,
 *                                 interests, bio/about, social links,
 *                                 projects, avatar, location, department)
 *   POST /api/me/feed             publish a community post (rate-limited)
 *
 * Task 37 — feed posting is the COMMUNITY surface: members (role member,
 * public-profile voice) AND staff (manage/admin) may publish. The feed
 * route gates requireAnyRole([member, manage, admin]); this controller
 * then resolves the author identity: the linked member record when one
 * exists (the card links the public profile), otherwise — for STAFF only —
 * the account identity (the feed card degrades to a plain "Society
 * account" byline with no profile link). A plain member account without
 * a linked record still gets the honest 404: there is no identity to
 * post under.
 *
 * Authorization is two-layered: the role gate AND the userId linkage (the
 * record must belong to the caller). Even a role granted without a linked
 * record cannot read or write another member's profile.
 */

/** Thrown internally when the caller has no linked member record. */
class NoLinkedMemberError extends Error {
  constructor() {
    super("No linked member record");
    this.name = "NoLinkedMemberError";
  }
}

/** Resolve the caller's own member record — the linkage is the authority. */
async function requireLinkedMember(userId: string) {
  const member = await adminMembersRepository.findByUserId(userId);
  if (!member) throw new NoLinkedMemberError();
  return member;
}

const NO_MEMBER = {
  status: 404 as const,
  body: {
    message:
      "Your account is not linked to a member record yet. Ask the society admin to add you to the members directory.",
    code: "no_member_record",
  },
};

/** GET /api/me/member-profile — the caller's own directory record. */
export const getMyMemberProfile: RequestHandler = withErrorBoundary(
  async (req, res) => {
    try {
      const member = await requireLinkedMember(req.user!.id);
      res.status(200).json({ data: member });
    } catch (error) {
      if (error instanceof NoLinkedMemberError) {
        res.status(NO_MEMBER.status).json(NO_MEMBER.body);
        return;
      }
      throw error;
    }
  },
  "me-member-profile",
);

/**
 * PUT /api/me/member-profile — self-editable fields only. Project slugs are
 * existence-checked exactly like the admin form (unknown → 400 field error);
 * everything identity/admin-owned is rejected by the strict schema.
 */
export const updateMyMemberProfile: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const parsed = memberSelfUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: memberFieldErrors(parsed.error) });
      return;
    }

    const existing = await adminMembersRepository.findByUserId(req.user!.id);
    if (!existing) {
      res.status(NO_MEMBER.status).json(NO_MEMBER.body);
      return;
    }

    if ((parsed.data.projectSlugs ?? []).length > 0) {
      const slugs = parsed.data.projectSlugs ?? [];
      const found = await collections
        .projects()
        .find({ slug: { $in: slugs } }, { projection: { slug: 1 } })
        .toArray();
      const known = new Set(found.map((doc) => doc.slug));
      const missing = slugs.filter((slug) => !known.has(slug));
      if (missing.length > 0) {
        res.status(400).json({
          message: "Please fix the highlighted fields.",
          errors: { projectSlugs: `Unknown project reference: ${missing.join(", ")}.` },
        });
        return;
      }
    }

    const member = await adminMembersRepository.update(existing.id, parsed.data);
    if (!member) {
      res.status(NO_MEMBER.status).json(NO_MEMBER.body);
      return;
    }

    await recordAudit(req, {
      action: "member.profile.self_updated",
      resourceType: "member",
      resourceId: member.id,
      resourceLabel: member.name,
      metadata: { fields: Object.keys(parsed.data).join(", ") },
    });

    res.status(200).json({ data: member });
  },
  "me-member-profile",
);

/* ------------------------------ member feed ------------------------------ */

/**
 * Per-member posting throttle — ONE post per minute keeps the community
 * feed humane without blocking normal use (the admin CMS has no such
 * limit). In-memory like the contact/resend throttles: per-process, and a
 * serverless cold start simply resets it.
 */
const FEED_POST_THROTTLE_MS = 60_000;
const feedPostHistory = new Map<string, number>();

function pruneFeedPostHistory(now: number): void {
  for (const [key, at] of feedPostHistory) {
    if (now - at > 10 * 60_000) feedPostHistory.delete(key);
  }
}

/** POST /api/me/feed — publish a community post (member or staff author). */
export const createMyFeedPost: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const parsed = memberFeedCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: meFieldErrors(parsed.error) });
      return;
    }

    // Author identity: the linked directory record wins (public profile
    // card); staff without one fall back to the ACCOUNT identity — the
    // feed card's cross-ref omits unknown usernames and renders a plain
    // "Society account" byline, so no dead profile link is ever created.
    const member = await adminMembersRepository.findByUserId(req.user!.id);
    const isStaff = req.user!.role === "admin" || req.user!.role === "manage";
    if (!member && !isStaff) {
      res.status(NO_MEMBER.status).json(NO_MEMBER.body);
      return;
    }
    const authorName = member?.name ?? req.user!.displayName;
    const authorUsername = member?.username ?? "";

    // Throttle AFTER resolving the author so every real post pays the same
    // wait (no probing differences between linked/unlinked accounts).
    const now = Date.now();
    pruneFeedPostHistory(now);
    const last = feedPostHistory.get(req.user!.id);
    if (last !== undefined && now - last < FEED_POST_THROTTLE_MS) {
      res.status(429).json({
        message: "You just shared a post — please wait a minute before posting again.",
      });
      return;
    }

    // Author identity comes from the DIRECTORY record or the verified
    // session (never client input): the post's author card links to the
    // member's public profile when one exists.
    const slug = await generateUniqueHandle("feed", parsed.data.title);
    const post = await adminFeedRepository.create({
      type: "community",
      ...(authorUsername ? { authorUsername } : {}),
      authorName,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      ...(parsed.data.content ? { content: parsed.data.content } : {}),
      ...(parsed.data.image ? { image: parsed.data.image } : {}),
      ...(parsed.data.imageAlt ? { imageAlt: parsed.data.imageAlt } : {}),
      publishedAt: new Date().toISOString(),
      tags: parsed.data.tags,
      status: "published",
      slug,
    });
    feedPostHistory.set(req.user!.id, now);

    await recordAudit(req, {
      action: "feed.created",
      resourceType: "post",
      resourceId: post.id,
      resourceLabel: post.title,
      metadata: {
        slug: post.slug,
        status: post.status,
        via: member ? "member" : isStaff ? "staff" : "member",
      },
    });

    res.status(201).json({ data: post });
  },
  "me-feed",
);

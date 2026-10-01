import { apiFetch } from "@/services/apiClient";
import type { FeedPost, Member } from "@/types";

/**
 * meService (Task 29) — the signed-in MEMBER's self-service surface.
 * Every endpoint is members-only server-side (role "member" + the
 * account↔member linkage); plain users receive 403 and unlinked member
 * accounts a 404 with code "no_member_record".
 */
export const meService = {
  /** GET /api/me/member-profile — the caller's own directory record. */
  async getMemberProfile(): Promise<Member> {
    const response = await apiFetch<{ data: Member }>("/me/member-profile");
    return response.data;
  },

  /**
   * PUT /api/me/member-profile — self-editable fields ONLY (bio/about,
   * skills, interests, social links, project slugs, avatar, location,
   * department). Identity/admin-owned fields are rejected server-side.
   */
  async updateMemberProfile(body: {
    bio?: string;
    avatar?: string;
    avatarAlt?: string;
    location?: string;
    department?: string;
    skills?: string[];
    interests?: string[];
    social?: Record<string, string>;
    projectSlugs?: string[];
  }): Promise<Member> {
    const response = await apiFetch<{ data: Member }>("/me/member-profile", {
      method: "PUT",
      body,
    });
    return response.data;
  },

  /**
   * POST /api/me/feed — publish a community post as the member. The server
   * fills every system field (author identity from the directory record,
   * type "community", status "published", slug, timestamp); the caller
   * supplies title/excerpt/content/tags/image only.
   */
  async createFeedPost(body: {
    title: string;
    excerpt: string;
    content?: string;
    image?: string;
    imageAlt?: string;
    tags?: string[];
  }): Promise<FeedPost> {
    const response = await apiFetch<{ data: FeedPost }>("/me/feed", {
      method: "POST",
      body,
    });
    return response.data;
  },
};

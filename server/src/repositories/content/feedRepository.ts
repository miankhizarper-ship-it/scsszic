import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import {
  collections,
  type BlogDoc,
  type EventDoc,
  type FeedPostDoc,
  type MemberDoc,
  type ProjectDoc,
} from "../../db/collections.js";
import { stripInternals, type OmitInternal } from "./strip.js";
import { feedSocialRepository } from "./feedSocialRepository.js";

/**
 * Feed repository — archived posts never leave the database (spec §13).
 *
 * Filters mirror lib/feedSearch.filterPosts: free-text haystack, post type,
 * and exact tag membership — plus author/project scopes used by the profile
 * and project pages (GET /api/feed?authorUsername=… / ?projectSlug=…).
 * Order: newest first.
 *
 * Cross-reference enrichment (spec §27 — no N+1): each page of posts gets
 * ONE batched lookup per reference type (authors, projects, events, blogs)
 * and the resolved summaries are attached as `refs`. The feed card renders
 * from those instead of issuing per-card lookups.
 */

const sort: Sort = { publishedAt: -1, title: 1 };

export interface FeedRefSummary {
  slug: string;
  title: string;
}

export interface FeedAuthorSummary {
  username: string;
  name: string;
  initials: string;
  avatar?: string;
  avatarAlt?: string;
  batch: string;
}

export interface FeedPostRefs {
  author?: FeedAuthorSummary;
  project?: FeedRefSummary;
  event?: FeedRefSummary;
  blog?: FeedRefSummary;
}

export type EnrichedFeedPost = OmitInternal<FeedPostDoc> & { refs: FeedPostRefs };

function buildFilter(query: ContentQuery): Filter<FeedPostDoc> {
  const filter: Filter<FeedPostDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.type === "string" && f.type) {
    filter.type = f.type as FeedPostDoc["type"];
  }
  if (typeof f.tag === "string" && f.tag) {
    filter.tags = f.tag;
  }
  if (typeof f.authorUsername === "string" && f.authorUsername) {
    filter.authorUsername = f.authorUsername;
  }
  if (typeof f.projectSlug === "string" && f.projectSlug) {
    filter.projectSlug = f.projectSlug;
  }

  return filter;
}

function buildFacets() {
  return {
    types: [
      { $group: { _id: "$type", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
    // Popular tags — port of lib/feedSearch.getPopularFeedTags (top 8).
    tags: [
      { $unwind: "$tags" },
      { $group: { _id: "$tags", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 8 },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
  };
}

class FeedRepository extends ListRepository<FeedPostDoc, EnrichedFeedPost> {
  constructor() {
    super({
      collection: collections.feedPosts,
      // ARCHIVED POSTS STAY PRIVATE (spec §13).
      visibility: { status: "published" },
      buildFilter,
      sort,
      // Bare posts carry an empty refs map; enrich() replaces it before
      // anything is serialized to a client. Displayed likes = seeded demo
      // baseline + real likes (likedBy account ids, stripped as internal).
      toDomain: (doc) => ({
        ...stripInternals(doc),
        likes: (doc.likes ?? 0) + (doc.likedBy?.length ?? 0),
        refs: {},
      }),
      buildFacets,
    });
  }

  /**
   * Batched cross-reference resolution + engagement totals for a page of
   * posts — four $in lookups + ONE grouped comment count, regardless of
   * page size (never one per card).
   *
   * Displayed engagement = seeded demo baseline + real activity (Phase
   * FIX: likes live in `likedBy`, comments in `feed_comments`). The demo
   * numbers on the documents are never mutated.
   */
  async enrich(posts: Array<OmitInternal<FeedPostDoc>>): Promise<EnrichedFeedPost[]> {
    const authorUsernames = [
      ...new Set(posts.map((p) => p.authorUsername).filter((u): u is string => Boolean(u))),
    ];
    const projectSlugs = [
      ...new Set(posts.map((p) => p.projectSlug).filter((s): s is string => Boolean(s))),
    ];
    const eventSlugs = [
      ...new Set(posts.map((p) => p.eventSlug).filter((s): s is string => Boolean(s))),
    ];
    const blogSlugs = [
      ...new Set(posts.map((p) => p.blogSlug).filter((s): s is string => Boolean(s))),
    ];
    const postIds = posts.map((p) => p.id);

    const [memberDocs, projects, events, blogs, commentCounts] = await Promise.all([
      authorUsernames.length > 0
        ? collections
            .members()
            .find({
              status: { $in: ["active", "alumni"] },
              username: { $in: authorUsernames },
            } as Filter<MemberDoc>)
            .project<{ username: string; name: string; initials: string; avatar?: string; avatarAlt?: string; batch: string }>(
              {
                username: 1,
                name: 1,
                initials: 1,
                avatar: 1,
                avatarAlt: 1,
                batch: 1,
                _id: 0,
              },
            )
            .toArray()
        : Promise.resolve([]),
      projectSlugs.length > 0
        ? collections
            .projects()
            .find(
              { status: { $in: ["active", "completed"] }, slug: { $in: projectSlugs } } as Filter<ProjectDoc>,
            )
            .project<{ slug: string; title: string }>({ slug: 1, title: 1, _id: 0 })
            .toArray()
        : Promise.resolve([]),
      eventSlugs.length > 0
        ? collections
            .events()
            .find({ slug: { $in: eventSlugs } } as Filter<EventDoc>)
            .project<{ slug: string; title: string }>({ slug: 1, title: 1, _id: 0 })
            .toArray()
        : Promise.resolve([]),
      blogSlugs.length > 0
        ? collections
            .blogs()
            .find({ status: "published", slug: { $in: blogSlugs } } as Filter<BlogDoc>)
            .project<{ slug: string; title: string }>({ slug: 1, title: 1, _id: 0 })
            .toArray()
        : Promise.resolve([]),
      feedSocialRepository.commentCountsFor(postIds),
    ]);

    const authors = new Map(memberDocs.map((m) => [m.username, m]));
    const projectMap = new Map(projects.map((p) => [p.slug, p]));
    const eventMap = new Map(events.map((e) => [e.slug, e]));
    const blogMap = new Map(blogs.map((b) => [b.slug, b]));

    return posts.map((post) => {
      const author = post.authorUsername ? authors.get(post.authorUsername) : undefined;
      return {
        ...post,
        // Real comment counts fold on top of the demo baseline here; the
        // like baseline was already folded in toDomain (raw doc only).
        comments: (post.comments ?? 0) + (commentCounts.get(post.id) ?? 0),
        refs: {
          ...(author ? { author } : {}),
          ...(post.projectSlug && projectMap.has(post.projectSlug)
            ? { project: projectMap.get(post.projectSlug) }
            : {}),
          ...(post.eventSlug && eventMap.has(post.eventSlug)
            ? { event: eventMap.get(post.eventSlug) }
            : {}),
          ...(post.blogSlug && blogMap.has(post.blogSlug)
            ? { blog: blogMap.get(post.blogSlug) }
            : {}),
        },
      };
    });
  }

  /** Listing with refs attached (the ONLY way feed posts leave the API). */
  async listEnriched(query: ContentQuery) {
    const result = await this.list(query);
    return { ...result, items: await this.enrich(result.items) };
  }
}

export const feedRepository = new FeedRepository();

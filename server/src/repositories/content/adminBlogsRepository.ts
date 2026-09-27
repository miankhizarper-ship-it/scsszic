import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type BlogDoc } from "../../db/collections.js";
import type { Blog } from "../../content/types.js";
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type { AdminBlogCreateInput, AdminBlogListQuery, AdminBlogUpdateInput } from "../../http/blogSchemas.js";
import { BLOG_STATUSES } from "../../http/blogSchemas.js";

/**
 * Admin Blogs repository (Phase 9D) — CRUD over the SAME `blogs` collection
 * the public Phase 8 repository reads, with the SAME document conventions
 * (canonical `id` mirrored into `_id`, seed-computed `searchText` haystack,
 * internals stripped from every response).
 *
 * The publication lifecycle is the model's own (draft/published/archived).
 * The PUBLIC repository gates queries to `status: "published"` — that gate
 * is untouched. The admin surface intentionally sees drafts and archived
 * records too (that is exactly what an admin needs) but changes nothing
 * about how visibility works publicly.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.blogs — title, excerpt, category,
 * author name, tags, flattened content blocks), so admin-created/edited
 * articles remain fully searchable through the public haystack.
 */

/** Newest published first — matches the public listing's canonical order. */
const SORTS: Record<AdminBlogListQuery["sort"], Sort> = {
  published_desc: { publishedAt: -1, title: 1 },
  published_asc: { publishedAt: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  updated_desc: { updatedAt: -1, publishedAt: -1, title: 1 },
};

export interface AdminBlogAuthorFacet {
  id: string;
  name: string;
  n: number;
}

export interface AdminBlogListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (feed filter chips with real counts). */
  facets: {
    statuses: Array<{ value: string; n: number }>;
    categories: Array<{ value: string; n: number }>;
    authors: AdminBlogAuthorFacet[];
  };
}

export interface AdminBlogListResult {
  items: Blog[];
  meta: AdminBlogListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/** Flattens one content block — mirrors seed.ts blogBlockText exactly. */
function blogBlockText(block: {
  type: string;
  text?: string;
  items?: string[];
  caption?: string;
  code?: string;
}): string {
  switch (block.type) {
    case "paragraph":
    case "quote":
    case "callout":
    case "heading":
      return block.text ?? "";
    case "list":
      return (block.items ?? []).join(" ");
    case "code":
      return `${block.caption ?? ""} ${block.code ?? ""}`;
    default:
      return "";
  }
}

/**
 * Mirrors seed.ts SEARCH_FIELDS.blogs exactly:
 * title, excerpt, category, author.name, tags, flattened content blocks —
 * joined with spaces, lowercased.
 */
function buildBlogSearchText(blog: {
  title?: string;
  excerpt?: string;
  category?: string;
  author?: { name?: string };
  tags?: string[];
  content?: Array<{ type: string; text?: string; items?: string[]; caption?: string; code?: string }>;
}): string {
  return [
    blog.title,
    blog.excerpt,
    blog.category,
    blog.author?.name,
    blog.tags,
    (blog.content ?? []).map(blogBlockText),
  ]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "blog-*" family. */
function generateBlogId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `blog-${Date.now().toString(36)}${random}`.toLowerCase();
}

function toDomain(doc: WithId<BlogDoc>): Blog {
  return stripInternals(doc) as unknown as Blog;
}

/* ------------------------------- repository ------------------------------ */

class AdminBlogsRepository {
  private coll() {
    return collections.blogs();
  }

  /**
   * Management listing — search (same haystack as the public site), status/
   * category/author filters, dynamic sort, real pagination, plus unfiltered
   * facet distributions. Total reflects the filters. Admins see drafts and
   * archived records — no public visibility gate here.
   */
  async list(query: AdminBlogListQuery): Promise<AdminBlogListResult> {
    const filter: Filter<BlogDoc> = {};

    const search = query.search.trim();
    if (search) {
      filter.searchText = { $regex: escapeRegExp(search), $options: "i" };
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.authorId) {
      filter["author.id"] = query.authorId;
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, statusRows, categoryRows, authorRows] = await Promise.all([
      this.coll().countDocuments(filter),
      this.coll()
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$status", n: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string | null; n: number }>([
          { $group: { _id: "$category", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
      this.coll()
        .aggregate<{ _id: string; name: string; n: number }>([
          {
            $group: {
              _id: "$author.id",
              name: { $first: "$author.name" },
              n: { $sum: 1 },
            },
          },
          { $sort: { n: -1, _id: 1 } },
        ])
        .toArray(),
    ]);

    return {
      items: docs.map(toDomain),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        facets: {
          statuses: statusRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          categories: categoryRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
          authors: authorRows.map((row) => ({ id: row._id, name: row.name, n: row.n })),
        },
      },
    };
  }

  /** Single blog by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<Blog | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<BlogDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<BlogDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<BlogDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real blog document — canonical id, searchText set, updatedAt default. */
  async create(input: AdminBlogCreateInput): Promise<Blog> {
    const _id = generateBlogId();
    const doc: BlogDoc & Document = {
      ...input,
      featured: input.featured ?? false,
      // The model's editorial revision date — defaults to the publish date.
      updatedAt: input.updatedAt ?? input.publishedAt,
      id: _id,
      searchText: buildBlogSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<BlogDoc>);
  }

  /** Partial update — merges onto the existing doc, recomputes searchText. */
  async update(id: string, input: AdminBlogUpdateInput): Promise<Blog | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<BlogDoc>);
    if (!existing) return null;

    const merged = { ...existing, ...input } as BlogDoc;
    const set: Record<string, unknown> = {
      ...input,
      // Every save is a revision — bump the editorial updatedAt unless the
      // payload explicitly sets it.
      updatedAt: input.updatedAt ?? new Date().toISOString().slice(0, 10),
      searchText: buildBlogSearchText(merged),
    };

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<BlogDoc>,
      { $set: set },
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(id: string, status: (typeof BLOG_STATUSES)[number]): Promise<Blog | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<BlogDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one blog by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<BlogDoc>);
    return result.deletedCount === 1;
  }
}

export const adminBlogsRepository = new AdminBlogsRepository();

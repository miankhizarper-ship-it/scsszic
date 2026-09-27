import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type BlogDoc } from "../../db/collections.js";
import type { Blog } from "../../content/types.js";
import { pickRelatedBlogs } from "./related.js";
import { stripInternals } from "./strip.js";

/**
 * Blogs repository — publication rules enforced in the query layer (spec
 * §13): only `status: "published"` leaves the database. Draft and archived
 * articles can never leak through filters, detail links, or facets.
 *
 * Filters mirror lib/blogSearch.filterBlogs: free-text haystack (title,
 * excerpt, category, author, tags, and full content — precomputed into
 * searchText at seed time), exact category, and exact tag membership.
 * Order: newest published first.
 */

const sort: Sort = { publishedAt: -1, title: 1 };

function buildFilter(query: ContentQuery): Filter<BlogDoc> {
  const filter: Filter<BlogDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.category === "string" && f.category) {
    filter.category = f.category;
  }
  if (typeof f.tag === "string" && f.tag) {
    filter.tags = f.tag;
  }
  if (typeof f.authorId === "string" && f.authorId) {
    filter["author.id"] = f.authorId;
  }
  if (f.featured === true) {
    filter.featured = true;
  }

  return filter;
}

function buildFacets() {
  return {
    categories: [
      { $group: { _id: "$category", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
    // Popular tags — port of lib/blogSearch.getPopularTags (count desc,
    // name asc, limit 10).
    tags: [
      { $unwind: "$tags" },
      { $group: { _id: "$tags", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 10 },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
    // Distinct contributors (hero "Writers" stat).
    authors: [
      { $group: { _id: "$author.id" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id" } },
    ],
  };
}

class BlogsRepository extends ListRepository<BlogDoc, Blog> {
  constructor() {
    super({
      collection: collections.blogs,
      // DRAFTS AND ARCHIVED STAY PRIVATE (spec §13).
      visibility: { status: "published" },
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  async related(current: Blog, count = 3): Promise<Blog[]> {
    const all = await this.allVisible();
    return pickRelatedBlogs(all, current, count);
  }
}

export const blogsRepository = new BlogsRepository();

import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type VideoDoc } from "../../db/collections.js";
import { pickRelatedVideos } from "./related.js";
import { durationBucketRange } from "./text.js";
import { stripInternals, type OmitInternal } from "./strip.js";

/**
 * Watch repository — archived videos never leave the database (spec §13).
 *
 * Filters mirror lib/watchSearch.filterVideos: free-text haystack, exact
 * category, and duration buckets computed from the seed-normalized
 * `durationMinutes` (numeric ranges — indexable, identical boundaries to
 * the client bucket matcher). Order: newest releases first.
 */

const sort: Sort = { publishedAt: -1, title: 1 };

function buildFilter(query: ContentQuery): Filter<VideoDoc> {
  const filter: Filter<VideoDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.category === "string" && f.category) {
    filter.category = f.category;
  }
  if (typeof f.duration === "string" && f.duration) {
    const { min, max } = durationBucketRange(f.duration);
    const range: Record<string, number> = {};
    if (min !== undefined) range.$gte = min;
    if (max !== undefined) range.$lt = max;
    if (Object.keys(range).length > 0) {
      filter.durationMinutes = range as Filter<VideoDoc>["durationMinutes"];
    }
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
    // Total published runtime in minutes (hero "Hours" stat).
    minutes: [{ $group: { _id: null, n: { $sum: "$durationMinutes" } } }, { $project: { n: 1, _id: 0 } }],
    // Videos linked to an event (hero "From Events" stat).
    eventLinked: [
      { $match: { eventSlug: { $exists: true, $nin: [null, ""] } } },
      { $count: "n" },
    ],
  };
}

class VideosRepository extends ListRepository<VideoDoc, OmitInternal<VideoDoc>> {
  constructor() {
    super({
      collection: collections.videos,
      // ARCHIVED VIDEOS STAY PRIVATE (spec §13).
      visibility: { status: "published" },
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  async related(current: OmitInternal<VideoDoc>, count = 3): Promise<OmitInternal<VideoDoc>[]> {
    const all = await this.allVisible();
    return pickRelatedVideos(all, current, count);
  }
}

export const videosRepository = new VideosRepository();

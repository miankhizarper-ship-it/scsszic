import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type GalleryAlbumDoc } from "../../db/collections.js";
import type { GalleryAlbum } from "../../content/types.js";
import { pickRelatedAlbums } from "./related.js";
import { stripInternals } from "./strip.js";

/**
 * Gallery repository — archived albums never leave the database (spec §13);
 * only `status: "published"` is public. Photos stay embedded in the album
 * document exactly as the domain type models them.
 *
 * Filters mirror lib/gallerySearch.filterAlbums: free-text haystack, exact
 * category, and capture-year (first 4 chars of the ISO date). Order: newest
 * captures first.
 */

const sort: Sort = { date: -1, title: 1 };

const YEAR_PATTERN = /^\d{4}$/;

function buildFilter(query: ContentQuery): Filter<GalleryAlbumDoc> {
  const filter: Filter<GalleryAlbumDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.category === "string" && f.category) {
    filter.category = f.category;
  }
  if (typeof f.year === "string" && YEAR_PATTERN.test(f.year)) {
    // album.date.slice(0, 4) === year — anchored prefix match on ISO dates.
    filter.date = { $regex: `^${f.year}-` };
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
    // Capture years — port of getGalleryYears (newest first).
    years: [
      {
        $group: { _id: { $substrCP: ["$date", 0, 4] } },
      },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, value: "$_id" } },
    ],
    // Total archived photos across published albums (hero stat).
    photos: [{ $group: { _id: null, n: { $sum: "$photoCount" } } }, { $project: { n: 1, _id: 0 } }],
  };
}

class GalleryRepository extends ListRepository<GalleryAlbumDoc, GalleryAlbum> {
  constructor() {
    super({
      collection: collections.galleryAlbums,
      // ARCHIVED ALBUMS STAY PRIVATE (spec §13).
      visibility: { status: "published" },
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  async related(current: GalleryAlbum, count = 3): Promise<GalleryAlbum[]> {
    const all = await this.allVisible();
    return pickRelatedAlbums(all, current, count);
  }
}

export const galleryRepository = new GalleryRepository();

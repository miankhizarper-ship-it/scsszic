import type { Document, Filter, Sort, WithId } from "mongodb";

import { collections, type GalleryAlbumDoc } from "../../db/collections.js";
import type { GalleryAlbum } from "../../content/types.js";
/** Embedded photo shape — the album model's own photos element. */
type GalleryPhoto = GalleryAlbum["photos"][number];
import { escapeRegExp } from "./text.js";
import { stripInternals } from "./strip.js";
import type {
  AdminGalleryCreateInput,
  AdminGalleryListQuery,
  AdminGalleryPhotoInput,
  AdminGalleryUpdateInput,
} from "../../http/gallerySchemas.js";

/**
 * Admin Gallery repository (Phase 9G) — CRUD over the SAME `gallery_albums`
 * collection the public Phase 8 repository reads, with the SAME document
 * conventions (canonical `id` mirrored into `_id`, seed-computed
 * `searchText` haystack, internals stripped from every response).
 *
 * Architecture (spec §2/§4): photos are EMBEDDED in the album document —
 * there is no separate photos collection and there are no photo endpoints.
 * The array order IS the display order (PhotoGrid/Lightbox render it
 * index-order), so reordering is a PATCH carrying the array in the new
 * order — deterministic and persisted to MongoDB. The denormalized
 * `photoCount` is recomputed server-side on every write (it always equals
 * photos.length, the model's own invariant). Photos added without an `id`
 * get a collision-safe generated one (the seed's "alb-…-pN" family keeps
 * working; new ids join the same lowercase-id space).
 *
 * The publication lifecycle is the model's own (published/archived). The
 * PUBLIC repository gates queries to `status: "published"` — that gate is
 * untouched, so archived albums stay private exactly as before (spec §13).
 * The admin surface intentionally sees archived albums too.
 *
 * `searchText` is maintained on every write with the exact field list the
 * seeder uses (seed.ts SEARCH_FIELDS.gallery_albums — title, description,
 * category, location, tags).
 */

/** Most recent captures first — the public listing's canonical order. */
const SORTS: Record<AdminGalleryListQuery["sort"], Sort> = {
  date_desc: { date: -1, title: 1 },
  date_asc: { date: 1, title: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  photos_desc: { photoCount: -1, title: 1 },
};

export interface AdminGalleryFacetEntry {
  value: string;
  n: number;
}

export interface AdminGalleryListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Unfiltered distributions (filter chips with real counts). */
  facets: {
    statuses: AdminGalleryFacetEntry[];
    categories: AdminGalleryFacetEntry[];
    events: AdminGalleryFacetEntry[];
  };
}

export interface AdminGalleryListResult {
  items: GalleryAlbum[];
  meta: AdminGalleryListMeta;
}

/* ------------------------------ searchText ------------------------------ */

/**
 * Mirrors seed.ts SEARCH_FIELDS.gallery_albums exactly:
 * title, description, category, location, tags — joined with spaces,
 * lowercased.
 */
function buildAlbumSearchText(album: {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  tags?: string[];
}): string {
  return [album.title, album.description, album.category, album.location, album.tags]
    .flat()
    .map((part) => (part ?? "").toString())
    .join(" ")
    .toLowerCase();
}

/** Collision-safe canonical id in the existing "alb-*" family. */
function generateAlbumId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `alb-${Date.now().toString(36)}${random}`.toLowerCase();
}

/** Collision-safe photo id for embedded photos added without one. */
function generatePhotoId(): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `p-${Date.now().toString(36)}${random}`.toLowerCase();
}

/**
 * Assign generated ids to any photos that arrive without one — the model
 * requires photo.id (PhotoGrid keys + Lightbox navigation use it). Empty
 * captions mean "no caption" and are omitted (the seed's convention).
 */
function withPhotoIds(photos: AdminGalleryPhotoInput[]): GalleryPhoto[] {
  return photos.map((photo) => ({
    id: photo.id ?? generatePhotoId(),
    src: photo.src,
    alt: photo.alt,
    ...(photo.caption ? { caption: photo.caption } : {}),
  }));
}

/**
 * Optional text/reference fields that mean "absent" when empty — stored
 * docs simply omit the key when unset (the seed's convention).
 */
const OPTIONAL_EMPTY_KEYS = ["eventSlug", "location"] as const;

/** Splits a write payload into $set + $unset, honoring the empty-means-absent keys. */
function buildWriteSets(payload: Record<string, unknown>): {
  set: Record<string, unknown>;
  unset: Record<string, 1>;
} {
  const set: Record<string, unknown> = { ...payload };
  const unset: Record<string, 1> = {};
  for (const key of OPTIONAL_EMPTY_KEYS) {
    if (set[key] === "") {
      delete set[key];
      unset[key] = 1;
    }
  }
  return { set, unset };
}

function toDomain(doc: WithId<GalleryAlbumDoc>): GalleryAlbum {
  return stripInternals(doc) as unknown as GalleryAlbum;
}

/* ------------------------------- repository ------------------------------ */

class AdminGalleryRepository {
  private coll() {
    return collections.galleryAlbums();
  }

  /**
   * Management listing — search (same haystack as the public site),
   * status/category/year/event/featured filters, dynamic sort, real
   * pagination, plus unfiltered facet distributions. Total reflects the
   * filters. Admins see archived albums — no public visibility gate here.
   */
  async list(query: AdminGalleryListQuery): Promise<AdminGalleryListResult> {
    const filter: Filter<GalleryAlbumDoc> = {};

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
    if (query.year) {
      // Capture-year — the public repository's exact anchored prefix match.
      filter.date = { $regex: `^${query.year}-` };
    }
    if (query.event) {
      filter.eventSlug = query.event;
    }
    if (query.featured !== undefined) {
      // Seed docs omit `featured` entirely when false — "$ne: true" is the
      // honest "not featured" matcher for this collection.
      filter.featured = query.featured === "true" ? true : { $ne: true };
    }

    const pageSize = query.pageSize;
    const page = query.page;
    const sort = SORTS[query.sort];

    const [total, docs, statusRows, categoryRows, eventRows] = await Promise.all([
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
        .aggregate<{ _id: string | null; n: number }>([
          { $match: { eventSlug: { $exists: true, $nin: [null, ""] } } },
          { $group: { _id: "$eventSlug", n: { $sum: 1 } } },
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
          events: eventRows
            .filter((row): row is { _id: string; n: number } => Boolean(row._id))
            .map((row) => ({ value: row._id, n: row.n })),
        },
      },
    };
  }

  /** Single album by canonical id (any status — admins see everything). */
  async getById(id: string): Promise<GalleryAlbum | null> {
    const doc = await this.coll().findOne({ _id: id } as Filter<GalleryAlbumDoc>);
    return doc ? toDomain(doc) : null;
  }

  /** Slug availability check (create/update pre-check; DB index is the guard). */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<GalleryAlbumDoc> = { slug };
    if (excludeId) filter._id = { $ne: excludeId } as Filter<GalleryAlbumDoc>["_id"];
    const count = await this.coll().countDocuments(filter);
    return count > 0;
  }

  /** Insert a real album document — canonical id, photo ids, photoCount, searchText. */
  async create(input: Omit<AdminGalleryCreateInput, "slug"> & { slug: string }): Promise<GalleryAlbum> {
    const _id = generateAlbumId();
    const photos = withPhotoIds(input.photos);
    const { set, unset } = buildWriteSets({ ...input });
    void unset;

    const doc: GalleryAlbumDoc & Document = {
      ...(set as unknown as Omit<AdminGalleryCreateInput, "slug"> & { slug: string }),
      photos,
      // The model's own denormalized invariant: photoCount === photos.length.
      photoCount: photos.length,
      featured: input.featured ?? false,
      id: _id,
      searchText: buildAlbumSearchText(input),
      _id,
    };

    await this.coll().insertOne(doc);
    return toDomain(doc as WithId<GalleryAlbumDoc>);
  }

  /**
   * Partial update — merges onto the existing doc, recomputes searchText
   * and photoCount, assigns ids to newly added photos. Carrying `photos`
   * in the payload replaces the whole array in the sent order (reorder).
   */
  async update(id: string, input: AdminGalleryUpdateInput): Promise<GalleryAlbum | null> {
    const existing = await this.coll().findOne({ _id: id } as Filter<GalleryAlbumDoc>);
    if (!existing) return null;

    const photos = input.photos ? withPhotoIds(input.photos) : existing.photos;
    const merged = { ...existing, ...input, photos } as GalleryAlbumDoc;

    const { set, unset } = buildWriteSets({
      ...input,
      searchText: buildAlbumSearchText(merged),
    });
    // The photo array is replaced with the id-assigned, order-preserving
    // version (reorder + add/remove in one deterministic write) and
    // photoCount is always recomputed from it.
    if (input.photos) set.photos = photos;
    set.photoCount = photos.length;

    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<GalleryAlbumDoc>,
      (Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set }) as never,
      { returnDocument: "after" },
    );

    return result ? toDomain(result) : null;
  }

  /** Safe lifecycle transition — validated against the model's own statuses. */
  async updateStatus(
    id: string,
    status: "published" | "archived",
  ): Promise<GalleryAlbum | null> {
    const result = await this.coll().findOneAndUpdate(
      { _id: id } as Filter<GalleryAlbumDoc>,
      { $set: { status } },
      { returnDocument: "after" },
    );
    return result ? toDomain(result) : null;
  }

  /** Delete exactly one album by canonical id — never a batch, never silent. */
  async remove(id: string): Promise<boolean> {
    const result = await this.coll().deleteOne({ _id: id } as Filter<GalleryAlbumDoc>);
    return result.deletedCount === 1;
  }
}

export const adminGalleryRepository = new AdminGalleryRepository();

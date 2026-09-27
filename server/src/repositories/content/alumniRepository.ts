import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type AlumnusDoc } from "../../db/collections.js";
import type { SerializedAlumnus } from "../../content/types.js";
import { stripInternals } from "./strip.js";

/**
 * Alumni repository — the alumni dataset has no draft/archived lifecycle;
 * every alumnus is public (Phase 2 behavior preserved).
 *
 * Filters mirror lib/alumniSearch.filterAlumni: free-text haystack, batch
 * year, and professional field. Order mirrors sortAlumni: newest batch
 * first, alphabetical within a batch.
 */

const sort: Sort = { batchYear: -1, name: 1 };

function buildFilter(query: ContentQuery): Filter<AlumnusDoc> {
  const filter: Filter<AlumnusDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.batch === "string" && /^\d{4}$/.test(f.batch)) {
    filter.batchYear = Number.parseInt(f.batch, 10);
  }
  if (typeof f.field === "string" && f.field) {
    filter.field = f.field as AlumnusDoc["field"];
  }

  return filter;
}

function buildFacets() {
  return {
    batches: [
      { $group: { _id: "$batchYear" } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, value: "$_id" } },
    ],
    fields: [
      { $group: { _id: "$field", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
  };
}

class AlumniRepository extends ListRepository<AlumnusDoc, SerializedAlumnus> {
  constructor() {
    super({
      collection: collections.alumni,
      visibility: {},
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  /**
   * Related alumni — port of the AlumniDetailPage selection: same field
   * first, then other profiles (newest batch), excluding self.
   */
  async related(current: SerializedAlumnus, count = 3): Promise<SerializedAlumnus[]> {
    const all = await this.allVisible();
    const sameField = all.filter((a) => a.id !== current.id && a.field === current.field);
    const others = all.filter((a) => a.id !== current.id && a.field !== current.field);
    return [...sameField, ...others].slice(0, count);
  }
}

export const alumniRepository = new AlumniRepository();

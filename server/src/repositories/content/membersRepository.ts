import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type MemberDoc } from "../../db/collections.js";
import type { Member } from "../../content/types.js";
import { pickRelatedMembers } from "./related.js";
import { stripInternals } from "./strip.js";

/**
 * Members repository — archived members are excluded in the QUERY layer
 * (spec §13), so /profile/:username and every directory listing stay safe
 * even for direct links to deactivated profiles.
 *
 * Filters mirror lib/memberSearch.filterMembers: free-text haystack (10+
 * fields, precomputed at seed time), batch year, and primary domain.
 * Order mirrors sortMembers: featured first, newest batch, alphabetical.
 */

const sort: Sort = { featured: -1, batchYear: -1, name: 1 };

function buildFilter(query: ContentQuery): Filter<MemberDoc> {
  const filter: Filter<MemberDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.batch === "string" && /^\d{4}$/.test(f.batch)) {
    filter.batchYear = Number.parseInt(f.batch, 10);
  }
  if (typeof f.domain === "string" && f.domain) {
    filter.domain = f.domain;
  }
  if (f.featured === true) {
    filter.featured = true;
  }
  if (Array.isArray(f.usernames) && f.usernames.length > 0) {
    filter.username = { $in: f.usernames };
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
    domains: [
      { $group: { _id: "$domain", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
  };
}

class MembersRepository extends ListRepository<MemberDoc, Member> {
  constructor() {
    super({
      collection: collections.members,
      // ARCHIVED MEMBERS STAY PRIVATE (spec §13 — active + alumni only).
      visibility: { status: { $in: ["active", "alumni"] } },
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  async related(current: Member, count = 3): Promise<Member[]> {
    const all = await this.allVisible();
    return pickRelatedMembers(all, current, count);
  }
}

export const membersRepository = new MembersRepository();

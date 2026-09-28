import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { collections, type TeamDoc } from "../../db/collections.js";
import type { TeamCard } from "../../content/types.js";
import type { WithId } from "mongodb";

/**
 * Team repository (Phase 12) — the PUBLIC read side of the admin-managed
 * Leadership/Developers cards. Archived cards never leave the database
 * (spec §13 gate lives in the visibility filter); listings are ordered by
 * the manual `order` number, then name.
 *
 * Filters: optional group (leaders/developers). The home page and the
 * About page both read small lists via the shared `limit` param.
 */

const sort: Sort = { group: 1, order: 1, name: 1 };

function buildFilter(query: ContentQuery): Filter<TeamDoc> {
  const filter: Filter<TeamDoc> = {};
  const f = query.filters;

  if (typeof f.group === "string" && f.group) {
    filter.group = f.group as TeamDoc["group"];
  }

  return filter;
}

function toDomain(doc: WithId<TeamDoc>): TeamCard {
  const { _id, searchText, createdAt: _c, updatedAt: _u, ...domain } = doc;
  void _id;
  void searchText;
  void _c;
  void _u;
  /* Doc socials carry icon KEYS — same convention as every serialized
     collection; the client service resolves them to components. */
  return domain as unknown as TeamCard;
}

class TeamRepository extends ListRepository<TeamDoc, TeamCard> {
  constructor() {
    super({
      collection: collections.team,
      // ARCHIVED CARDS STAY PRIVATE — only published cards are public.
      visibility: { status: "published" },
      buildFilter,
      sort,
      toDomain,
      buildFacets: () => ({}),
    });
  }
}

export const teamRepository = new TeamRepository();

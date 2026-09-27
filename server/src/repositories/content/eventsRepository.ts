import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type EventDoc } from "../../db/collections.js";
import type { SerializedEvent } from "../../content/types.js";
import { DEMO_NOW_DATE } from "./text.js";
import { pickRelatedEvents } from "./related.js";
import { stripInternals } from "./strip.js";

/**
 * Events repository — all events are public (the dataset has no draft/archived
 * lifecycle; status is upcoming/ongoing/completed/cancelled, mirroring the
 * Phase 3 behavior where every event appeared publicly).
 *
 * Filters mirror lib/eventSearch.filterEvents exactly: free-text haystack
 * search, exact category, status (lowercased), and date windows pinned to
 * the demo "now". Sorting is chronological for deterministic listings — the
 * events page derives its upcoming/past split client-side, unchanged.
 */

const sort: Sort = { date: 1, title: 1 };

function buildFilter(query: ContentQuery): Filter<EventDoc> {
  const filter: Filter<EventDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.category === "string" && f.category) {
    filter.category = f.category as EventDoc["category"];
  }
  if (typeof f.status === "string" && f.status) {
    // Single status OR comma-separated list (e.g. "upcoming,ongoing" for the
    // upcoming+live sections) — mirrors getUpcomingEvents semantics.
    const statuses = f.status
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (statuses.length === 1) {
      filter.status = statuses[0] as EventDoc["status"];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses as EventDoc["status"][] };
    }
  }
  if (typeof f.date === "string" && f.date) {
    // Date windows — identical semantics to lib/eventSearch.matchesDateWindow
    // against the pinned DEMO_NOW (deterministic demo behavior).
    switch (f.date) {
      case "This Month":
        filter.date = { $regex: "^2026-09-", $options: "i" };
        break;
      case "Next Month":
        filter.date = { $regex: "^2026-10-", $options: "i" };
        break;
      case "Past":
        filter.date = { $lt: DEMO_NOW_DATE };
        break;
      default:
        break;
    }
  }
  if (f.featured === true) {
    filter.featured = true;
  }

  return filter;
}

function buildFacets() {
  return {
    statuses: [
      { $group: { _id: "$status", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
    categories: [
      { $group: { _id: "$category", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
  };
}

class EventsRepository extends ListRepository<EventDoc, SerializedEvent> {
  constructor() {
    super({
      collection: collections.events,
      // No archived lifecycle — every event document is public.
      visibility: {},
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  /** Related events for a detail page (category + tags + upcoming boost). */
  async related(current: SerializedEvent, count = 3): Promise<SerializedEvent[]> {
    const all = await this.allVisible();
    return pickRelatedEvents(all, current, count);
  }
}

export const eventsRepository = new EventsRepository();

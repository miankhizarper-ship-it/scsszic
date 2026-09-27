import type { Filter, Sort } from "mongodb";

import { ListRepository, type ContentQuery } from "./listRepository.js";
import { searchFilter } from "./listRepository.js";
import { collections, type ProjectDoc } from "../../db/collections.js";
import type { Project } from "../../content/types.js";
import { pickRelatedProjects } from "./related.js";
import { stripInternals } from "./strip.js";

/**
 * Projects repository — archived projects are excluded in the QUERY layer
 * (spec §13); only active + completed builds are public.
 *
 * Filters mirror lib/projectSearch.filterProjects: free-text haystack,
 * exact category, case-insensitive technology membership, lifecycle status,
 * and member roster (owner or team list). Order: most recently updated.
 */

const sort: Sort = { updatedAt: -1, title: 1 };

function buildFilter(query: ContentQuery): Filter<ProjectDoc> {
  const filter: Filter<ProjectDoc> = {};
  const f = query.filters;

  Object.assign(filter, searchFilter(query.search));

  if (typeof f.category === "string" && f.category) {
    filter.category = f.category;
  }
  if (typeof f.technology === "string" && f.technology) {
    // Case-insensitive tech membership — mirrors the client comparator.
    filter.technologies = {
      $elemMatch: {
        $regex: `^${f.technology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    };
  }
  if (typeof f.status === "string" && f.status) {
    filter.status = f.status.toLowerCase() as ProjectDoc["status"];
  }
  if (typeof f.memberUsername === "string" && f.memberUsername) {
    // Owner OR roster membership (mirrors getProjectsByMember).
    filter.$or = [{ ownerUsername: f.memberUsername }, { memberUsernames: f.memberUsername }];
  }
  if (f.featured === true) {
    filter.featured = true;
  }

  return filter;
}

function buildFacets() {
  return {
    categories: [
      { $group: { _id: "$category" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id" } },
    ],
    technologies: [
      { $unwind: "$technologies" },
      { $group: { _id: "$technologies" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id" } },
    ],
    // Lifecycle counts (active/completed) for derived stats.
    statuses: [
      { $group: { _id: "$status", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, value: "$_id", n: 1 } },
    ],
    // Distinct builders across all public projects (hero "Contributors" stat).
    contributors: [
      { $unwind: "$memberUsernames" },
      { $group: { _id: "$memberUsernames" } },
      { $project: { _id: 0, value: "$_id" } },
    ],
  };
}

class ProjectsRepository extends ListRepository<ProjectDoc, Project> {
  constructor() {
    super({
      collection: collections.projects,
      // ARCHIVED PROJECTS STAY PRIVATE (spec §13).
      visibility: { status: { $in: ["active", "completed"] } },
      buildFilter,
      sort,
      toDomain: (doc) => stripInternals(doc),
      buildFacets,
    });
  }

  async related(current: Project, count = 3): Promise<Project[]> {
    const all = await this.allVisible();
    return pickRelatedProjects(all, current, count);
  }
}

export const projectsRepository = new ProjectsRepository();

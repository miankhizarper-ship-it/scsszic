import type { Alumnus } from "@/types";

export interface AlumniFilters {
  /** Free-text query — matches name, role, company, skills, and field. */
  query: string;
  /** Selected batch year as a string ("" = all). */
  batch: string;
  /** Selected professional field ("" = all). */
  field: string;
}

/**
 * Pure alumni filtering logic for the directory.
 *
 * Kept separate from the UI so the exact same contract can be re-used
 * against the future `GET /api/alumni` endpoint (send the filters as query
 * params) without redesigning the page.
 */
export function filterAlumni(
  alumni: Alumnus[],
  { query, batch, field }: AlumniFilters,
): Alumnus[] {
  const normalizedQuery = query.trim().toLowerCase();

  return alumni.filter((person) => {
    if (batch && String(person.batchYear) !== batch) return false;
    if (field && person.field !== field) return false;

    if (normalizedQuery) {
      const haystack = [
        person.name,
        person.role,
        person.company,
        person.field,
        person.achievement,
        ...(person.skills ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/** Newest batch first; ties broken alphabetically. */
export function sortAlumni(alumni: Alumnus[]): Alumnus[] {
  return [...alumni].sort(
    (a, b) => b.batchYear - a.batchYear || a.name.localeCompare(b.name),
  );
}

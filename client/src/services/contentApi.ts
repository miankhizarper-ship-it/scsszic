import { ApiError, apiFetch } from "@/services/apiClient";

/**
 * Shared helpers for the Phase 8 content services.
 *
 * The API returns `{ data }` for single resources and `{ data, meta }` for
 * collections; these helpers keep every service mapping to the EXISTING
 * domain shapes (including `undefined`-on-404 lookup semantics the pages
 * already implement with their "Not Found" states).
 */

/**
 * Fetch `{ data: T }`; ApiError 404 → null (expected lookup miss).
 * Null — never undefined — so TanStack Query v5 can use it as query data
 * (undefined is reserved for "no data yet" and is rejected as a value).
 */
export async function fetchSingle<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T | null> {
  try {
    const response = await apiFetch<{ data: T }>(path, { params });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Fetch a collection envelope (already domain-mapped by the caller). */
export function fetchList<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T[]; meta: import("@/types").ListMeta }> {
  return apiFetch<{ data: T[]; meta: import("@/types").ListMeta }>(path, { params });
}

/**
 * GET /api/categories?section=… (Phase 10C) — public category vocabulary for
 * the listing filter chips: the admin-managed list union the values actually
 * in use. Falls back to the curated constants in each page's hook wiring on
 * failure, so the filters degrade gracefully when the API is unavailable.
 */
export async function fetchCategories(section: import("@/types").CategorySection): Promise<string[]> {
  const response = await apiFetch<{ data: { section: string; categories: string[] } }>(
    "/categories",
    { params: { section } },
  );
  return response.data.categories;
}

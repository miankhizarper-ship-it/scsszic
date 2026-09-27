import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { alumniService } from "@/services/alumniService";
import { blogService } from "@/services/blogService";
import { eventService } from "@/services/eventService";
import { feedService } from "@/services/feedService";
import { galleryService } from "@/services/galleryService";
import { memberService } from "@/services/memberService";
import { projectService } from "@/services/projectService";
import { watchService } from "@/services/watchService";
import { fetchCategories } from "@/services/contentApi";
import type { EventFilters } from "@/lib/eventSearch";
import type { BlogFilters } from "@/lib/blogSearch";
import type { FeedFilters } from "@/lib/feedSearch";
import type { GalleryFilters } from "@/lib/gallerySearch";
import type { MemberFilters } from "@/lib/memberSearch";
import type { ProjectFilters } from "@/lib/projectSearch";
import type { WatchFilters } from "@/lib/watchSearch";
import type { CategorySection, FeedComment } from "@/types";

/**
 * TanStack Query hooks over the Phase 8 content services (spec §17).
 *
 * - Listing hooks pass filters as part of the query key and keep previous
 *   data while refetching, so typing/filtering never flashes empty.
 * - Detail hooks resolve to `undefined` for unknown/archived slugs — pages
 *   render their existing "Not Found" states unchanged.
 * - Public content is safe to cache (staleTime 60s, no window refetch —
 *   the project's QueryClient defaults).
 */

const LIST_STALE_TIME = 60 * 1000;

/* ------------------------------- Categories (10C) ------------------------- */

/**
 * Public category vocabulary for the listing filter chips — the admin-
 * managed list (union in-use values) from GET /api/categories. While the
 * request is in flight (or if it fails), the curated constants are used as
 * placeholder/fallback data so the filters never flash empty.
 */
export function useCategories(section: CategorySection, fallback: readonly string[]) {
  return useQuery({
    queryKey: ["public", "categories", section],
    queryFn: () => fetchCategories(section),
    placeholderData: fallback as string[],
    staleTime: LIST_STALE_TIME,
    retry: 1,
  });
}

/* --------------------------------- Events --------------------------------- */

export function useEvents(filters: Partial<EventFilters> = {}) {
  return useQuery({
    queryKey: ["events", "list", filters],
    queryFn: () => eventService.listEvents(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ["events", "detail", slug],
    queryFn: () => eventService.getEventBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFeaturedEvent() {
  return useQuery({
    queryKey: ["events", "featured"],
    queryFn: () => eventService.getFeaturedEvent(),
    staleTime: LIST_STALE_TIME,
  });
}

export function useUpcomingEvents(count?: number) {
  return useQuery({
    queryKey: ["events", "upcoming", count ?? null],
    queryFn: () => eventService.getUpcomingEvents(count),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedEvents(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["events", "related", slug, count],
    queryFn: () => eventService.getRelatedEvents(slug, count),
    enabled: Boolean(slug),
  });
}

/* --------------------------------- Blogs ---------------------------------- */

export function useBlogs(filters: Partial<BlogFilters> = {}) {
  return useQuery({
    queryKey: ["blogs", "list", filters],
    queryFn: () => blogService.listBlogs(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useBlog(slug: string | undefined) {
  return useQuery({
    queryKey: ["blogs", "detail", slug],
    queryFn: () => blogService.getBlogBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFeaturedBlog() {
  return useQuery({
    queryKey: ["blogs", "featured"],
    queryFn: () => blogService.getFeaturedBlog(),
    staleTime: LIST_STALE_TIME,
  });
}

/** The N newest published articles (home page blog section). */
export function useLatestBlogs(limit = 3) {
  return useQuery({
    queryKey: ["blogs", "latest", limit],
    queryFn: () => blogService.getLatestBlogs(limit),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedBlogs(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["blogs", "related", slug, count],
    queryFn: () => blogService.getRelatedBlogs(slug, count),
    enabled: Boolean(slug),
  });
}

/* -------------------------------- Gallery --------------------------------- */

export function useAlbums(filters: Partial<GalleryFilters> = {}) {
  return useQuery({
    queryKey: ["gallery", "list", filters],
    queryFn: () => galleryService.listAlbums(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useAlbum(slug: string | undefined) {
  return useQuery({
    queryKey: ["gallery", "detail", slug],
    queryFn: () => galleryService.getAlbumBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFeaturedAlbum() {
  return useQuery({
    queryKey: ["gallery", "featured"],
    queryFn: () => galleryService.getFeaturedAlbum(),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedAlbums(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["gallery", "related", slug, count],
    queryFn: () => galleryService.getRelatedAlbums(slug, count),
    enabled: Boolean(slug),
  });
}

/* --------------------------------- Watch ---------------------------------- */

export function useVideos(filters: Partial<WatchFilters> = {}) {
  return useQuery({
    queryKey: ["watch", "list", filters],
    queryFn: () => watchService.listVideos(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useVideo(slug: string | undefined) {
  return useQuery({
    queryKey: ["watch", "detail", slug],
    queryFn: () => watchService.getVideoBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFeaturedVideo() {
  return useQuery({
    queryKey: ["watch", "featured"],
    queryFn: () => watchService.getFeaturedVideo(),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedVideos(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["watch", "related", slug, count],
    queryFn: () => watchService.getRelatedVideos(slug, count),
    enabled: Boolean(slug),
  });
}

/* --------------------------------- Alumni --------------------------------- */

export function useAlumni(filters: { query?: string; batch?: string; field?: string } = {}) {
  return useQuery({
    queryKey: ["alumni", "list", filters],
    queryFn: () => alumniService.listAlumni(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useAlumnus(slug: string | undefined) {
  return useQuery({
    queryKey: ["alumni", "detail", slug],
    queryFn: () => alumniService.getAlumnusBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useRelatedAlumni(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["alumni", "related", slug, count],
    queryFn: () => alumniService.getRelatedAlumni(slug, count),
    enabled: Boolean(slug),
  });
}

/* -------------------------------- Members --------------------------------- */

export function useMembers(filters: Partial<MemberFilters> = {}) {
  return useQuery({
    queryKey: ["members", "list", filters],
    queryFn: () => memberService.listMembers(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useMember(username: string | undefined) {
  return useQuery({
    queryKey: ["members", "detail", username],
    queryFn: () => memberService.getMemberByUsername(username),
    enabled: Boolean(username),
  });
}

export function useMembersByUsernames(usernames: string[]) {
  const key = [...usernames].sort().join(",");
  return useQuery({
    queryKey: ["members", "byUsernames", key],
    queryFn: () => memberService.getMembersByUsernames(usernames),
    enabled: usernames.length > 0,
    staleTime: LIST_STALE_TIME,
  });
}

export function useFeaturedMembers(count = 3) {
  return useQuery({
    queryKey: ["members", "featured", count],
    queryFn: () => memberService.getFeaturedMembers(count),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedMembers(username: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["members", "related", username, count],
    queryFn: () => memberService.getRelatedMembers(username, count),
    enabled: Boolean(username),
  });
}

/* -------------------------------- Projects -------------------------------- */

export function useProjects(filters: Partial<ProjectFilters> = {}) {
  return useQuery({
    queryKey: ["projects", "list", filters],
    queryFn: () => projectService.listProjects(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", slug],
    queryFn: () => projectService.getProjectBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFeaturedProject() {
  return useQuery({
    queryKey: ["projects", "featured"],
    queryFn: () => projectService.getFeaturedProjects(1),
    select: (projects) => projects[0],
    staleTime: LIST_STALE_TIME,
  });
}

export function useProjectsByMember(username: string | undefined) {
  return useQuery({
    queryKey: ["projects", "byMember", username ?? null],
    queryFn: () => projectService.getProjectsByMember(username),
    enabled: Boolean(username),
    staleTime: LIST_STALE_TIME,
  });
}

export function useRelatedProjects(slug: string | undefined, count = 3) {
  return useQuery({
    queryKey: ["projects", "related", slug, count],
    queryFn: () => projectService.getRelatedProjects(slug, count),
    enabled: Boolean(slug),
  });
}

/* ---------------------------------- Feed ---------------------------------- */

export function useFeedPosts(filters: Partial<FeedFilters> = {}) {
  return useQuery({
    queryKey: ["feed", "list", filters],
    queryFn: () => feedService.listPosts(filters),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_TIME,
  });
}

export function useFeedPreview(count = 3) {
  return useQuery({
    queryKey: ["feed", "preview", count],
    queryFn: () => feedService.getPosts(count),
    staleTime: LIST_STALE_TIME,
  });
}

export function usePostsByAuthor(username: string | undefined) {
  return useQuery({
    queryKey: ["feed", "byAuthor", username ?? null],
    queryFn: () => feedService.getPostsByAuthor(username),
    enabled: Boolean(username),
    staleTime: LIST_STALE_TIME,
  });
}

export function usePostsByProject(slug: string | undefined) {
  return useQuery({
    queryKey: ["feed", "byProject", slug ?? null],
    queryFn: () => feedService.getPostsByProject(slug),
    enabled: Boolean(slug),
    staleTime: LIST_STALE_TIME,
  });
}

/* -------------------------- Feed engagement -------------------------- */

/**
 * Batched per-viewer like-state for a page of posts (ONE request per
 * page). `enabled` should be false for anonymous viewers — the endpoint is
 * safe for them (empty list), but skipping the request avoids the round
 * trip entirely. The key includes the viewer id so login/logout can never
 * show a stale user's likes.
 */
export function useFeedViewerState(postIds: string[], viewerId: string | null) {
  const key = [...postIds].sort().join(",");
  return useQuery({
    queryKey: ["feed", "viewerState", key, viewerId ?? "anon"],
    queryFn: () => feedService.getViewerState(postIds),
    enabled: postIds.length > 0,
    staleTime: 30 * 1000,
    retry: 0,
  });
}

/** Comment thread for one post — fetched lazily when its panel opens. */
export function useFeedComments(postId: string | null) {
  return useQuery({
    queryKey: ["feed", "comments", postId],
    queryFn: () => feedService.listComments(postId!),
    enabled: Boolean(postId),
    staleTime: 30 * 1000,
    retry: 0,
  });
}

/** Toggle the signed-in viewer's like on one post. */
export function useToggleFeedLike() {
  return useMutation({
    mutationFn: (postId: string) => feedService.toggleLike(postId),
  });
}

/** Add a comment as the signed-in viewer; refreshes the thread cache. */
export function useAddFeedComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => feedService.addComment(postId, body),
    onSuccess: (comment) => {
      queryClient.setQueryData<FeedComment[]>(
        ["feed", "comments", postId],
        (existing) => [...(existing ?? []), comment],
      );
    },
  });
}

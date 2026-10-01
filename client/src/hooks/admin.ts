import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/adminService";
import type {
  AdminAlumniListParams,
  AdminAuditListParams,
  AdminBlogListParams,
  AdminEventListParams,
  AdminFeedListParams,
  AdminGalleryListParams,
  AdminMemberListParams,
  AdminProjectListParams,
  AdminTeamListParams,
  AdminUserListParams,
  AdminUserUpdate,
  AdminVideoListParams,
  AlumnusWrite,
  Blog,
  CategorySection,
  FeedPost,
  GalleryAlbum,
  GalleryAlbumWrite,
  Member,
  Project,
  SerializedSocialLink,
  SocietyEvent,
  TeamCardWrite,
  WatchVideo,
} from "@/types";

/**
 * Admin queries + mutations (Phase 9B/9C/9D).
 *
 * The dashboard deliberately refetches on every mount (staleTime 0): an
 * admin landing page should always show the current counts, unlike the
 * cached public content listings (staleTime 60s). `retry: 1` and
 * `refetchOnWindowFocus: false` come from the project's QueryClient
 * defaults; nothing about the session or auth state is cached here — the
 * HTTP-only cookie plus the server-side requireAdmin check stay the single
 * source of truth.
 *
 * Phase 9C adds the Events CMS hooks. Every mutation invalidates, in one
 * place: the admin list, the admin dashboard (so counts never go stale),
 * and the public queries (so the public site reflects edits immediately).
 * No CMS state touches localStorage.
 *
 * Phase 9D adds the Blogs CMS hooks with the same invalidation contract —
 * plus the public blogs queries, so a publish/unpublish transition is
 * visible on the public site without a full reload.
 *
 * Phase 9E adds the Alumni + Members CMS hooks. Alumni mutations
 * invalidate the admin list, the dashboard, and the public alumni queries.
 * Member mutations additionally invalidate the public projects queries —
 * project rosters resolve members by username, so the showcase must
 * refetch after a member write. No CMS state touches localStorage.
 *
 * Phase 9F adds the Projects + Feed CMS hooks. Project mutations
 * invalidate the admin list, the dashboard, the public projects queries,
 * and the public feed queries (project pages embed related activity).
 * Feed mutations invalidate the admin list, the dashboard, the public feed
 * queries, and the public projects queries (the feed cross-links projects
 * both ways). No CMS state touches localStorage.
 *
 * Phase 9G adds the Gallery + Videos CMS hooks. Album mutations invalidate
 * the admin list, the dashboard, the public gallery queries, and the
 * public events queries (albums reference events). Video mutations
 * invalidate the admin list, the dashboard, the public watch queries, and
 * the public events queries (videos reference events). No CMS state
 * touches localStorage.
 *
 * Phase 9H adds the Users CMS + the Audit log hooks. Every admin mutation
 * (content or user) now also invalidates the admin audit query — audit
 * records are written server-side on each successful write, so the audit
 * page must refetch to stay truthful. User mutations invalidate the admin
 * users list and the audit trail. No CMS state touches localStorage.
 */
export function useAdminDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminService.getDashboard(),
    staleTime: 0,
    /** Phase 10B — manage users never call this admin-only endpoint; the
     *  dashboard renders a section-links panel for them instead. */
    enabled: options?.enabled ?? true,
  });
}

/* ------------------------------ Events (9C) ------------------------------ */

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminEvents(params: AdminEventListParams) {
  return useQuery({
    queryKey: ["admin", "events", "list", params],
    queryFn: () => adminService.listEvents(params),
    placeholderData: (previous) => previous,
  });
}

/* ------------------------------- Blogs (9D) ------------------------------- */

/** Invalidate every surface a blog write can touch — dashboard included. */
function useInvalidateBlogSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "blogs"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminBlogs(params: AdminBlogListParams) {
  return useQuery({
    queryKey: ["admin", "blogs", "list", params],
    queryFn: () => adminService.listBlogs(params),
    placeholderData: (previous) => previous,
  });
}

/** Single blog for the edit form — 404s surface through `isError`. */
export function useAdminBlog(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "blogs", "detail", id],
    queryFn: () => adminService.getBlog(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateBlog() {
  const invalidate = useInvalidateBlogSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Blog>) => adminService.createBlog(body),
    onSuccess: invalidate,
  });
}

export function useUpdateBlog(id: string) {
  const invalidate = useInvalidateBlogSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Blog>) => adminService.updateBlog(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateBlogStatus() {
  const invalidate = useInvalidateBlogSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Blog["status"] }) =>
      adminService.updateBlogStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteBlog() {
  const invalidate = useInvalidateBlogSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteBlog(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------ Events (9C) ------------------------------ */

/** Single event for the edit form — 404s surface through `isError`. */
export function useAdminEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "events", "detail", id],
    queryFn: () => adminService.getEvent(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

/** Invalidate every surface an event write can touch — dashboard included. */
function useInvalidateEventSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateEventSurfaces();
  return useMutation({
    mutationFn: (body: Partial<SocietyEvent>) => adminService.createEvent(body),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidateEventSurfaces();
  return useMutation({
    mutationFn: (body: Partial<SocietyEvent>) => adminService.updateEvent(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateEventStatus() {
  const invalidate = useInvalidateEventSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SocietyEvent["status"] }) =>
      adminService.updateEventStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEventSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteEvent(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------ Alumni (9E) ------------------------------ */

/** Invalidate every surface an alumnus write can touch — dashboard included. */
function useInvalidateAlumniSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "alumni"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["alumni"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminAlumni(params: AdminAlumniListParams) {
  return useQuery({
    queryKey: ["admin", "alumni", "list", params],
    queryFn: () => adminService.listAlumni(params),
    placeholderData: (previous) => previous,
  });
}

/** Single alumnus for the edit form — 404s surface through `isError`. */
export function useAdminAlumnus(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "alumni", "detail", id],
    queryFn: () => adminService.getAlumnus(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateAlumnus() {
  const invalidate = useInvalidateAlumniSurfaces();
  return useMutation({
    mutationFn: (body: Partial<AlumnusWrite>) => adminService.createAlumnus(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAlumnus(id: string) {
  const invalidate = useInvalidateAlumniSurfaces();
  return useMutation({
    mutationFn: (body: Partial<AlumnusWrite>) => adminService.updateAlumnus(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteAlumnus() {
  const invalidate = useInvalidateAlumniSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteAlumnus(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------ Team (12) ------------------------------ */

/** Invalidate every surface a team-card write can touch — dashboard included. */
function useInvalidateTeamSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["team"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminTeam(params: AdminTeamListParams) {
  return useQuery({
    queryKey: ["admin", "team", "list", params],
    queryFn: () => adminService.listTeam(params),
    placeholderData: (previous) => previous,
  });
}

/** Single card for the edit form — 404s surface through `isError`. */
export function useAdminTeamCard(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "team", "detail", id],
    queryFn: () => adminService.getTeamCard(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateTeamCard() {
  const invalidate = useInvalidateTeamSurfaces();
  return useMutation({
    mutationFn: (body: Partial<TeamCardWrite>) => adminService.createTeamCard(body),
    onSuccess: invalidate,
  });
}

export function useUpdateTeamCard(id: string) {
  const invalidate = useInvalidateTeamSurfaces();
  return useMutation({
    mutationFn: (body: Partial<TeamCardWrite>) => adminService.updateTeamCard(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteTeamCard() {
  const invalidate = useInvalidateTeamSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteTeamCard(id),
    onSuccess: invalidate,
  });
}

/* ----------------------------- Members (9E) ------------------------------ */

/**
 * Invalidate every surface a member write can touch: the dashboard AND the
 * public projects queries (rosters cross-reference member usernames).
 */
function useInvalidateMemberSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["members"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminMembers(params: AdminMemberListParams) {
  return useQuery({
    queryKey: ["admin", "members", "list", params],
    queryFn: () => adminService.listMembers(params),
    placeholderData: (previous) => previous,
  });
}

/** Single member for the edit form — 404s surface through `isError`. */
export function useAdminMember(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "members", "detail", id],
    queryFn: () => adminService.getMember(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateMember() {
  const invalidate = useInvalidateMemberSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Member>) => adminService.createMember(body),
    onSuccess: invalidate,
  });
}

/**
 * Task 29 — accounts WITHOUT a member record, for the member form's
 * user picker. The search term is part of the key; the query stays idle
 * when the caller disables it (e.g. edit mode needs no picker).
 */
export function useMemberCandidates(search: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin", "members", "candidates", search],
    queryFn: () => adminService.listMemberCandidates(search, 10),
    staleTime: 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateMember(id: string) {
  const invalidate = useInvalidateMemberSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Member>) => adminService.updateMember(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberStatus() {
  const invalidate = useInvalidateMemberSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Member["status"] }) =>
      adminService.updateMemberStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteMember() {
  const invalidate = useInvalidateMemberSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteMember(id),
    onSuccess: invalidate,
  });
}

/* ----------------------------- Projects (9F) ----------------------------- */

/**
 * Invalidate every surface a project write can touch: the dashboard, the
 * public projects queries, AND the public feed queries (project pages
 * embed related activity; feed cards cross-link projects).
 */
function useInvalidateProjectSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminProjects(params: AdminProjectListParams) {
  return useQuery({
    queryKey: ["admin", "projects", "list", params],
    queryFn: () => adminService.listProjects(params),
    placeholderData: (previous) => previous,
  });
}

/** Single project for the edit form — 404s surface through `isError`. */
export function useAdminProject(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "projects", "detail", id],
    queryFn: () => adminService.getProject(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateProject() {
  const invalidate = useInvalidateProjectSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Project>) => adminService.createProject(body),
    onSuccess: invalidate,
  });
}

export function useUpdateProject(id: string) {
  const invalidate = useInvalidateProjectSurfaces();
  return useMutation({
    mutationFn: (body: Partial<Project>) => adminService.updateProject(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectStatus() {
  const invalidate = useInvalidateProjectSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Project["status"] }) =>
      adminService.updateProjectStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidateProjectSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteProject(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------- Feed (9F) ------------------------------- */

/**
 * Invalidate every surface a feed write can touch: the dashboard, the
 * public feed queries (profile activity + project activity included), AND
 * the public projects queries (the feed cross-links projects both ways).
 */
function useInvalidateFeedSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "feed"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminFeedPosts(params: AdminFeedListParams) {
  return useQuery({
    queryKey: ["admin", "feed", "list", params],
    queryFn: () => adminService.listFeedPosts(params),
    placeholderData: (previous) => previous,
  });
}

/** Single post for the edit form — 404s surface through `isError`. */
export function useAdminFeedPost(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "feed", "detail", id],
    queryFn: () => adminService.getFeedPost(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateFeedPost() {
  const invalidate = useInvalidateFeedSurfaces();
  return useMutation({
    mutationFn: (body: Partial<FeedPost>) => adminService.createFeedPost(body),
    onSuccess: invalidate,
  });
}

export function useUpdateFeedPost(id: string) {
  const invalidate = useInvalidateFeedSurfaces();
  return useMutation({
    mutationFn: (body: Partial<FeedPost>) => adminService.updateFeedPost(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateFeedPostStatus() {
  const invalidate = useInvalidateFeedSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedPost["status"] }) =>
      adminService.updateFeedPostStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteFeedPost() {
  const invalidate = useInvalidateFeedSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteFeedPost(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------ Gallery (9G) ------------------------------ */

/**
 * Invalidate every surface an album write can touch: the dashboard, the
 * public gallery queries, AND the public events queries (albums reference
 * events via eventSlug; the event↔gallery relationship stays coherent
 * from both sides).
 */
function useInvalidateGallerySurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["gallery"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminGallery(params: AdminGalleryListParams) {
  return useQuery({
    queryKey: ["admin", "gallery", "list", params],
    queryFn: () => adminService.listGallery(params),
    placeholderData: (previous) => previous,
  });
}

/** Single album for the edit form — 404s surface through `isError`. */
export function useAdminAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "gallery", "detail", id],
    queryFn: () => adminService.getAlbum(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateAlbum() {
  const invalidate = useInvalidateGallerySurfaces();
  return useMutation({
    mutationFn: (body: Partial<GalleryAlbumWrite>) => adminService.createAlbum(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAlbum(id: string) {
  const invalidate = useInvalidateGallerySurfaces();
  return useMutation({
    mutationFn: (body: Partial<GalleryAlbumWrite>) => adminService.updateAlbum(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateAlbumStatus() {
  const invalidate = useInvalidateGallerySurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: GalleryAlbum["status"] }) =>
      adminService.updateAlbumStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteAlbum() {
  const invalidate = useInvalidateGallerySurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteAlbum(id),
    onSuccess: invalidate,
  });
}

/* ------------------------------- Videos (9G) ------------------------------ */

/**
 * Invalidate every surface a video write can touch: the dashboard, the
 * public Watch queries, AND the public events queries (videos reference
 * events via eventSlug; the event↔video relationship stays coherent from
 * both sides).
 */
function useInvalidateVideoSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "videos"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["watch"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminVideos(params: AdminVideoListParams) {
  return useQuery({
    queryKey: ["admin", "videos", "list", params],
    queryFn: () => adminService.listVideos(params),
    placeholderData: (previous) => previous,
  });
}

/** Single video for the edit form — 404s surface through `isError`. */
export function useAdminVideo(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "videos", "detail", id],
    queryFn: () => adminService.getVideo(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateVideo() {
  const invalidate = useInvalidateVideoSurfaces();
  return useMutation({
    mutationFn: (body: Partial<WatchVideo>) => adminService.createVideo(body),
    onSuccess: invalidate,
  });
}

export function useUpdateVideo(id: string) {
  const invalidate = useInvalidateVideoSurfaces();
  return useMutation({
    mutationFn: (body: Partial<WatchVideo>) => adminService.updateVideo(id, body),
    onSuccess: invalidate,
  });
}

export function useUpdateVideoStatus() {
  const invalidate = useInvalidateVideoSurfaces();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WatchVideo["status"] }) =>
      adminService.updateVideoStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteVideo() {
  const invalidate = useInvalidateVideoSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteVideo(id),
    onSuccess: invalidate,
  });
}

/* -------------------------------- Users (9H) ------------------------------ */

/**
 * Invalidate every surface a user write can touch: the admin users list
 * AND the audit trail (role/status-style changes are recorded server-side).
 * The dashboard counts content only, so it is deliberately not invalidated.
 */
function useInvalidateUserSurfaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  };
}

/** Management listing — filters are part of the key; rows stay while refetching. */
export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: ["admin", "users", "list", params],
    queryFn: () => adminService.listUsers(params),
    placeholderData: (previous) => previous,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUserSurfaces();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUserUpdate }) =>
      adminService.updateUser(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUserSurfaces();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: invalidate,
  });
}

/* --------------------------------- Audit (9H) ------------------------------ */

/**
 * Read-only audit trail listing — filters are part of the key. There is no
 * audit mutation hook: records are written server-side by the centralized
 * audit logger and every admin write invalidates this query instead.
 */
export function useAdminAudit(params: AdminAuditListParams) {
  return useQuery({
    queryKey: ["admin", "audit", "list", params],
    queryFn: () => adminService.listAudit(params),
    placeholderData: (previous) => previous,
  });
}

/* ------------------- Categories + slug checks (10C) ----------------------- */

/**
 * Managed category vocabulary for one CMS section. Mutations below replace
 * the cached list from the server response directly AND invalidate (so the
 * dashboard/audit surfaces refetch), keeping the picker instant.
 */
export function useAdminCategories(section: CategorySection) {
  return useQuery({
    queryKey: ["admin", "categories", section],
    queryFn: () => adminService.listCategories(section),
    staleTime: 60_000,
  });
}

/** Invalidate both the admin vocabulary and the public filter-chip query. */
function useInvalidateCategorySurfaces(section: CategorySection) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "categories", section] });
    void queryClient.invalidateQueries({ queryKey: ["public", "categories", section] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  };
}

export function useAddCategory(section: CategorySection) {
  const invalidate = useInvalidateCategorySurfaces(section);
  return useMutation({
    mutationFn: (name: string) => adminService.addCategory(section, name),
    onSuccess: () => invalidate(),
  });
}

export function useRenameCategory(section: CategorySection) {
  const invalidate = useInvalidateCategorySurfaces(section);
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminService.renameCategory(section, id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory(section: CategorySection) {
  const invalidate = useInvalidateCategorySurfaces(section);
  return useMutation({
    mutationFn: (id: string) => adminService.deleteCategory(section, id),
    onSuccess: invalidate,
  });
}

/* --------------------------- Settings (Task 15) -------------------------- */

/** Current site settings for the admin editor (admin-only endpoint). */
export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminService.getSiteSettings(),
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Replace-all settings save. Invalidates the admin copy AND the public
 * ["settings", "site"] cache so every open page's footer refetches with
 * the new social links immediately.
 */
export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { socials: SerializedSocialLink[]; heroImage: string }) =>
      adminService.updateSiteSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["settings", "site"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

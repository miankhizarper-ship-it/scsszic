import { apiFetch } from "@/services/apiClient";
import type {
  AdminAlumniListEnvelope,
  AdminAuditListEnvelope,
  AdminBlogListEnvelope,
  AdminDashboardData,
  AdminEventListEnvelope,
  AdminFeedListEnvelope,
  AdminGalleryListEnvelope,
  AdminMemberListEnvelope,
  AdminProjectListEnvelope,
  AdminUser,
  AdminUserListEnvelope,
  AdminUserUpdate,
  AdminVideoListEnvelope,
  Alumnus,
  AlumnusWrite,
  Blog,
  FeedPost,
  GalleryAlbum,
  GalleryAlbumWrite,
  Member,
  Project,
  SocietyEvent,
  WatchVideo,
} from "@/types";

/**
 * Admin service — the client's single boundary to /api/admin/* (Phase 9B/9C/9D).
 *
 * Maps one-to-one onto the Express endpoints (server/src/routes/admin.routes.ts):
 *
 *   getDashboard()      → GET    /api/admin/dashboard
 *   listEvents(params)  → GET    /api/admin/events          (9C)
 *   getEvent(id)        → GET    /api/admin/events/:id
 *   createEvent(body)   → POST   /api/admin/events
 *   updateEvent(id)     → PATCH  /api/admin/events/:id
 *   updateEventStatus() → PATCH  /api/admin/events/:id/status
 *   deleteEvent(id)     → DELETE /api/admin/events/:id
 *   listBlogs(params)   → GET    /api/admin/blogs           (9D)
 *   getBlog(id)         → GET    /api/admin/blogs/:id
 *   createBlog(body)    → POST   /api/admin/blogs
 *   updateBlog(id)      → PATCH  /api/admin/blogs/:id
 *   updateBlogStatus()  → PATCH  /api/admin/blogs/:id/status
 *   deleteBlog(id)      → DELETE /api/admin/blogs/:id
 *   listAlumni(params)  → GET    /api/admin/alumni          (9E)
 *   getAlumnus(id)      → GET    /api/admin/alumni/:id
 *   createAlumnus(body) → POST   /api/admin/alumni
 *   updateAlumnus(id)   → PATCH  /api/admin/alumni/:id
 *   deleteAlumnus(id)   → DELETE /api/admin/alumni/:id
 *   listMembers(params) → GET    /api/admin/members         (9E)
 *   getMember(id)       → GET    /api/admin/members/:id
 *   createMember(body)  → POST   /api/admin/members
 *   updateMember(id)    → PATCH  /api/admin/members/:id
 *   updateMemberStatus() → PATCH /api/admin/members/:id/status
 *   deleteMember(id)    → DELETE /api/admin/members/:id
 *   listProjects(params)→ GET    /api/admin/projects        (9F)
 *   getProject(id)      → GET    /api/admin/projects/:id
 *   createProject(body) → POST   /api/admin/projects
 *   updateProject(id)   → PATCH  /api/admin/projects/:id
 *   updateProjectStatus()→ PATCH /api/admin/projects/:id/status
 *   deleteProject(id)   → DELETE /api/admin/projects/:id
 *   listFeedPosts(params)→ GET   /api/admin/feed            (9F)
 *   getFeedPost(id)     → GET    /api/admin/feed/:id
 *   createFeedPost(body)→ POST   /api/admin/feed
 *   updateFeedPost(id)  → PATCH  /api/admin/feed/:id
 *   updateFeedPostStatus()→ PATCH /api/admin/feed/:id/status
 *   deleteFeedPost(id)  → DELETE /api/admin/feed/:id
 *   listGallery(params) → GET    /api/admin/gallery          (9G)
 *   getAlbum(id)        → GET    /api/admin/gallery/:id
 *   createAlbum(body)   → POST   /api/admin/gallery
 *   updateAlbum(id)     → PATCH  /api/admin/gallery/:id
 *   updateAlbumStatus() → PATCH  /api/admin/gallery/:id/status
 *   deleteAlbum(id)     → DELETE /api/admin/gallery/:id
 *   listVideos(params)  → GET    /api/admin/videos           (9G)
 *   getVideo(id)        → GET    /api/admin/videos/:id
 *   createVideo(body)   → POST   /api/admin/videos
 *   updateVideo(id)     → PATCH  /api/admin/videos/:id
 *   updateVideoStatus() → PATCH  /api/admin/videos/:id/status
 *   deleteVideo(id)     → DELETE /api/admin/videos/:id
 *   listUsers(params)   → GET    /api/admin/users            (9H)
 *   getUser(id)         → GET    /api/admin/users/:id
 *   updateUser(id)      → PATCH  /api/admin/users/:id        (displayName/role)
 *   deleteUser(id)      → DELETE /api/admin/users/:id        (safeguarded)
 *   listAudit(params)   → GET    /api/admin/audit            (9H, read-only)
 *
 * Every call goes through `apiFetch` (`credentials: "include"`), so the
 * HTTP-only session cookie rides along automatically — there are no tokens
 * to attach and no client-side authorization here. The server re-verifies
 * the admin role on every request (requireAdmin). ApiError carries the
 * server-authored safe message plus optional field-level `errors` that
 * forms bind to.
 */
export const adminService = {
  /** GET /api/admin/dashboard — real MongoDB counts + recent content. */
  async getDashboard(): Promise<AdminDashboardData> {
    const response = await apiFetch<{ data: AdminDashboardData }>("/admin/dashboard");
    return response.data;
  },

  /** GET /api/admin/events — search/filter/sort/paginate (real meta + facets). */
  async listEvents(params: {
    page: number;
    pageSize: number;
    search: string;
    category?: string;
    status?: string;
    sort: string;
  }): Promise<AdminEventListEnvelope> {
    return apiFetch<AdminEventListEnvelope>("/admin/events", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        category: params.category,
        status: params.status,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/events/:id — single event; ApiError 404 propagates. */
  async getEvent(id: string): Promise<SocietyEvent> {
    const response = await apiFetch<{ data: SocietyEvent }>(
      `/admin/events/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/events — create; 400/409 field errors surface via ApiError. */
  async createEvent(body: Partial<SocietyEvent>): Promise<SocietyEvent> {
    const response = await apiFetch<{ data: SocietyEvent }>("/admin/events", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/events/:id — partial update. */
  async updateEvent(id: string, body: Partial<SocietyEvent>): Promise<SocietyEvent> {
    const response = await apiFetch<{ data: SocietyEvent }>(
      `/admin/events/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/events/:id/status — safe lifecycle transition. */
  async updateEventStatus(id: string, status: SocietyEvent["status"]): Promise<SocietyEvent> {
    const response = await apiFetch<{ data: SocietyEvent }>(
      `/admin/events/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/events/:id — explicit single-record deletion. */
  async deleteEvent(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/events/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ------------------------------- Blogs (9D) ------------------------------- */

  /** GET /api/admin/blogs — search/filter/sort/paginate (real meta + facets). */
  async listBlogs(params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    category?: string;
    authorId?: string;
    sort: string;
  }): Promise<AdminBlogListEnvelope> {
    return apiFetch<AdminBlogListEnvelope>("/admin/blogs", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        category: params.category,
        authorId: params.authorId,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/blogs/:id — single blog (any status); 404 propagates. */
  async getBlog(id: string): Promise<Blog> {
    const response = await apiFetch<{ data: Blog }>(
      `/admin/blogs/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/blogs — create; 400/409 field errors surface via ApiError. */
  async createBlog(body: Partial<Blog>): Promise<Blog> {
    const response = await apiFetch<{ data: Blog }>("/admin/blogs", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/blogs/:id — partial update. */
  async updateBlog(id: string, body: Partial<Blog>): Promise<Blog> {
    const response = await apiFetch<{ data: Blog }>(
      `/admin/blogs/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/blogs/:id/status — draft/published/archived transition. */
  async updateBlogStatus(id: string, status: Blog["status"]): Promise<Blog> {
    const response = await apiFetch<{ data: Blog }>(
      `/admin/blogs/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/blogs/:id — explicit single-record deletion. */
  async deleteBlog(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/blogs/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ------------------------------ Alumni (9E) ------------------------------ */

  /**
   * GET /api/admin/alumni — search/filter/sort/paginate (real meta + facets).
   * The alumni model has no status lifecycle, so there is deliberately no
   * status filter here and no status transition method.
   */
  async listAlumni(params: {
    page: number;
    pageSize: number;
    search: string;
    field?: string;
    batch?: string;
    sort: string;
  }): Promise<AdminAlumniListEnvelope> {
    return apiFetch<AdminAlumniListEnvelope>("/admin/alumni", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        field: params.field,
        batch: params.batch,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/alumni/:id — single profile; ApiError 404 propagates. */
  async getAlumnus(id: string): Promise<AlumnusWrite> {
    const response = await apiFetch<{ data: AlumnusWrite }>(
      `/admin/alumni/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/alumni — create; 400/409 field errors surface via ApiError. */
  async createAlumnus(body: Partial<AlumnusWrite>): Promise<Alumnus> {
    const response = await apiFetch<{ data: Alumnus }>("/admin/alumni", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/alumni/:id — partial update. */
  async updateAlumnus(id: string, body: Partial<AlumnusWrite>): Promise<Alumnus> {
    const response = await apiFetch<{ data: Alumnus }>(
      `/admin/alumni/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** DELETE /api/admin/alumni/:id — explicit single-record deletion. */
  async deleteAlumnus(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/alumni/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ----------------------------- Members (9E) ------------------------------ */

  /** GET /api/admin/members — search/filter/sort/paginate (real meta + facets). */
  async listMembers(params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    domain?: string;
    batch?: string;
    featured?: "true" | "false";
    sort: string;
  }): Promise<AdminMemberListEnvelope> {
    return apiFetch<AdminMemberListEnvelope>("/admin/members", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        domain: params.domain,
        batch: params.batch,
        featured: params.featured,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/members/:id — single member (any status); 404 propagates. */
  async getMember(id: string): Promise<Member> {
    const response = await apiFetch<{ data: Member }>(
      `/admin/members/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/members — create; 400/409 field errors surface via ApiError. */
  async createMember(body: Partial<Member>): Promise<Member> {
    const response = await apiFetch<{ data: Member }>("/admin/members", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/members/:id — partial update. */
  async updateMember(id: string, body: Partial<Member>): Promise<Member> {
    const response = await apiFetch<{ data: Member }>(
      `/admin/members/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/members/:id/status — active/alumni/archived transition. */
  async updateMemberStatus(id: string, status: Member["status"]): Promise<Member> {
    const response = await apiFetch<{ data: Member }>(
      `/admin/members/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/members/:id — explicit single-record deletion. */
  async deleteMember(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/members/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ----------------------------- Projects (9F) ----------------------------- */

  /** GET /api/admin/projects — search/filter/sort/paginate (real meta + facets). */
  async listProjects(params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    category?: string;
    event?: string;
    technology?: string;
    sort: string;
  }): Promise<AdminProjectListEnvelope> {
    return apiFetch<AdminProjectListEnvelope>("/admin/projects", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        category: params.category,
        event: params.event,
        technology: params.technology,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/projects/:id — single project (any status); 404 propagates. */
  async getProject(id: string): Promise<Project> {
    const response = await apiFetch<{ data: Project }>(
      `/admin/projects/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/projects — create; 400/409 field errors surface via ApiError. */
  async createProject(body: Partial<Project>): Promise<Project> {
    const response = await apiFetch<{ data: Project }>("/admin/projects", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/projects/:id — partial update. */
  async updateProject(id: string, body: Partial<Project>): Promise<Project> {
    const response = await apiFetch<{ data: Project }>(
      `/admin/projects/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/projects/:id/status — active/completed/archived transition. */
  async updateProjectStatus(id: string, status: Project["status"]): Promise<Project> {
    const response = await apiFetch<{ data: Project }>(
      `/admin/projects/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/projects/:id — explicit single-record deletion. */
  async deleteProject(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/projects/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ------------------------------- Feed (9F) ------------------------------- */

  /** GET /api/admin/feed — search/filter/sort/paginate (real meta + facets). */
  async listFeedPosts(params: {
    page: number;
    pageSize: number;
    search: string;
    type?: string;
    status?: string;
    authorUsername?: string;
    projectSlug?: string;
    event?: string;
    sort: string;
  }): Promise<AdminFeedListEnvelope> {
    return apiFetch<AdminFeedListEnvelope>("/admin/feed", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        type: params.type,
        status: params.status,
        authorUsername: params.authorUsername,
        projectSlug: params.projectSlug,
        event: params.event,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/feed/:id — single post (any status); 404 propagates. */
  async getFeedPost(id: string): Promise<FeedPost> {
    const response = await apiFetch<{ data: FeedPost }>(
      `/admin/feed/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/feed — create; 400/409 field errors surface via ApiError. */
  async createFeedPost(body: Partial<FeedPost>): Promise<FeedPost> {
    const response = await apiFetch<{ data: FeedPost }>("/admin/feed", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/feed/:id — partial update. */
  async updateFeedPost(id: string, body: Partial<FeedPost>): Promise<FeedPost> {
    const response = await apiFetch<{ data: FeedPost }>(
      `/admin/feed/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/feed/:id/status — published/archived transition. */
  async updateFeedPostStatus(id: string, status: FeedPost["status"]): Promise<FeedPost> {
    const response = await apiFetch<{ data: FeedPost }>(
      `/admin/feed/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/feed/:id — explicit single-record deletion. */
  async deleteFeedPost(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/feed/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ------------------------------ Gallery (9G) ------------------------------ */

  /** GET /api/admin/gallery — search/filter/sort/paginate (real meta + facets). */
  async listGallery(params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    category?: string;
    year?: string;
    event?: string;
    featured?: "true" | "false";
    sort: string;
  }): Promise<AdminGalleryListEnvelope> {
    return apiFetch<AdminGalleryListEnvelope>("/admin/gallery", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        category: params.category,
        year: params.year,
        event: params.event,
        featured: params.featured,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/gallery/:id — single album (any status); 404 propagates. */
  async getAlbum(id: string): Promise<GalleryAlbum> {
    const response = await apiFetch<{ data: GalleryAlbum }>(
      `/admin/gallery/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/gallery — create; 400/409 field errors surface via ApiError. */
  async createAlbum(body: Partial<GalleryAlbumWrite>): Promise<GalleryAlbum> {
    const response = await apiFetch<{ data: GalleryAlbum }>("/admin/gallery", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/gallery/:id — partial update (photos array = add/reorder/remove). */
  async updateAlbum(id: string, body: Partial<GalleryAlbumWrite>): Promise<GalleryAlbum> {
    const response = await apiFetch<{ data: GalleryAlbum }>(
      `/admin/gallery/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/gallery/:id/status — published/archived transition. */
  async updateAlbumStatus(id: string, status: GalleryAlbum["status"]): Promise<GalleryAlbum> {
    const response = await apiFetch<{ data: GalleryAlbum }>(
      `/admin/gallery/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/gallery/:id — explicit single-record deletion. */
  async deleteAlbum(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/gallery/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* ------------------------------- Videos (9G) ------------------------------ */

  /**
   * GET /api/admin/videos — search/filter/sort/paginate (real meta + facets).
   * The public domain calls these "watch videos"; the admin route stays the
   * intuitive /videos while the payloads are the exact WatchVideo shape.
   */
  async listVideos(params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    category?: string;
    event?: string;
    featured?: "true" | "false";
    duration?: string;
    sort: string;
  }): Promise<AdminVideoListEnvelope> {
    return apiFetch<AdminVideoListEnvelope>("/admin/videos", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        category: params.category,
        event: params.event,
        featured: params.featured,
        duration: params.duration,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/videos/:id — single video (any status); 404 propagates. */
  async getVideo(id: string): Promise<WatchVideo> {
    const response = await apiFetch<{ data: WatchVideo }>(
      `/admin/videos/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /** POST /api/admin/videos — create; 400/409 field errors surface via ApiError. */
  async createVideo(body: Partial<WatchVideo>): Promise<WatchVideo> {
    const response = await apiFetch<{ data: WatchVideo }>("/admin/videos", {
      method: "POST",
      body,
    });
    return response.data;
  },

  /** PATCH /api/admin/videos/:id — partial update. */
  async updateVideo(id: string, body: Partial<WatchVideo>): Promise<WatchVideo> {
    const response = await apiFetch<{ data: WatchVideo }>(
      `/admin/videos/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** PATCH /api/admin/videos/:id/status — published/archived transition. */
  async updateVideoStatus(id: string, status: WatchVideo["status"]): Promise<WatchVideo> {
    const response = await apiFetch<{ data: WatchVideo }>(
      `/admin/videos/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { status } },
    );
    return response.data;
  },

  /** DELETE /api/admin/videos/:id — explicit single-record deletion. */
  async deleteVideo(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/videos/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* -------------------------------- Users (9H) ------------------------------ */

  /**
   * GET /api/admin/users — search/role-filter/sort/paginate accounts (safe
   * fields only). There is deliberately no create method: accounts are the
   * existing signup flow's job, and no client path may set passwords here.
   */
  async listUsers(params: {
    page: number;
    pageSize: number;
    search: string;
    role?: string;
    sort: string;
  }): Promise<AdminUserListEnvelope> {
    return apiFetch<AdminUserListEnvelope>("/admin/users", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        role: params.role,
        sort: params.sort,
      },
    });
  },

  /** GET /api/admin/users/:id — single account (safe fields); 404 propagates. */
  async getUser(id: string): Promise<AdminUser> {
    const response = await apiFetch<{ data: AdminUser }>(
      `/admin/users/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /**
   * PATCH /api/admin/users/:id — displayName/role update. The server rejects
   * final-admin demotions and self-deletions with 409; ApiError surfaces the
   * server-authored safe message.
   */
  async updateUser(id: string, body: AdminUserUpdate): Promise<AdminUser> {
    const response = await apiFetch<{ data: AdminUser }>(
      `/admin/users/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    );
    return response.data;
  },

  /** DELETE /api/admin/users/:id — safeguarded deletion (never the last admin/self). */
  async deleteUser(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiFetch<{ data: { id: string; deleted: boolean } }>(
      `/admin/users/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  /* -------------------------------- Audit (9H) ------------------------------ */

  /**
   * GET /api/admin/audit — newest-first audit trail with actor/action/
   * resource/date filters. Read-only by design: no client method can create
   * or alter audit records.
   */
  async listAudit(params: {
    page: number;
    pageSize: number;
    search: string;
    actor?: string;
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
  }): Promise<AdminAuditListEnvelope> {
    return apiFetch<AdminAuditListEnvelope>("/admin/audit", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        actor: params.actor,
        action: params.action,
        resourceType: params.resourceType,
        from: params.from,
        to: params.to,
      },
    });
  },
};

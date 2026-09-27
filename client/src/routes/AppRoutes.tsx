import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout/RootLayout";
import { GuestRoute, ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminOnlyRoute, AdminPermissionRoute, AdminRoute } from "@/components/admin/AdminRoute";
import { AdminShell } from "@/components/admin/AdminShell";
import { ROUTES } from "@/routes/paths";

import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import AlumniPage from "@/pages/AlumniPage";
import AlumniDetailPage from "@/pages/AlumniDetailPage";
import GalleryPage from "@/pages/GalleryPage";
import GalleryAlbumPage from "@/pages/GalleryAlbumPage";
import BlogsPage from "@/pages/BlogsPage";
import BlogDetailPage from "@/pages/BlogDetailPage";
import FeedPage from "@/pages/FeedPage";
import MembersPage from "@/pages/MembersPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import WatchPage from "@/pages/WatchPage";
import WatchVideoPage from "@/pages/WatchVideoPage";
import ProfilePage from "@/pages/ProfilePage";
import AccountPage from "@/pages/AccountPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminEventsPage from "@/pages/admin/AdminEventsPage";
import AdminEventFormPage from "@/pages/admin/AdminEventFormPage";
import AdminBlogsPage from "@/pages/admin/AdminBlogsPage";
import AdminBlogFormPage from "@/pages/admin/AdminBlogFormPage";
import AdminAlumniPage from "@/pages/admin/AdminAlumniPage";
import AdminAlumniFormPage from "@/pages/admin/AdminAlumniFormPage";
import AdminMembersPage from "@/pages/admin/AdminMembersPage";
import AdminMemberFormPage from "@/pages/admin/AdminMemberFormPage";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import AdminProjectFormPage from "@/pages/admin/AdminProjectFormPage";
import AdminFeedPage from "@/pages/admin/AdminFeedPage";
import AdminFeedFormPage from "@/pages/admin/AdminFeedFormPage";
import AdminGalleryPage from "@/pages/admin/AdminGalleryPage";
import AdminGalleryFormPage from "@/pages/admin/AdminGalleryFormPage";
import AdminVideosPage from "@/pages/admin/AdminVideosPage";
import AdminVideoFormPage from "@/pages/admin/AdminVideoFormPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminAuditPage from "@/pages/admin/AdminAuditPage";
import ContactPage from "@/pages/ContactPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * Application routes.
 *
 * Public surfaces (all content API-backed, Phase 8):
 *   / · /about · /events (+/:slug) · /alumni (+/:slug) · /gallery (+/:albumSlug)
 *   /blogs (+/:slug) · /feed · /members · /profile/:username · /projects (+/:projectSlug)
 *   /watch (+/:videoSlug) · /contact · /terms · /privacy
 *
 * Auth surfaces (Phase 7):
 *   /login · /signup   — GuestRoute keeps signed-in users away
 *   /account           — ProtectedRoute; anonymous visitors bounce to
 *                        /login?redirect=… and return after sign-in
 *   /members/:username — alias of the public member profile
 *
 * Admin (Phase 9A): /admin (+ section pages under AdminShell)
 * Admin Events CMS (Phase 9C): /admin/events (+ /new, /:id/edit)
 * Admin Blogs CMS (Phase 9D): /admin/blogs (+ /new, /:id/edit)
 * Admin Alumni + Members CMS (Phase 9E): /admin/alumni, /admin/members
 *   (+ /new, /:id/edit each)
 * Admin Projects + Feed CMS (Phase 9F): /admin/projects, /admin/feed
 *   (+ /new, /:id/edit each)
 * Admin Gallery + Videos CMS (Phase 9G): /admin/gallery, /admin/videos
 *   (+ /new, /:id/edit each)
 * Admin Users + Audit (Phase 9H): /admin/users (role/displayName management
 *   with server-side final-admin safeguards), /admin/audit (read-only trail
 *   of every successful privileged mutation)
 *
 * Phase 10B: every CMS section (list + form routes) is wrapped in
 * AdminPermissionRoute so a manage user WITHOUT that section's permission
 * gets the access-denied panel on direct URL entry instead of a broken page.
 * Users/Audit stay reachable by admins only — enforced here for routing UX
 * and independently re-verified server-side on every API call.
 */
export const appRouter = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.about, element: <AboutPage /> },
      { path: ROUTES.events, element: <EventsPage /> },
      { path: "/events/:slug", element: <EventDetailPage /> },
      { path: ROUTES.alumni, element: <AlumniPage /> },
      { path: "/alumni/:slug", element: <AlumniDetailPage /> },
      { path: ROUTES.gallery, element: <GalleryPage /> },
      { path: "/gallery/:albumSlug", element: <GalleryAlbumPage /> },
      { path: ROUTES.blogs, element: <BlogsPage /> },
      { path: "/blogs/:slug", element: <BlogDetailPage /> },
      { path: ROUTES.feed, element: <FeedPage /> },
      { path: ROUTES.members, element: <MembersPage /> },
      { path: "/members/:username", element: <ProfilePage /> },
      { path: ROUTES.projects, element: <ProjectsPage /> },
      { path: "/projects/:projectSlug", element: <ProjectDetailPage /> },
      { path: ROUTES.watch, element: <WatchPage /> },
      { path: "/watch/:videoSlug", element: <WatchVideoPage /> },
      { path: "/profile/:username", element: <ProfilePage /> },
      { path: ROUTES.contact, element: <ContactPage /> },
      { path: ROUTES.login, element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: ROUTES.signup, element: <GuestRoute><SignupPage /></GuestRoute> },
      {
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
        path: ROUTES.account,
      },
      { path: ROUTES.terms, element: <TermsPage /> },
      { path: ROUTES.privacy, element: <PrivacyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    /*
     * /admin lives OUTSIDE the public RootLayout (Phase 10C): the admin
     * panel renders its own full-page chrome (collapsible sidebar) and the
     * public top nav + footer never appear on admin pages. AdminShell is a
     * complete layout of its own; AdminRoute re-verifies the session on
     * every navigation, and every /api/admin/* call is authorized
     * server-side regardless of what the UI renders.
     */
    path: ROUTES.admin.home,
    element: (
      <AdminRoute>
        <AdminShell />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      {
        path: "events",
        element: (
          <AdminPermissionRoute permission="events" label="Events">
            <AdminEventsPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "events/new",
        element: (
          <AdminPermissionRoute permission="events" label="Events">
            <AdminEventFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "events/:id/edit",
        element: (
          <AdminPermissionRoute permission="events" label="Events">
            <AdminEventFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "blogs",
        element: (
          <AdminPermissionRoute permission="blogs" label="Blogs">
            <AdminBlogsPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "blogs/new",
        element: (
          <AdminPermissionRoute permission="blogs" label="Blogs">
            <AdminBlogFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "blogs/:id/edit",
        element: (
          <AdminPermissionRoute permission="blogs" label="Blogs">
            <AdminBlogFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "alumni",
        element: (
          <AdminPermissionRoute permission="alumni" label="Alumni">
            <AdminAlumniPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "alumni/new",
        element: (
          <AdminPermissionRoute permission="alumni" label="Alumni">
            <AdminAlumniFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "alumni/:id/edit",
        element: (
          <AdminPermissionRoute permission="alumni" label="Alumni">
            <AdminAlumniFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "gallery",
        element: (
          <AdminPermissionRoute permission="gallery" label="Gallery">
            <AdminGalleryPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "gallery/new",
        element: (
          <AdminPermissionRoute permission="gallery" label="Gallery">
            <AdminGalleryFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "gallery/:id/edit",
        element: (
          <AdminPermissionRoute permission="gallery" label="Gallery">
            <AdminGalleryFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "videos",
        element: (
          <AdminPermissionRoute permission="videos" label="Videos">
            <AdminVideosPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "videos/new",
        element: (
          <AdminPermissionRoute permission="videos" label="Videos">
            <AdminVideoFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "videos/:id/edit",
        element: (
          <AdminPermissionRoute permission="videos" label="Videos">
            <AdminVideoFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "members",
        element: (
          <AdminPermissionRoute permission="members" label="Members">
            <AdminMembersPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "members/new",
        element: (
          <AdminPermissionRoute permission="members" label="Members">
            <AdminMemberFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "members/:id/edit",
        element: (
          <AdminPermissionRoute permission="members" label="Members">
            <AdminMemberFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "projects",
        element: (
          <AdminPermissionRoute permission="projects" label="Projects">
            <AdminProjectsPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "projects/new",
        element: (
          <AdminPermissionRoute permission="projects" label="Projects">
            <AdminProjectFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "projects/:id/edit",
        element: (
          <AdminPermissionRoute permission="projects" label="Projects">
            <AdminProjectFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "feed",
        element: (
          <AdminPermissionRoute permission="feed" label="Feed">
            <AdminFeedPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "feed/new",
        element: (
          <AdminPermissionRoute permission="feed" label="Feed">
            <AdminFeedFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "feed/:id/edit",
        element: (
          <AdminPermissionRoute permission="feed" label="Feed">
            <AdminFeedFormPage />
          </AdminPermissionRoute>
        ),
      },
      {
        path: "users",
        element: (
          <AdminOnlyRoute>
            <AdminUsersPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: "audit",
        element: (
          <AdminOnlyRoute>
            <AdminAuditPage />
          </AdminOnlyRoute>
        ),
      },
    ],
  },
]);

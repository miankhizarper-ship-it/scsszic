import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3, LayoutDashboard, RefreshCw, ShieldCheck } from "lucide-react";

import { ADMIN_NAV_ITEMS, adminNavItemsFor } from "@/components/admin/adminNav";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthProvider";
import { useAdminDashboard } from "@/hooks/admin";
import { formatCardDate } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import type {
  AdminContentSection,
  AdminRecentItem,
  AdminSectionCount,
} from "@/types";

/**
 * Admin dashboard (Phase 9B) — the /admin landing page over REAL data.
 *
 * Data comes exclusively from GET /api/admin/dashboard (requireAdmin-gated,
 * MongoDB-backed): overview cards show per-section totals with their real
 * status breakdowns, and Recent activity lists the newest content records.
 * Nothing is fabricated while loading — skeletons render instead of zeros.
 *
 * The management sections themselves are still Phase 9A placeholders: every
 * card, row, and quick action links to its existing /admin/<section> route.
 * The "Signed-in admin" panel is kept from Phase 9A as the identity context.
 */

/** Section quick links — every entry except the Dashboard itself (same set the
 *  old phase flag produced; Users/Audit are admin-only surfaces, kept here).
 *  Task 14: multi-permission sections (Home Page) are included too. */
const SECTION_ITEMS = ADMIN_NAV_ITEMS.filter(
  (item) =>
    item.permission !== undefined || item.permissions !== undefined || item.adminOnly === true,
);

const SECTION_ROUTE: Record<AdminContentSection, string> = {
  events: ROUTES.admin.events,
  blogs: ROUTES.admin.blogs,
  alumni: ROUTES.admin.alumni,
  gallery: ROUTES.admin.gallery,
  videos: ROUTES.admin.videos,
  members: ROUTES.admin.members,
  projects: ROUTES.admin.projects,
  feed: ROUTES.admin.feed,
};

const RECENT_TYPE_LABEL: Record<AdminRecentItem["type"], string> = {
  event: "Event",
  blog: "Blog",
  alumnus: "Alumnus",
  album: "Album",
  video: "Video",
  member: "Member",
  project: "Project",
  post: "Post",
};

/** Recent rows link to the section placeholder that will manage that type. */
const RECENT_TYPE_SECTION: Record<AdminRecentItem["type"], string> = {
  event: ROUTES.admin.events,
  blog: ROUTES.admin.blogs,
  alumnus: ROUTES.admin.alumni,
  album: ROUTES.admin.gallery,
  video: ROUTES.admin.videos,
  member: ROUTES.admin.members,
  project: ROUTES.admin.projects,
  post: ROUTES.admin.feed,
};

/** Deterministic status chip order — most actionable states first. */
const STATUS_ORDER = [
  "published",
  "active",
  "upcoming",
  "ongoing",
  "completed",
  "draft",
  "alumni",
  "archived",
  "cancelled",
];

/** Drafts want attention (gold), archived/cancelled recede (neutral). */
function statusChipStyle(status: string): { variant: BadgeVariant; className?: string } {
  if (status === "draft") return { variant: "goldSoft" };
  if (status === "archived" || status === "cancelled") {
    return { variant: "navySoft", className: "border-line bg-surface text-muted" };
  }
  return { variant: "navySoft" };
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Real status breakdown — hidden entirely when the model has none (alumni). */
function StatusChips({ statuses }: { statuses: AdminSectionCount["statuses"] }) {
  const entries = Object.entries(statuses)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => {
      const ia = STATUS_ORDER.indexOf(a);
      const ib = STATUS_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

  if (entries.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {entries.map(([status, n]) => {
        const style = statusChipStyle(status);
        return (
          <li key={status}>
            <Badge variant={style.variant} className={style.className}>
              {n} {formatStatus(status)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** One overview card — real total + status chips, linking to the section. */
function OverviewCard({
  section,
  count,
}: {
  section: AdminContentSection;
  count: AdminSectionCount;
}) {
  const nav = SECTION_ITEMS.find((item) => item.to === SECTION_ROUTE[section]);
  const Icon = nav?.icon;

  return (
    <Link
      to={SECTION_ROUTE[section]}
      className="group flex h-full flex-col rounded-xl border border-line bg-white p-5 transition-colors hover:border-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-lg bg-navy-50 text-navy-700 transition-colors group-hover:bg-gold-50 group-hover:text-gold-700">
          {Icon ? <Icon size={20} aria-hidden="true" /> : null}
        </span>
        <ArrowUpRight
          size={16}
          aria-hidden="true"
          className="text-muted transition-colors group-hover:text-gold-600"
        />
      </span>
      <span className="mt-3 font-display text-3xl font-bold leading-none text-navy-900">
        {count.total}
      </span>
      <span className="mt-1 font-display text-sm font-bold text-navy-900">
        {nav?.label ?? section}
      </span>
      <StatusChips statuses={count.statuses} />
    </Link>
  );
}

/** One recent-activity row — type, title, date, status, link to its section. */
function RecentRow({ item }: { item: AdminRecentItem }) {
  const statusStyle = item.status ? statusChipStyle(item.status) : null;

  return (
    <li>
      <Link
        to={RECENT_TYPE_SECTION[item.type]}
        className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Badge variant="navySoft">{RECENT_TYPE_LABEL[item.type]}</Badge>
          <span className="truncate text-sm font-semibold text-navy-900">
            {item.title}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3 text-xs text-muted sm:pl-0">
          <span>{item.date ? formatCardDate(item.date) : "—"}</span>
          {item.status && statusStyle ? (
            <Badge variant={statusStyle.variant} className={statusStyle.className}>
              {formatStatus(item.status)}
            </Badge>
          ) : (
            <span aria-hidden="true">—</span>
          )}
          <ArrowUpRight size={14} aria-hidden="true" className="text-muted" />
        </span>
      </Link>
    </li>
  );
}

/**
 * Loading placeholder — pulsing blocks in the same layout as the real
 * dashboard. Deliberately shows NO numbers: no fabricated zero values.
 */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading dashboard…</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-line bg-white"
          />
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-line bg-white"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Phase 10B — dashboard variant for the "manage" role. The aggregate stats
 * endpoint (GET /api/admin/dashboard) is admin-only, so manage users get a
 * purposeful landing panel instead: who they are, which CMS sections THEY
 * can manage, and an honest empty state when they have no grants. No admin
 * aggregate data is fetched or shown.
 */
function ManageDashboardPage() {
  const { user } = useAuth();
  const sections = adminNavItemsFor(user).filter(
    (item) => item.permission !== undefined || item.permissions !== undefined,
  );
  const memberSince = user ? formatCardDate(user.createdAt) : "—";

  return (
    <div className="mx-auto w-full max-w-6xl" data-state="ready">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
          Content management
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Welcome back, {user?.displayName ?? "content manager"}. You manage only
          the sections assigned to your account — an administrator can adjust
          them on the Users page.
        </p>
      </header>

      {/* Signed-in identity (manage variant of the Phase 9A panel) */}
      <section
        aria-labelledby="admin-identity-heading"
        className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 id="admin-identity-heading" className="font-display text-sm font-bold text-navy-900">
          Signed-in content manager
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Name</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-navy-900">
              {user?.displayName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Username</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-navy-900">
              @{user?.username ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Role</dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy-900">Content manager</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Member since</dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy-900">{memberSince}</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} aria-hidden="true" className="shrink-0 text-gold-600" />
          Every request is re-verified server-side against your account's own
          permissions over the existing HTTP-only session cookie.
        </p>
      </section>

      {/* The sections THIS account may manage — no fabricated global stats */}
      <section id="admin-overview" aria-labelledby="admin-manage-sections-heading" className="mt-8">
        <h2 id="admin-manage-sections-heading" className="font-display text-lg font-bold text-navy-900">
          Your sections
        </h2>
        <p className="mt-1 text-sm text-muted">
          Content areas assigned to your account by an administrator.
        </p>
        {sections.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={LayoutDashboard}
              title="No sections assigned yet"
              description="Your account can sign in, but no CMS sections have been granted to it. An administrator can assign sections from the Users page — you will see them here after signing out and back in, or on your next visit."
            />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sections.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex h-full items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-4 text-sm font-semibold text-navy-900 transition-colors hover:border-gold-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  <item.icon size={18} aria-hidden="true" className="shrink-0 text-navy-700" />
                  <span className="truncate">{item.label}</span>
                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="ml-auto shrink-0 text-muted"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isManage = user?.role === "manage";
  const { data, isError, isFetching, refetch } = useAdminDashboard({ enabled: !isManage });

  if (isManage) {
    return <ManageDashboardPage />;
  }

  const memberSince = user ? formatCardDate(user.createdAt) : "—";

  return (
    <div
      className="mx-auto w-full max-w-6xl"
      data-state={isError ? "error" : data ? "ready" : "loading"}
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
          Administration
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Welcome back, {user?.displayName ?? "admin"}. Here is the current
          state of the society's content and community — live counts from the
          database, with no placeholder numbers.
        </p>
      </header>

      {/* Signed-in admin identity (kept from Phase 9A) */}
      <section
        aria-labelledby="admin-identity-heading"
        className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 id="admin-identity-heading" className="font-display text-sm font-bold text-navy-900">
          Signed-in admin
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Name</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-navy-900">
              {user?.displayName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Username</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-navy-900">
              @{user?.username ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Role</dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy-900">Administrator</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">Member since</dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy-900">{memberSince}</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} aria-hidden="true" className="shrink-0 text-gold-600" />
          Every admin API request is re-verified server-side (requireAdmin) over the
          existing HTTP-only session cookie — no tokens, no local storage.
        </p>
      </section>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load dashboard data"
            description="We couldn't load the dashboard from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : !data ? (
        <div className="mt-8">
          <DashboardSkeleton />
        </div>
      ) : (
        <>
          {/* Overview cards — real totals per content section */}
          <section id="admin-overview" aria-labelledby="admin-overview-heading" className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="admin-overview-heading" className="font-display text-lg font-bold text-navy-900">
                  Overview
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Content totals with their real status breakdowns.
                </p>
              </div>
              {isFetching && (
                <span
                  className="flex items-center gap-1.5 text-xs font-medium text-muted"
                  data-refreshing="true"
                >
                  <RefreshCw size={12} aria-hidden="true" className="animate-spin" />
                  Refreshing…
                </span>
              )}
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(Object.keys(data.counts) as AdminContentSection[]).map((section) => (
                <li key={section}>
                  <OverviewCard section={section} count={data.counts[section]} />
                </li>
              ))}
            </ul>
          </section>

          {/* Recent activity — newest real records across all content */}
          <section id="admin-recent" aria-labelledby="admin-recent-heading" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="admin-recent-heading" className="font-display text-lg font-bold text-navy-900">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-muted">
                  The newest records across all content areas.
                </p>
              </div>
              <span className="text-xs text-muted">As of {formatCardDate(data.generatedAt)}</span>
            </div>

            {data.recent.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="No recent activity"
                description="Content records will appear here as soon as the society's events, articles, albums, videos, members, projects, or posts exist."
                className="mt-4"
              />
            ) : (
              <ol className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {data.recent.map((item) => (
                  <RecentRow key={`${item.type}-${item.id}`} item={item} />
                ))}
              </ol>
            )}
          </section>

          {/* Quick actions — navigation only; CRUD tooling arrives later */}
          <section
            id="admin-quick-actions"
            aria-labelledby="admin-quick-actions-heading"
            className="mt-10"
          >
            <h2 id="admin-quick-actions-heading" className="font-display text-lg font-bold text-navy-900">
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-muted">
              Jump straight into a management area.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {SECTION_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex h-full items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-navy-900 transition-colors hover:border-gold-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <item.icon size={18} aria-hidden="true" className="shrink-0 text-navy-700" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

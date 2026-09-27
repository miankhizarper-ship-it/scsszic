import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { adminNavItemsFor } from "@/components/admin/adminNav";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthProvider";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes/paths";

/**
 * AdminShell — full-page layout for the /admin area (Phase 10C chrome).
 *
 * The admin panel is completely self-contained: the public site top nav and
 * footer never render here (the /admin route tree sits outside the public
 * RootLayout), so the sidebar IS the navigation.
 *
 * Desktop (≥lg): fixed navy sidebar with a collapse toggle — expanded shows
 * the familiar labelled navigation; collapsed shrinks to an icon-only rail
 * with tooltips, persisting the choice in localStorage. The identity panel
 * and actions adapt to both widths.
 * Mobile (<lg): compact sticky header (hamburger + compact brand + identity)
 * opening a slide-in drawer with the same navigation and actions.
 *
 * Phase 10B: navigation derives from the signed-in account — admins see every
 * section; manage users see the Dashboard plus ONLY their granted CMS
 * sections (Users/Audit are never shown to them). This filtering is routing
 * UX; the server independently authorizes every /api/admin/* request.
 */

const SIDEBAR_COLLAPSED_KEY = "scs.admin.sidebarCollapsed";

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    // Storage unavailable (privacy mode) — default to expanded.
    return false;
  }
}

function writeCollapsedPreference(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Non-fatal — the preference simply does not persist.
  }
}

export function AdminShell() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsedPreference());
  useLockBodyScroll(drawerOpen);

  // ESC closes the mobile drawer (keyboard accessibility).
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const initials =
    (user?.displayName ?? "A")
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  const roleLabel = user?.role === "manage" ? "Manager" : "Admin";
  const identityName = user?.displayName ?? roleLabel;
  const identityUsername = user?.username ?? roleLabel.toLowerCase();

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      writeCollapsedPreference(next);
      return next;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      // Hard navigation home: a client-side navigate() here loses a race —
      // clearing the session renders urgently and AdminRoute's guard commits
      // its /login redirect before the router transition to "/" lands. A full
      // load is deterministic and resets every piece of client session state.
      window.location.assign(ROUTES.home);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ---------- Desktop sidebar (collapsible) ---------- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-navy-950 transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-72",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-white/10 py-4",
            collapsed ? "flex-col gap-2 px-2" : "gap-2.5 px-5",
          )}
        >
          <Logo variant="light" showWordmark={!collapsed} />
          {collapsed ? (
            <span className="sr-only">{roleLabel}</span>
          ) : (
            <Badge variant="onDark">{roleLabel}</Badge>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "grid size-9 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              collapsed ? "mt-2" : "ml-auto",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <AdminNav collapsed={collapsed} />

        <div className={cn("border-t border-white/10", collapsed ? "px-2 py-4" : "p-4")}>
          {collapsed ? (
            <>
              <span
                aria-hidden="true"
                className="mx-auto grid size-9 place-items-center rounded-full bg-navy-800 font-display text-xs font-bold text-gold-300"
                title={`${identityName} · @${identityUsername}`}
              >
                {initials}
              </span>
              <span className="sr-only">{`${identityName} — ${roleLabel}`}</span>
            </>
          ) : (
            <AdminIdentity
              initials={initials}
              name={identityName}
              username={identityUsername}
              roleLabel={roleLabel}
            />
          )}
          <AdminActions onLogout={handleLogout} loggingOut={loggingOut} collapsed={collapsed} />
        </div>
      </aside>

      {/* ---------- Mobile header ---------- */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-navy-950 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={drawerOpen}
            className="grid size-10 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Logo variant="light" showWordmark={false} />
          <span className="font-display text-sm font-bold text-white">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-300 sm:inline">{user?.displayName}</span>
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-navy-800 font-display text-[10px] font-bold text-gold-300"
          >
            {initials}
          </span>
        </div>
      </header>

      {/* ---------- Mobile drawer ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-navy-950/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <Logo variant="light" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close admin menu"
                className="grid size-10 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <AdminNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-white/10 p-4">
              <AdminIdentity
                initials={initials}
                name={identityName}
                username={identityUsername}
                roleLabel={roleLabel}
              />
              <AdminActions onLogout={handleLogout} loggingOut={loggingOut} collapsed={false} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Content (no footer — the admin panel is chrome-free) ---------- */}
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-[76px]" : "lg:pl-72")}>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar/drawer navigation — filtered by the signed-in account's grants.
 * Collapsed mode renders icon-only links with a title tooltip; expanded
 * mode is the labelled list. No phase badges — the sidebar is purely
 * functional navigation (Phase 10C cleanup).
 */
function AdminNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = adminNavItemsFor(user);
  return (
    <nav
      aria-label="Admin sections"
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === ROUTES.admin.home}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              collapsed ? "h-11 justify-center px-0" : "px-3 py-2.5",
              isActive
                ? "bg-white/10 text-gold-300"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )
          }
        >
          <item.icon size={18} aria-hidden="true" className="shrink-0" />
          {!collapsed && <span className="flex-1">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminIdentity({
  initials,
  name,
  username,
  roleLabel,
}: {
  initials: string;
  name: string;
  username: string;
  roleLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-800 font-display text-xs font-bold text-gold-300"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-slate-400">@{username}</p>
      </div>
      <Badge variant="onDark">{roleLabel}</Badge>
    </div>
  );
}

function AdminActions({
  onLogout,
  loggingOut,
  collapsed,
}: {
  onLogout: () => void;
  loggingOut: boolean;
  collapsed: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2", collapsed ? "mt-3 items-center" : "mt-3")}>
      <ReturnToSiteButton collapsed={collapsed} />
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        title={collapsed ? "Log out" : undefined}
        aria-label={collapsed ? "Log out" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
          "border border-white/25 text-white hover:border-gold-400 hover:text-gold-300",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
          "disabled:pointer-events-none disabled:opacity-50",
          collapsed ? "size-10" : "h-9 w-full",
        )}
      >
        <LogOut size={16} aria-hidden="true" />
        {!collapsed && (loggingOut ? "Signing out…" : "Log out")}
      </button>
    </div>
  );
}

function ReturnToSiteButton({ collapsed }: { collapsed: boolean }) {
  return (
    <NavLink
      to={ROUTES.home}
      title={collapsed ? "Return to website" : undefined}
      aria-label={collapsed ? "Return to website" : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
        "border border-white/25 text-white hover:border-gold-400 hover:text-gold-300",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
        collapsed ? "size-10" : "h-9 w-full",
      )}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {!collapsed && "Return to website"}
    </NavLink>
  );
}

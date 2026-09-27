import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, LogOut, Menu, X } from "lucide-react";

import { ADMIN_NAV_ITEMS } from "@/components/admin/adminNav";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthProvider";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes/paths";

/**
 * AdminShell — layout for the /admin area (Phase 9A).
 *
 * Desktop (≥lg): fixed navy sidebar — SCS branding, section navigation with
 * a clear active state, admin identity, return-to-website, logout.
 * Mobile (<lg): compact sticky header (hamburger + compact brand + identity)
 * opening a slide-in drawer with the same navigation and actions.
 *
 * Operational styling: compact paddings, no decorative motion — the admin
 * area stays visually consistent with the public site (navy/gold) while
 * reading as a workspace. Navigation items for Phase 9B sections are links
 * that render an honest placeholder page; no fake statistics anywhere.
 */
export function AdminShell() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-navy-950 lg:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <Logo variant="light" />
          <Badge variant="onDark">Admin</Badge>
        </div>
        <AdminNav onNavigate={undefined} />
        <div className="border-t border-white/10 p-4">
          <AdminIdentity
            initials={initials}
            name={user?.displayName ?? "Admin"}
            username={user?.username ?? "admin"}
          />
          <AdminActions onLogout={handleLogout} loggingOut={loggingOut} />
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
            <AdminNav onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-white/10 p-4">
              <AdminIdentity
                initials={initials}
                name={user?.displayName ?? "Admin"}
                username={user?.username ?? "admin"}
              />
              <AdminActions onLogout={handleLogout} loggingOut={loggingOut} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Content ---------- */}
      <div className="flex min-h-screen flex-col lg:pl-72">
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
        <footer className="border-t border-line px-4 py-4 sm:px-6 lg:px-10">
          <p className="text-xs text-muted">
            Society of Computer Science · SZIC, University of Peshawar — admin area
          </p>
        </footer>
      </div>
    </div>
  );
}

/** Sidebar/drawer navigation — desktop passes no onNavigate; drawer closes on click. */
function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {ADMIN_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === ROUTES.admin.home}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
              isActive
                ? "bg-white/10 text-gold-300"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )
          }
        >
          <item.icon size={18} aria-hidden="true" className="shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.phase === "9B" && (
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              9B
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminIdentity({
  initials,
  name,
  username,
}: {
  initials: string;
  name: string;
  username: string;
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
      <Badge variant="onDark">Admin</Badge>
    </div>
  );
}

function AdminActions({
  onLogout,
  loggingOut,
}: {
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <ReturnToSiteButton />
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
          "border border-white/25 text-white hover:border-gold-400 hover:text-gold-300",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <LogOut size={16} aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Log out"}
      </button>
    </div>
  );
}

function ReturnToSiteButton() {
  return (
    <NavLink
      to={ROUTES.home}
      className={cn(
        "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
        "border border-white/25 text-white hover:border-gold-400 hover:text-gold-300",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
      )}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Return to website
    </NavLink>
  );
}

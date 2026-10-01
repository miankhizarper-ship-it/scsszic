import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Menu, PenLine } from "lucide-react";

import { MobileMenu } from "@/components/layout/MobileMenu";
import { NavDropdown } from "@/components/layout/NavDropdown";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { NAV_LINKS } from "@/data/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useScrolled } from "@/hooks/useScrolled";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

/**
 * Navbar — premium responsive site header.
 *
 * Structure:
 *  - thin gold hairline (brand accent)
 *  - institutional top strip (hidden on mobile) — scrolls away with the page
 *  - FIXED main bar: always deep navy, subtle elevation on scroll. The main
 *    bar is sticky at the viewport top INDEPENDENT of the strip above it
 *    (the strip renders outside the sticky header), so scrolling down keeps
 *    the navigation reachable without jumping back to the top (Phase 10C).
 *  - desktop inline nav (≥ xl), slide-in MobileMenu below xl
 *  - auth-aware actions (Phase 7): Login/Join Us for guests; avatar (the
 *    Google picture when present, initials otherwise) chip, display name
 *    (→ /account), and logout for signed-in members
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled(8);
  const { user, status, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.home, { replace: true });
    } catch {
      // Session cleanup failures are non-fatal — the server TTL expires it.
    }
  };

  return (
    <>
      {/* Royal gold accent hairline + institutional strip — these scroll
          away; only the main bar below stays pinned. */}
      <div aria-hidden="true" className="gold-hairline h-0.5" />
      <div className="hidden border-b border-white/5 bg-navy-950 sm:block">
        <Container className="flex h-8 items-center justify-between text-[11px] font-medium tracking-wide text-slate-400">
          <p>Shaikh Zayed Islamic Centre · University of Peshawar</p>
          <p aria-hidden="true">Peshawar, Pakistan</p>
        </Container>
      </div>

      {/* Fixed main bar — sticky to the viewport, not bounded by the strip. */}
      <header className="sticky top-0 z-50">
        <nav
          aria-label="Primary"
          className={cn(
            "border-b border-white/10 bg-navy-950/95 backdrop-blur transition-shadow duration-300",
            scrolled && "shadow-lg shadow-navy-950/40",
          )}
        >
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />

          {/* Desktop links — xl (1280px) is the first width where brand,
              the full link row, and the action cluster fit without horizontal
              overflow (at lg/1024 the row measurably overflows by ~49px). */}
          <ul className="hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <NavDropdown
                  key={link.label}
                  link={{ ...link, children: link.children }}
                />
              ) : (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === ROUTES.home}
                    className={({ isActive }) =>
                      cn(
                        "relative flex h-16 items-center rounded-none px-3 text-[13.5px] font-medium transition-colors",
                        isActive
                          ? "text-white"
                          : "text-slate-300 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {link.label}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold-500"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ),
            )}
          </ul>

          <div className="flex items-center gap-2">
            {status === "loading" ? (
              /* Session probe in flight — render a calm placeholder, no flash. */
              <span
                aria-hidden="true"
                className="hidden h-9 w-24 rounded-lg bg-white/5 sm:block"
              />
            ) : isAuthenticated && user ? (
              <>
                {/* Task 29 — society members share posts straight from the nav. */}
                {user.role === "member" && (
                  <Button
                    to={ROUTES.member.feedNew}
                    variant="gold"
                    size="sm"
                    className="hidden lg:inline-flex"
                  >
                    <PenLine size={15} aria-hidden="true" />
                    Share a post
                  </Button>
                )}
                <NavLink
                  to={ROUTES.account}
                  aria-label={`My account — ${user.displayName}`}
                  className="hidden items-center gap-2.5 rounded-full border border-gold-500/40 bg-gold-500/10 py-1 pl-1.5 pr-3.5 text-sm font-semibold text-gold-300 transition-colors hover:border-gold-400 hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 sm:inline-flex"
                >
                  {user.picture ? (
                    <Avatar src={user.picture} initials={initials ?? ""} size={28} alt="" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-7 place-items-center rounded-full bg-navy-900 font-display text-[11px] font-bold text-gold-300"
                    >
                      {initials}
                    </span>
                  )}
                  <span className="max-w-[10rem] truncate">{user.displayName}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  aria-label={`Log out ${user.displayName}`}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  <LogOut size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Button
                  to={ROUTES.login}
                  variant="ghost"
                  size="sm"
                  className="hidden text-slate-200 hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  <LogIn size={15} aria-hidden="true" />
                  Login
                </Button>
                <Button
                  to={ROUTES.signup}
                  variant="gold"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Join Us
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Open navigation menu"
              className="inline-flex size-10 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </Container>
        </nav>

        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </header>
    </>
  );
}

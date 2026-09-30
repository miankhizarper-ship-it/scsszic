import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, X } from "lucide-react";

import { NAV_LINKS, SOCIAL_LINKS } from "@/data/navigation";
import { useAuth } from "@/context/AuthProvider";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * MobileMenu — accessible slide-in navigation panel (below lg breakpoint).
 *
 * Accessibility:
 *  - dialog semantics (role="dialog", aria-modal)
 *  - closes on Esc, backdrop click, route change
 *  - moves focus into the panel on open, returns focus via the toggle button
 *  - locks body scroll while open
 *  - nav groups (e.g. Community) render as expandable sub-menus
 */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { pathname } = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      navigate(ROUTES.home, { replace: true });
    } catch {
      // Session cleanup failures are non-fatal — the server TTL expires it.
    }
  };

  useLockBodyScroll(open);

  // Close whenever the route changes.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Focus the close button when the panel opens; handle Esc.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" id="mobile-menu">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-navy-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Slide-in panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-xs flex-col border-l border-white/10 bg-navy-950 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="inline-flex size-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) =>
                  link.children ? (
                    /* ---------- Expandable navigation group ---------- */
                    <li key={link.label}>
                      {(() => {
                        const groupOpen = expandedGroup === link.label;
                        const groupActive = link.children.some(
                          (child) => pathname === child.to,
                        );

                        return (
                          <>
                            <button
                              type="button"
                              aria-expanded={groupOpen}
                              aria-controls={`mobile-group-${link.label.toLowerCase()}`}
                              onClick={() =>
                                setExpandedGroup(groupOpen ? null : link.label)
                              }
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                                groupActive && !groupOpen
                                  ? "bg-white/10 text-gold-300"
                                  : "text-slate-200 hover:bg-white/5 hover:text-white",
                              )}
                            >
                              {link.label}
                              <ChevronDown
                                size={16}
                                aria-hidden="true"
                                className={cn(
                                  "text-slate-400 transition-transform duration-200",
                                  groupOpen && "rotate-180",
                                )}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {groupOpen && (
                                <motion.ul
                                  id={`mobile-group-${link.label.toLowerCase()}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                                  className="overflow-hidden"
                                >
                                  {link.children.map((child) => (
                                    <li key={child.to}>
                                      <NavLink
                                        to={child.to}
                                        className={({ isActive }) =>
                                          cn(
                                            "ml-4 flex items-center gap-2.5 border-l py-2.5 pl-4 text-sm font-medium transition-colors",
                                            isActive
                                              ? "border-gold-500 text-gold-300"
                                              : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white",
                                          )
                                        }
                                      >
                                        {child.label}
                                      </NavLink>
                                    </li>
                                  ))}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </>
                        );
                      })()}
                    </li>
                  ) : (
                    /* ---------- Simple link ---------- */
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.to === ROUTES.home}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                            isActive
                              ? "bg-white/10 text-gold-300"
                              : "text-slate-200 hover:bg-white/5 hover:text-white",
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="border-t border-white/10 p-4">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2.5">
                  <Button
                    to={ROUTES.account}
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={onClose}
                  >
                    My Account
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 font-display text-sm font-semibold text-white transition-colors hover:border-gold-400 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <LogOut size={15} aria-hidden="true" />
                    Log out
                  </button>
                </div>
              ) : (
                <Button
                  to={ROUTES.signup}
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={onClose}
                >
                  Join Us
                </Button>
              )}

              <div className="mt-5 flex items-center justify-center gap-2">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-gold-300"
                  >
                    <Icon size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-500">
                SZIC · University of Peshawar
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

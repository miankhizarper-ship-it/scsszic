import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { EASE_OUT_EXPO, fadeUpSm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types";

interface NavDropdownProps {
  link: NavLink & { children: NavLink[] };
}

/**
 * NavDropdown — desktop navigation item with an accessible sub-menu.
 *
 * Accessibility & UX contract:
 *  - trigger is a real <button> with aria-expanded / aria-haspopup
 *  - opens on click (Enter/Space work natively) and on desktop hover intent
 *  - closes on Esc (returning focus), outside click, route change
 *  - sub-links are ordinary links, so keyboard users can Tab through them
 */
export function NavDropdown({ link }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const wrapperRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** True while the panel was opened by hovering, so the follow-up click is swallowed. */
  const openedByHoverRef = useRef(false);
  const { pathname } = useLocation();

  const anyChildActive = link.children.some((child) => pathname.startsWith(child.to));

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc + outside click.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const clearCloseTimer = () => window.clearTimeout(closeTimer.current);

  const handleMouseEnter = () => {
    clearCloseTimer();
    openedByHoverRef.current = true;
    setOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      openedByHoverRef.current = false;
      setOpen(false);
    }, 150);
  };

  const handleClick = () => {
    // If the panel was already opened by hovering, the first click should
    // keep it open instead of toggling it shut.
    if (openedByHoverRef.current) {
      openedByHoverRef.current = false;
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <li
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleClick}
        className={cn(
          "relative flex h-16 items-center gap-1 px-3 text-[13.5px] font-medium transition-colors",
          anyChildActive || open ? "text-white" : "text-slate-300 hover:text-white",
        )}
      >
        {link.label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
        {(anyChildActive || open) && (
          <span
            aria-hidden="true"
            className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold-500"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={fadeUpSm}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE_OUT_EXPO } }}
            className="absolute left-0 top-[calc(100%+6px)] w-48 overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-2xl shadow-navy-950/60"
          >
            <span aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />
            <ul className="py-2">
              {link.children.map((child) => (
                <li key={child.to}>
                  <Link
                    to={child.to}
                    className={cn(
                      "block px-4 py-2.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-500",
                      pathname === child.to
                        ? "bg-white/5 text-gold-300"
                        : "text-slate-300 hover:bg-white/5 hover:text-gold-300",
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

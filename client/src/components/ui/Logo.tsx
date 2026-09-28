import { Link } from "react-router-dom";

import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

/**
 * Brand mark — the SCS logo.
 *
 * A self-contained SVG (Task 15): deep-navy rounded tile, gold inner
 * hairline, and the "SCS" monogram in the display face. Rendering the mark
 * as SVG (instead of text-in-a-div) means the EXACT same geometry serves
 * every surface — navbar, footer, mobile menu, admin sidebar/drawer, the
 * auth cards — at any size, always crisp, and favicon.svg mirrors the same
 * design so the browser tab matches the site.
 *
 * Sizing: pass a Tailwind size class via `markClassName` (default size-9).
 * The `cn` merge lets callers override the default cleanly.
 */

interface LogoProps {
  /** "light" → for navy backgrounds (navbar/footer). "dark" → for light backgrounds. */
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
  /** Size of the mark itself, e.g. "size-7" / "size-12" — default size-9. */
  markClassName?: string;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9 shrink-0", className)}
    >
      {/* Navy tile */}
      <rect width="64" height="64" rx="14" className="fill-navy-900" />
      {/* Gold inner hairline (brightens on group hover, like the old border) */}
      <rect
        x="3.25"
        y="3.25"
        width="57.5"
        height="57.5"
        rx="11.75"
        fill="none"
        strokeWidth="1.5"
        className="stroke-gold-500/55 transition-colors duration-300 group-hover:stroke-gold-400"
      />
      {/* Monogram — dominantBaseline keeps it optically centered everywhere */}
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="19"
        fontWeight="700"
        letterSpacing="1"
        className="fill-gold-300"
        style={{ fontFamily: "'Plus Jakarta Sans Variable', 'Inter Variable', system-ui, sans-serif" }}
      >
        SCS
      </text>
    </svg>
  );
}

export function Logo({
  variant = "light",
  showWordmark = true,
  className,
  markClassName,
}: LogoProps) {
  return (
    <Link
      to={ROUTES.home}
      aria-label="Society of Computer Science — home"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <LogoMark className={markClassName} />

      {showWordmark && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "font-display text-sm font-bold tracking-tight",
              variant === "light" ? "text-white" : "text-navy-900",
            )}
          >
            Society of Computer Science
          </span>
          <span
            className={cn(
              "text-[10px] font-medium tracking-wide",
              variant === "light" ? "text-slate-400" : "text-muted",
            )}
          >
            SZIC · University of Peshawar
          </span>
        </span>
      )}
    </Link>
  );
}

import { Link } from "react-router-dom";

import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

/**
 * ⚠️ PLACEHOLDER BRAND ASSET
 *
 * The official SCS logo file is not yet available. This component renders a
 * deliberately simple text monogram ("SCS") as a clearly-marked placeholder —
 * it is NOT the society's brand mark.
 *
 * To swap in the real logo:
 *   1. Drop the official asset into `client/src/assets/logo/` (SVG preferred).
 *   2. Import it here and replace the <div> monogram below.
 *   3. Update `client/public/favicon.svg` to match.
 */

interface LogoProps {
  /** "light" → for navy backgrounds (navbar/footer). "dark" → for light backgrounds. */
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({
  variant = "light",
  showWordmark = true,
  className,
}: LogoProps) {
  return (
    <Link
      to={ROUTES.home}
      aria-label="Society of Computer Science — home"
      className={cn("group flex items-center gap-2.5", className)}
    >
      {/* Monogram placeholder */}
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-gold-500/50 bg-navy-900 shadow-sm transition-colors group-hover:border-gold-400"
      >
        <span className="font-display text-[11px] font-bold tracking-[0.08em] text-gold-300">
          SCS
        </span>
      </span>

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

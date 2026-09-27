import { cn } from "@/lib/utils";

type AvatarShape = "circle" | "rounded";

interface AvatarProps {
  /** Portrait URL — when absent, the initials fallback renders. */
  src?: string;
  alt?: string;
  /** 1–2 letter fallback shown when no portrait exists. */
  initials: string;
  /** Rendered size in px (square). */
  size?: number;
  shape?: AvatarShape;
  className?: string;
}

/**
 * Avatar — portrait with an elegant initials fallback.
 *
 * Portraits are optional across every profile-shaped entity (members,
 * authors, feed authors), so this component centralizes the "image or
 * monogram" treatment: navy tile, gold initials, gold hairline ring.
 */
export function Avatar({
  src,
  alt,
  initials,
  size = 40,
  shape = "circle",
  className,
}: AvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? `Portrait placeholder for ${initials}`}
        {...dimension}
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0 border border-line bg-navy-50 object-cover",
          shape === "circle" ? "rounded-full" : "rounded-2xl",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden={alt === "" ? true : undefined}
      role={alt === "" ? "presentation" : "img"}
      aria-label={alt === "" ? undefined : (alt ?? `Monogram for ${initials}`)}
      style={dimension}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-navy-950 font-display font-bold text-gold-300",
        shape === "circle" ? "rounded-full" : "rounded-2xl",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-grid-dark opacity-40"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 border border-gold-500/30"
      />
      <span
        className="relative"
        style={{ fontSize: Math.max(11, Math.round(size * 0.34)) }}
      >
        {initials}
      </span>
    </span>
  );
}

import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

/**
 * Button — the single button primitive for the whole site.
 *
 * Renders:
 *  - <button> when no `to`/`href` is given
 *  - React Router <Link> when `to` is given (internal navigation)
 *  - <a> when `href` is given (external links)
 *
 * Variants are mapped to the brand system: gold accent for primary actions
 * on navy surfaces, navy for primary actions on light surfaces.
 */

export type ButtonVariant =
  | "gold" // solid gold — primary CTA on navy surfaces
  | "navy" // solid navy — primary CTA on light surfaces
  | "white" // solid white — secondary CTA on navy surfaces
  | "outlineLight" // outline for navy surfaces
  | "outline" // outline for light surfaces
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  gold: "bg-gold-500 text-navy-950 hover:bg-gold-300 active:bg-gold-400 shadow-sm",
  navy: "bg-navy-900 text-white hover:bg-navy-700 active:bg-navy-950 shadow-sm",
  white: "bg-white text-navy-950 hover:bg-navy-50 shadow-sm",
  outlineLight:
    "border border-white/25 text-white hover:border-gold-400 hover:text-gold-300",
  outline:
    "border border-navy-200 text-navy-900 hover:border-navy-400 hover:bg-navy-50",
  ghost: "text-navy-900 hover:bg-navy-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

type ButtonElementProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children" | "type"
> & { type?: "button" | "submit" | "reset" };

type AnchorProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "className" | "children" | "href"
>;

export type ButtonProps = CommonProps &
  ButtonElementProps &
  AnchorProps & {
    /** Internal route — renders a React Router <Link>. */
    to?: string;
    /** External URL — renders an <a>. */
    href?: string;
  };

export function Button({
  variant = "navy",
  size = "md",
  className,
  children,
  to,
  href,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-lg font-display font-semibold",
    "transition-colors duration-200 ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if (to !== undefined) {
    return (
      <Link to={to} className={classes} {...(rest as AnchorProps)}>
        {children}
      </Link>
    );
  }

  if (href !== undefined) {
    // External URLs open in a new tab by default (Task 26) — a caller-passed
    // target still wins. Internal hash/mailto links behave as before.
    const isExternal = /^https?:\/\//i.test(href);
    const externalProps =
      isExternal && (rest as AnchorProps).target === undefined
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {};
    return (
      <a className={classes} href={href} {...externalProps} {...(rest as AnchorProps)}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={((rest as ButtonElementProps).type as "button") ?? "button"}
      className={classes}
      {...(rest as ButtonElementProps)}
    >
      {children}
    </button>
  );
}

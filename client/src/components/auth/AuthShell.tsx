import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { LogoMark } from "@/components/ui/Logo";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Wider card for the signup form. */
  wide?: boolean;
}

/** Shared input classes so both auth forms render one visual language.
 *  `text-base` below sm prevents iOS Safari's focus auto-zoom on small
 *  screens (16px is the threshold); sm+ restores the compact size. */
export const AUTH_INPUT_CLASSES = [
  "h-11 w-full rounded-lg border bg-white px-3.5 text-base text-ink shadow-sm transition-colors sm:text-sm",
  "placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500",
  "border-line focus:border-navy-300",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error",
].join(" ");

/**
 * Shared label + inline-error pair for accessible form fields.
 *
 * Error/hint <p> elements get deterministic ids (`${id}-error`, `${id}-hint`)
 * so each page wires `aria-describedby` + `aria-invalid` on its inputs and
 * screen readers announce validation state (never colour alone).
 */
export function AuthField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">
        {label}
      </label>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-error"
        >
          <span aria-hidden="true" className="font-bold">
            ⚠
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * AuthShell — the shared centered-card layout behind /login and /signup.
 * Uses the same surface language as the rest of the site (navy/gold brand
 * mark, gold eyebrow, white card on bg-surface) so auth feels native to
 * SCS. The card is headed by the SCS logo itself (Task 15) — every brand
 * surface now carries the same mark.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="flex flex-1 items-center bg-surface">
      {/* Fluid vertical rhythm on small screens; the card never touches the
          viewport edges thanks to the Container gutters (px-4 min). */}
      <Container className="py-8 sm:py-12 lg:py-20">
        <div
          className={cn(
            "mx-auto w-full rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-9 lg:p-10",
            wide ? "max-w-xl" : "max-w-md",
          )}
        >
          <div className="text-center">
            <LogoMark className="mx-auto size-14 drop-shadow-sm" />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              {eyebrow}
            </p>
            <h1 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
          </div>

          <div className="mt-7 sm:mt-8">{children}</div>

          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>

        <div className="mx-auto mt-6 max-w-md text-center">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ArrowRight size={12} aria-hidden="true" className="rotate-180" />
            Back to the site
          </Link>
        </div>
      </Container>
    </div>
  );
}

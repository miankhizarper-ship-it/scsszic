import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Wider card for the signup form. */
  wide?: boolean;
}

/** Shared input classes so both auth forms render one visual language. */
export const AUTH_INPUT_CLASSES = [
  "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink shadow-sm transition-colors",
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
 * Uses the same surface language as the rest of the site (navy icon chip,
 * gold eyebrow, white card on bg-surface) so auth feels native to SCS.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  footer,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="flex flex-1 items-center bg-surface">
      <Container className="py-14 lg:py-20">
        <div
          className={cn(
            "mx-auto w-full rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10",
            wide ? "max-w-xl" : "max-w-md",
          )}
        >
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-xl border border-gold-500/40 bg-navy-900 text-gold-300 shadow-sm">
              <Icon size={24} aria-hidden="true" />
            </span>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              {eyebrow}
            </p>
            <h1 className="mt-2.5 font-display text-3xl font-bold tracking-tight text-navy-900">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
          </div>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>

        <p className="mx-auto mt-6 flex max-w-md items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted">
          <ShieldCheck size={13} aria-hidden="true" className="shrink-0 text-navy-400" />
          Sessions are protected with HTTP-only cookies — nothing sensitive is
          ever stored in your browser.
        </p>

        <div className="mx-auto mt-4 max-w-md text-center">
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

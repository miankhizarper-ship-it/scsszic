import { ROUTES } from "@/routes/paths";

/**
 * Safe internal-redirect guard (spec §22).
 *
 * Login accepts a `?redirect=` param so guarded routes can return visitors
 * to where they were heading. Only paths inside this app are allowed:
 *  - must start with a single "/"
 *  - no protocol-relative "//" (would leave to another origin)
 *  - no embedded scheme ("://") or backslash trickery
 *  - no control characters
 * Everything else (including absolute external URLs) falls back to /account.
 */

const MAX_REDIRECT_LENGTH = 512;

export function isSafeInternalPath(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.length > MAX_REDIRECT_LENGTH) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("://") || value.includes("\\\\")) return false;
  // Control characters (%0A/%0D included) are never legitimate here.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}

/** Validate a redirect candidate; returns a usable internal path or /account. */
export function sanitizeRedirect(
  value: string | null | undefined,
  fallback: string = ROUTES.account,
): string {
  return isSafeInternalPath(value) ? (value as string) : fallback;
}

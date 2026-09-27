import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@/context/AuthProvider";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import { ROUTES } from "@/routes/paths";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — gate for authenticated-only surfaces (/account).
 *
 *  loading           → a calm, labelled loading state (no redirect flash:
 *                      the /me session probe decides, not stale client state)
 *  authenticated     → render children
 *  unauthenticated   → redirect to /login?redirect=<current path>, and login
 *                      returns the visitor via sanitizeRedirect (internal
 *                      paths only — no arbitrary external redirects)
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 py-24 text-muted"
        >
          <LoaderCircle
            size={28}
            aria-hidden="true"
            className="animate-spin text-gold-600"
          />
          <p className="text-sm font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const target = `${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

/**
 * GuestRoute — inverse gate: keeps signed-in users away from /login and
 * /signup (they already have an account). Loading resolves to the page so
 * the session probe finishes first.
 */
export function GuestRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-24 text-muted">
          <LoaderCircle size={28} aria-hidden="true" className="animate-spin text-gold-600" />
          <p className="text-sm font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    const params = new URLSearchParams(location.search);
    const redirectTo = sanitizeRedirect(params.get("redirect"));
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

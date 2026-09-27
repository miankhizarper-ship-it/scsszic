import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { ROUTES } from "@/routes/paths";

/**
 * AdminRoute — gate for the /admin area (Phase 9A).
 *
 * Reuses the EXISTING session architecture (useAuth → AuthProvider →
 * GET /api/auth/me). No duplicated auth logic, no client-held tokens:
 *   loading               → calm, labelled loading state (no redirect flash)
 *   unauthenticated       → the existing login flow (/login?redirect=…)
 *   authenticated member  → explicit access-denied panel
 *   admin                 → render children
 *
 * The denial screen is honest routing UX, not security — every /api/admin/*
 * request is independently re-verified server-side by requireAdmin.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 py-24 text-muted"
        >
          <LoaderCircle size={28} aria-hidden="true" className="animate-spin text-gold-600" />
          <p className="text-sm font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const target = `${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={target} replace />;
  }

  if (user?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-50 text-gold-700">
            <ShieldAlert size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Access denied</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The admin area is restricted to society administrators. You are
            signed in as a member — if you believe this is a mistake, contact
            the SCS admin team.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={ROUTES.home} variant="navy">Return to website</Button>
            <Button to={ROUTES.account} variant="outline">My account</Button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

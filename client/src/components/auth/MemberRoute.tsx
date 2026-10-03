import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { ROUTES } from "@/routes/paths";

/**
 * MemberRoute (Task 29, Task 37) — gate for the member self-service pages
 * (/member/*). These surfaces are deliberately OUTSIDE the admin panel:
 * society members gain feed posting + public-profile self-editing without
 * ever touching /admin.
 *
 *  loading             → calm, labelled loading state (session probe first)
 *  unauthenticated     → the existing login flow (/login?redirect=…)
 *  role "member"       → render children
 *  role "user"         → an upgrade panel: plain users are told what member
 *                        accounts can do and how to become one
 *  manage | admin      → staff: feed posting is a COMMUNITY surface (Task
 *                        37), so the FEED FORM renders for staff too — the
 *                        server fills the author identity. The PROFILE
 *                        editor keeps the staff-pointer (staff accounts
 *                        don't own a public member record unless linked).
 *
 * The denial screens are honest routing UX, not security — every /api/me/*
 * and /api/media/* request is independently re-verified server-side.
 */
export function MemberRoute({
  children,
  staffAllowed = false,
}: {
  children: React.ReactNode;
  /** Task 37 — the feed form welcomes manage/admin; profile edit does not. */
  staffAllowed?: boolean;
}) {
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

  if (user?.role === "user") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-50 text-gold-700">
            <ShieldAlert size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Members only</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your account is a <span className="font-semibold text-navy-900">user</span> account —
            you can browse the site, like posts, and join the conversation. Society{" "}
            <span className="font-semibold text-navy-900">members</span> can also share feed posts
            and edit their public community profile. Ask the SCS admin team to add your account to
            the members directory.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={ROUTES.home} variant="navy">Return to website</Button>
            <Button to={ROUTES.account} variant="outline">My account</Button>
          </div>
        </div>
      </main>
    );
  }

  if (user?.role !== "member" && !(staffAllowed && (user?.role === "manage" || user?.role === "admin"))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-50 text-gold-700">
            <ShieldAlert size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Staff account</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            These self-service pages belong to society members. Your staff account manages the
            same content (and more) from the admin panel.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={ROUTES.admin.home} variant="navy">Open admin panel</Button>
            <Button to={ROUTES.home} variant="outline">Return to website</Button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

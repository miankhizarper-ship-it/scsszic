import { useLocation } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

import { ADMIN_NAV_ITEMS } from "@/components/admin/adminNav";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/routes/paths";

/**
 * AdminSectionPlaceholder — honest stand-in for the Phase 9B CMS sections.
 * Derives the current section from the shared nav config (so titles always
 * match the sidebar) and states plainly that the tooling is not built yet.
 * No fake data, no dead ends: the only actions lead back into the admin area.
 */
export default function AdminSectionPlaceholder() {
  const { pathname } = useLocation();
  const item = ADMIN_NAV_ITEMS.find((entry) => entry.to === pathname);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
        Administration
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
        {item?.label ?? "Section"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {item?.description ?? "Admin section."}
      </p>

      <div className="mt-8 rounded-xl border border-line bg-white p-6 text-center sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-50 text-gold-700">
          <Construction size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold text-navy-900">
          Arrives in Phase 9B
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          The management tools for this area are part of the next build-out.
          This shell ships first so navigation, authorization, and the design
          foundation are verified before any content editing lands.
        </p>
        <div className="mt-6 flex justify-center">
          <Button to={ROUTES.admin.home} variant="navy">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

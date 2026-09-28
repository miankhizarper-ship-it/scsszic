import { Info } from "lucide-react";

import { TeamCardsManager } from "@/components/admin/TeamCardsManager";
import { ROUTES } from "@/routes/paths";

/**
 * Admin About Page manager (Task 14) — the leadership strip shown on the
 * public About page ("Meet the team") is managed HERE. The strip reads the
 * SAME `team` collection (group "leaders") as the home page Leadership
 * section — one dataset, two surfaces — so this page is a focused window on
 * that shared data with copy that says exactly that. Nothing is duplicated:
 * editing a card here updates the home page Leadership section too.
 */
export default function AdminAboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ---------- Header ---------- */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
          Administration
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          About Page
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Manage the leadership cards shown in the About page's "Meet the team"
          strip. Published cards appear on the site immediately; archived cards
          are kept but hidden.
        </p>
      </header>

      {/* ---------- Shared-data notice ---------- */}
      <div
        role="note"
        className="mt-5 flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-gold-700"
        >
          <Info size={16} />
        </span>
        <p className="text-sm leading-relaxed text-navy-900">
          <span className="font-semibold">These cards also appear on the home page.</span>{" "}
          The About team strip and the home Leadership section read the same
          data — edit a card here and both pages update together.
        </p>
      </div>

      {/* ---------- Leadership cards manager ---------- */}
      <div className="mt-6">
        <TeamCardsManager
          group="leaders"
          createHref={`${ROUTES.admin.aboutPage}/leaders/new`}
          editHref={(id) => `${ROUTES.admin.aboutPage}/leaders/${id}/edit`}
          createLabel="New leader card"
          emptyTitle="No leadership cards yet"
          emptyDescription="Create the first leader card and it appears in the About page team strip (and the home page Leadership section) immediately."
        />
      </div>
    </div>
  );
}

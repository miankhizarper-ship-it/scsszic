import { useEffect, useMemo } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { Code2, Sparkles, Users, UsersRound } from "lucide-react";

import { MembersSpotlightManager } from "@/components/admin/MembersSpotlightManager";
import { TeamCardsManager } from "@/components/admin/TeamCardsManager";
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Home Page manager (Task 14) — ONE place to edit the people cards
 * that appear on the public home page, organized as three tabs:
 *
 *   Leadership → the `team` collection, group "leaders" (the president /
 *                board cards at the top of the page);
 *   Members    → the member-directory spotlight (star = pin to home);
 *   Developers → the `team` collection, group "developers" (the dark
 *                Developers band near the bottom).
 *
 * The About page's leadership strip reads the SAME "leaders" cards — that is
 * surfaced on the About Page manager, not duplicated here. Tabs the signed-in
 * account has no permission for are hidden (admins see all three); the route
 * gate admits any-of ["team", "members"].
 */

type HomeTab = "leaders" | "members" | "developers";

const TABS: Array<{ id: HomeTab; label: string; icon: typeof UsersRound }> = [
  { id: "leaders", label: "Leadership", icon: UsersRound },
  { id: "members", label: "Members spotlight", icon: Users },
  { id: "developers", label: "Developers", icon: Code2 },
];

export default function AdminHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const granted = new Set(user?.permissions ?? []);

  const canManageTeam = isAdmin || granted.has("team");
  const canManageMembers = isAdmin || granted.has("members");

  const allowedTabs = useMemo(
    () =>
      TABS.filter((tab) => (tab.id === "members" ? canManageMembers : canManageTeam)),
    [canManageMembers, canManageTeam],
  );

  const requested = searchParams.get("tab") as HomeTab | null;
  const activeTab: HomeTab =
    requested && allowedTabs.some((tab) => tab.id === requested) ? requested : allowedTabs[0]?.id ?? "leaders";

  // If a deep-linked tab is not permitted, normalize the URL to the first
  // allowed one so the address bar always matches what is on screen.
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some((tab) => tab.id === requested)) {
      setSearchParams({ tab: allowedTabs[0].id }, { replace: true });
    }
  }, [allowedTabs, requested, setSearchParams]);

  if (allowedTabs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Home Page
          </h1>
        </header>
        <p className="mt-6 rounded-xl border border-line bg-white p-5 text-sm text-muted">
          Your account has no permission for the sections that make up the home
          page people cards. An administrator can grant the Team or Members
          permission from the Users page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ---------- Header ---------- */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
          Administration
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Home Page
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Edit the people cards shown on the home page — the Leadership row, the
          Members spotlight, and the Developers band. Changes go live as soon as
          they are saved.
        </p>
      </header>

      {/* ---------- Tabs ---------- */}
      <nav aria-label="Home page sections" className="mt-6">
        <div
          role="tablist"
          aria-label="Home page card groups"
          className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-white p-1.5"
        >
          {allowedTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-4",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
                  active
                    ? "bg-navy-950 text-gold-300 shadow-sm"
                    : "text-navy-700 hover:bg-navy-50",
                )}
              >
                <tab.icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---------- Active tab panel ---------- */}
      <div className="mt-6">
        {activeTab === "leaders" && (
          <section aria-labelledby="home-leadership-heading">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-700"
              >
                <Sparkles size={17} />
              </span>
              <div>
                <h2 id="home-leadership-heading" className="font-display text-lg font-bold text-navy-900">
                  Leadership cards
                </h2>
                <p className="mt-0.5 max-w-2xl text-sm text-muted">
                  The president and board cards in the home page Leadership
                  section. The About page's team strip reads these same cards.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <TeamCardsManager
                group="leaders"
                createHref={`${ROUTES.admin.homePage}/leaders/new`}
                editHref={(id) => `${ROUTES.admin.homePage}/leaders/${id}/edit`}
                createLabel="New leader card"
                emptyTitle="No leadership cards yet"
                emptyDescription="Create the first leader card and it appears in the home page Leadership section (and the About page team strip) immediately."
              />
            </div>
          </section>
        )}

        {activeTab === "members" && (
          <section aria-labelledby="home-members-heading">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-700"
              >
                <Users size={17} />
              </span>
              <div>
                <h2 id="home-members-heading" className="font-display text-lg font-bold text-navy-900">
                  Members spotlight
                </h2>
                <p className="mt-0.5 max-w-2xl text-sm text-muted">
                  Four member cards pulled from the directory — star the members
                  you want on the home page.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <MembersSpotlightManager />
            </div>
          </section>
        )}

        {activeTab === "developers" && (
          <section aria-labelledby="home-developers-heading">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-700"
              >
                <Code2 size={17} />
              </span>
              <div>
                <h2 id="home-developers-heading" className="font-display text-lg font-bold text-navy-900">
                  Developer cards
                </h2>
                <p className="mt-0.5 max-w-2xl text-sm text-muted">
                  The contributor cards in the dark Developers band on the home
                  page — the people who build and maintain the society's
                  projects and this website.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <TeamCardsManager
                group="developers"
                createHref={`${ROUTES.admin.homePage}/developers/new`}
                editHref={(id) => `${ROUTES.admin.homePage}/developers/${id}/edit`}
                createLabel="New developer card"
                emptyTitle="No developer cards yet"
                emptyDescription="Create the first developer card and it appears in the home page Developers band immediately."
              />
            </div>
          </section>
        )}
      </div>

      {/* Cross-link so editors can discover the shared leadership data. */}
      {canManageTeam && (
        <p className="mt-8 text-xs text-muted">
          Managing the About page team strip too? It reads the same leadership
          cards —{" "}
          <NavLink to={ROUTES.admin.aboutPage} className="font-semibold text-navy-700 underline decoration-gold-400 underline-offset-2 hover:text-navy-900">
            open the About Page manager
          </NavLink>
          .
        </p>
      )}
    </div>
  );
}

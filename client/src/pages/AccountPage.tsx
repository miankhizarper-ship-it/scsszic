import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CircleUserRound,
  Database,
  ExternalLink,
  Fingerprint,
  Info,
  LogOut,
  Mail,
  Rss,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useAuth } from "@/context/AuthProvider";
import { useMember } from "@/hooks/content";
import { formatDateLong } from "@/lib/format";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * AccountPage — the authenticated account surface at /account (spec §21).
 *
 * This is NOT a public profile: /profile/:username remains the community
 * surface (Phase 6). The account page shows the signed-in identity from the
 * server (/api/auth/me), the link to the user's public member profile when
 * one exists, and the server-backed logout. Accounts are now PERSISTED in
 * MongoDB (Phase 8); profile editing remains future work.
 */
export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  usePageMetadata({
    title: buildPageTitle("My Account"),
    description:
      "Your Society of Computer Science account — identity, linked public profile, and session.",
  });

  // AuthUser → Member compatibility (spec §25): the account links to the
  // public community profile when the directory knows the username. The
  // lookup now runs against the API (MongoDB members collection).
  // Hooks stay unconditional; the type guard below may early-return.
  const memberQuery = useMember(user?.username);
  const memberProfile = memberQuery.data;

  // ProtectedRoute guarantees an authenticated user; this is a type guard.
  if (!user) return null;

  const initials = user.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.home, { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* ---------- Account identity band ---------- */}
      <header className="relative overflow-hidden border-b border-white/10 bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div
          aria-hidden="true"
          className="absolute -top-32 right-[-8%] h-[360px] w-[360px] rounded-full bg-navy-600/40 blur-3xl"
        />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

        <Container className="relative py-12 sm:py-14">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
            <Avatar initials={initials} size={104} shape="rounded" alt="" />

            <div className="min-w-0">
              <Badge variant="onDark">
                <ShieldCheck size={12} aria-hidden="true" className="mr-1" />
                {user.role === "admin"
                  ? "Administrator"
                  : user.role === "manage"
                    ? "Content manager"
                    : "Member account"}
              </Badge>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {user.displayName}
              </h1>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-300 sm:justify-start">
                <span className="font-mono text-gold-300">@{user.username}</span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={13} aria-hidden="true" />
                  {user.email}
                </span>
              </p>
            </div>
          </div>
        </Container>
      </header>

      {/* ---------- Body ---------- */}
      <Container className="py-10 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
          <div className="min-w-0 flex flex-col gap-6">
            {/* Account details */}
            <Reveal className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
                <CircleUserRound size={18} aria-hidden="true" className="text-gold-600" />
                Account details
              </h2>
              <dl className="mt-4 divide-y divide-line">
                {[
                  {
                    icon: UserRound,
                    term: "Username",
                    detail: `@${user.username}`,
                  },
                  { icon: Mail, term: "Email", detail: user.email },
                  {
                    icon: ShieldCheck,
                    term: "Role",
                    detail:
                      user.role === "admin"
                        ? "Admin (architecture demo)"
                        : user.role === "manage"
                          ? "Content manager"
                          : "Member",
                  },
                  {
                    icon: CalendarDays,
                    term: "Member since",
                    detail: formatDateLong(user.createdAt),
                  },
                  ...(user.memberProfileId
                    ? [
                        {
                          icon: Fingerprint,
                          term: "Linked profile record",
                          detail: user.memberProfileId,
                        },
                      ]
                    : []),
                ].map(({ icon: Icon, term, detail }) => (
                  <div key={term} className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      <Icon size={13} aria-hidden="true" className="text-navy-400" />
                      {term}
                    </dt>
                    <dd className="min-w-0 truncate text-right text-sm font-medium text-navy-900">
                      {detail}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    <ShieldCheck size={13} aria-hidden="true" className="text-navy-400" />
                    Session
                  </dt>
                  <dd className="min-w-0 truncate text-right text-sm font-medium text-navy-900">
                    HTTP-only cookie, server-managed
                  </dd>
                </div>
              </dl>
            </Reveal>

            {/* Public profile connection */}
            <Reveal delay={0.05} className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
                <Users size={18} aria-hidden="true" className="text-gold-600" />
                Public community profile
              </h2>

              {memberProfile ? (
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar
                    src={memberProfile.avatar}
                    alt={memberProfile.avatarAlt}
                    initials={memberProfile.initials}
                    size={64}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-navy-900">
                      {memberProfile.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {memberProfile.role ?? memberProfile.domain} · {memberProfile.batch}
                    </p>
                  </div>
                  <Button to={ROUTES.profile(memberProfile.username)} variant="navy" size="sm">
                    View Public Profile
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-line bg-surface px-4 py-4">
                  <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-navy-400" />
                  <p className="text-sm leading-relaxed text-muted">
                    No public community profile is linked to this account yet. Member
                    records live in the society database — when your account is
                    connected to a member record, your public profile will appear at{" "}
                    <span className="font-mono text-navy-900">
                      /profile/{user.username}
                    </span>
                    .
                  </p>
                </div>
              )}
            </Reveal>
          </div>

          {/* ---------- Sidebar: actions ---------- */}
          <aside className="min-w-0 flex flex-col gap-6">
            <Reveal className="rounded-xl border border-line bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                <Bookmark size={16} aria-hidden="true" className="text-gold-600" />
                Quick actions
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {memberProfile && (
                  <li>
                    <Link
                      to={ROUTES.profile(memberProfile.username)}
                      className="inline-flex items-center gap-1.5 font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    >
                      <Users size={14} aria-hidden="true" className="text-gold-600" />
                      View public profile
                      <ExternalLink size={12} aria-hidden="true" className="text-muted" />
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to={ROUTES.feed}
                    className="inline-flex items-center gap-1.5 font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <Rss size={14} aria-hidden="true" className="text-gold-600" />
                    Community feed
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.members}
                    className="inline-flex items-center gap-1.5 font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <Users size={14} aria-hidden="true" className="text-gold-600" />
                    Member directory
                  </Link>
                </li>
              </ul>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-navy-200 font-display text-sm font-semibold text-navy-900 transition-colors hover:border-error hover:bg-error/5 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-60"
              >
                {loggingOut ? (
                  "Signing out…"
                ) : (
                  <>
                    <LogOut size={15} aria-hidden="true" />
                    Log out
                  </>
                )}
              </button>
            </Reveal>

            <Reveal
              delay={0.05}
              className="relative overflow-hidden rounded-xl border border-gold-500/40 bg-navy-950 p-6"
            >
              <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
              <div className="relative">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                  <Database size={13} aria-hidden="true" />
                  Persistent account
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Accounts are stored in the society's database and survive server
                  restarts. Editable profiles and community posting arrive in a
                  later phase — this page is read-only by design for now.
                </p>
              </div>
            </Reveal>
          </aside>
        </div>
      </Container>
    </>
  );
}

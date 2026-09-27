import { useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, RefreshCw, ShieldCheck, UserCog, Users, X } from "lucide-react";

import { AdminEventDeleteDialog } from "@/components/admin/AdminEventDeleteDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAdminUsers, useDeleteUser, useUpdateUser } from "@/hooks/admin";
import { useAuth } from "@/context/AuthProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { formatCardDate } from "@/lib/format";
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
} from "@/types";
import type { AdminPermission, AdminUser, AdminUserSort } from "@/types";

/**
 * Admin Users CMS (Phase 9H, Phase 10B role/permission management) — the
 * /admin/users management page over the EXISTING auth accounts through
 * GET /api/admin/users (admin-only API).
 *
 * Scope follows the actual model:
 *  - editable fields are displayName + role + (Phase 10B) per-user CMS
 *    permissions; username/email/password are NOT editable here (login
 *    identity + signup flow own those);
 *  - there is deliberately NO create button — accounts self-register via
 *    the public signup flow;
 *  - deletion/role changes are safeguarded server-side (never the last
 *    admin, never the signed-in account) and the UI communicates the same
 *    rules while the server stays the authority.
 *
 * Phase 10B: the "manage" role unlocks a permission editor — checkboxes for
 * the eight CMS sections, saved with the same PATCH. Permissions only take
 * effect for the manage role; the server clears them when the role moves to
 * member/admin, so stale grants can never linger.
 */

const PAGE_SIZE = 10;

const ROLE_OPTIONS = ["member", "manage", "admin"] as const;

const SORT_OPTIONS: Array<{ value: AdminUserSort; label: string }> = [
  { value: "created_desc", label: "Newest accounts first" },
  { value: "created_asc", label: "Oldest accounts first" },
  { value: "username_asc", label: "Username — A to Z" },
  { value: "username_desc", label: "Username — Z to A" },
  { value: "name_asc", label: "Display name — A to Z" },
  { value: "name_desc", label: "Display name — Z to A" },
];

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function roleChipStyle(role: string): { variant: BadgeVariant; className?: string } {
  if (role === "admin") return { variant: "goldSoft" };
  if (role === "manage") return { variant: "navySoft" };
  return { variant: "navySoft", className: "border-line bg-surface text-muted" };
}

/** Compact permission chips under the role badge for manage accounts. */
function PermissionChips({ permissions }: { permissions: AdminPermission[] }) {
  if (permissions.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {permissions.map((permission) => (
        <span
          key={permission}
          className="rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-navy-700"
        >
          {ADMIN_PERMISSION_LABELS[permission]}
        </span>
      ))}
    </span>
  );
}

/**
 * Permission editor (Phase 10B) — checkbox grid over the eight CMS sections.
 * Purely local state; the server validates, dedupes, canonicalizes, and
 * clears the list whenever the effective role is not "manage".
 */
function PermissionEditor({
  selected,
  onToggle,
}: {
  selected: AdminPermission[];
  onToggle: (permission: AdminPermission) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-line bg-surface p-3">
      <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        <KeyRound size={13} aria-hidden="true" />
        CMS sections
      </legend>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
        {ADMIN_PERMISSIONS.map((permission) => {
          const checked = selected.includes(permission);
          const checkboxId = `admin-user-perm-${permission}`;
          return (
            <label
              key={permission}
              htmlFor={checkboxId}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                "hover:bg-navy-50",
              )}
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(permission)}
                className="size-4 shrink-0 rounded border-line text-gold-600 accent-gold-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500"
              />
              <span className="truncate text-ink">{ADMIN_PERMISSION_LABELS[permission]}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Sections this account may open and edit. Everything else — including
        Users, Audit, and uploads — stays administrator-only.
      </p>
    </fieldset>
  );
}

/** Accessible edit dialog — displayName + role + permissions, inline errors. */
function UserEditDialog({
  user,
  isSelf,
  onClose,
}: {
  user: AdminUser;
  isSelf: boolean;
  onClose: () => void;
}) {
  const updateUser = useUpdateUser();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<AdminUser["role"]>(user.role);
  const [permissions, setPermissions] = useState<AdminPermission[]>(user.permissions ?? []);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC cancels; focus lands on the first field; focus returns on close.
  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape" && !updateUser.isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, updateUser.isPending]);

  const samePermissions =
    permissions.length === (user.permissions ?? []).length &&
    permissions.every((entry) => (user.permissions ?? []).includes(entry));
  const dirty =
    displayName !== user.displayName || role !== user.role || !samePermissions;
  const serverError = updateUser.isError ? updateUser.error?.message ?? null : null;

  function togglePermission(permission: AdminPermission) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  }

  function submit() {
    // Permissions are always sent in canonical client order; the server
    // re-validates and clears them automatically for non-manage roles.
    updateUser.mutate(
      {
        id: user.id,
        body: {
          displayName: displayName.trim(),
          role,
          permissions: role === "manage" ? permissions : [],
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="presentation"
      data-testid="admin-user-edit-dialog"
    >
      <button
        type="button"
        aria-label="Close editor"
        onClick={() => !updateUser.isPending && onClose()}
        className="absolute inset-0 bg-navy-950/60"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-edit-title"
        aria-describedby="admin-user-edit-description"
        className="relative w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-50 text-gold-700">
            <UserCog size={20} aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <h2 id="admin-user-edit-title" className="mt-4 font-display text-lg font-bold text-navy-900">
          Edit account
        </h2>
        <p id="admin-user-edit-description" className="mt-1.5 text-sm leading-relaxed text-muted">
          <span className="font-semibold text-navy-900">@{user.username}</span> — the display
          name and role are managed here. Username, email, and password stay with the account
          owner.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="admin-user-edit-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
            >
              Display name
            </label>
            <input
              id="admin-user-edit-name"
              type="text"
              value={displayName}
              maxLength={120}
              onChange={(changeEvent) => setDisplayName(changeEvent.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
            />
          </div>
          <div>
            <label
              htmlFor="admin-user-edit-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
            >
              Role
            </label>
            <select
              id="admin-user-edit-role"
              value={role}
              onChange={(changeEvent) => setRole(changeEvent.target.value as AdminUser["role"])}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatRole(option)}
                </option>
              ))}
            </select>
            {isSelf && user.role === "admin" && role !== "admin" && (
              <p className="mt-1.5 text-xs leading-relaxed text-error" role="note">
                You are stepping down from administration. This is rejected while you are the
                only administrator — promote another account first.
              </p>
            )}
          </div>
          {role === "manage" && (
            <PermissionEditor selected={permissions} onToggle={togglePermission} />
          )}
          {role !== "manage" && (user.permissions ?? []).length > 0 && (
            <p className="text-xs leading-relaxed text-muted" role="note">
              Saving this role clears the account's CMS section grants — they only
              apply to content managers.
            </p>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error"
          >
            {serverError}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateUser.isPending}>
            Cancel
          </Button>
          <Button variant="navy" size="sm" onClick={submit} disabled={updateUser.isPending || !dirty}>
            {updateUser.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One management row — desktop table cells. */
function UserRowCells({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const style = roleChipStyle(user.role);
  return (
    <>
      <td className="px-4 py-3.5">
        <p className="truncate font-display text-sm font-bold text-navy-900">
          {user.displayName}
          {isSelf && <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">@{user.username}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{user.email}</span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={style.variant}>
          <ShieldCheck size={12} aria-hidden="true" className="mr-1 inline" />
          {formatRole(user.role)}
        </Badge>
        <PermissionChips permissions={user.permissions ?? []} />
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate text-sm text-ink">{formatCardDate(user.createdAt)}</span>
        <span className="block truncate text-xs text-muted">updated {formatCardDate(user.updatedAt)}</span>
      </td>
    </>
  );
}

interface UserRowProps {
  user: AdminUser;
  isSelf: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

/** Row action cluster — edit + delete (self-delete visually disabled). */
function UserRowActions({ user, isSelf, onEdit, onDelete }: UserRowProps) {
  return (
    <td className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(user)}
          aria-label={`Edit ${user.displayName}`}
          title="Edit account"
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <UserCog size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(user)}
          disabled={isSelf}
          aria-label={isSelf ? `You cannot delete your own account (${user.displayName})` : `Delete ${user.displayName}`}
          title={isSelf ? "You cannot delete the account you are signed in with" : "Delete account"}
          className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-40"
        >
          <AlertTriangle size={15} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}

/** Mobile card for one account — same real fields, stacked layout. */
function UserCard({ user, isSelf, onEdit, onDelete }: UserRowProps) {
  const style = roleChipStyle(user.role);
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy-900">
            {user.displayName}
            {isSelf && <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">@{user.username}</p>
        </div>
        <div>
          <Badge variant={style.variant}>{formatRole(user.role)}</Badge>
          <PermissionChips permissions={user.permissions ?? []} />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Email</dt>
          <dd className="mt-0.5 truncate text-ink">{user.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold uppercase tracking-wider text-muted">Joined</dt>
          <dd className="mt-0.5 truncate text-ink">{formatCardDate(user.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onEdit(user)}
          aria-label={`Edit ${user.displayName}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <UserCog size={14} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(user)}
          disabled={isSelf}
          aria-label={isSelf ? `You cannot delete your own account (${user.displayName})` : `Delete ${user.displayName}`}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-40"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          Delete
        </button>
      </div>
    </li>
  );
}

/** Loading placeholder — no fabricated rows, matching the 9E/9F/9G pattern. */
function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading users" className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AdminUserSort>("created_desc");
  const [page, setPage] = useState(1);
  const [pendingEdit, setPendingEdit] = useState<AdminUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  const { data, isError, isFetching, refetch } = useAdminUsers({
    page,
    pageSize: PAGE_SIZE,
    search,
    role,
    sort,
  });
  const deleteUser = useDeleteUser();

  const hasFilters = Boolean(search || role);

  // Any filter/sort change restarts pagination — never a stranded empty page.
  useEffect(() => {
    setPage(1);
  }, [search, role, sort]);

  function clearFilters() {
    setSearchInput("");
    setRole(undefined);
  }

  const users = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const showingFrom = meta && total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const showingTo = meta ? Math.min(meta.page * meta.pageSize, total) : 0;

  return (
    <div
      className="mx-auto w-full max-w-6xl"
      data-state={isError ? "error" : data ? "ready" : "loading"}
    >
      {/* ---------- Header ---------- */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Users
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Manage account roles and display names. Accounts are created through the public
            signup flow; the system can never be left without an administrator, and every role
            change is recorded in the audit log.
          </p>
        </div>
      </header>

      {isError ? (
        <div className="mt-8">
          <ErrorState
            title="Couldn't load users"
            description="We couldn't load the accounts from the API. Check the connection and try again — the rest of the admin area is still available."
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <>
          {/* ---------- Filters ---------- */}
          <section
            aria-labelledby="admin-users-filters-heading"
            className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5"
          >
            <h2 id="admin-users-filters-heading" className="sr-only">
              Filter users
            </h2>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="xl:w-72">
                <SearchInput
                  id="admin-users-search"
                  label="Search users"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Search name, username, email…"
                />
              </div>
              <div className="xl:w-60">
                <label
                  htmlFor="admin-users-sort"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="admin-users-sort"
                  value={sort}
                  onChange={(changeEvent) => setSort(changeEvent.target.value as AdminUserSort)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <FilterBar
                  groups={[
                    {
                      id: "role",
                      label: "Role",
                      options: ["All", ...ROLE_OPTIONS.map(formatRole)],
                    },
                  ]}
                  values={{
                    role: role ? formatRole(role) : "All",
                  }}
                  onToggle={(groupId, value) => {
                    if (groupId === "role") setRole(value === "All" ? undefined : value.toLowerCase());
                  }}
                  onClear={clearFilters}
                  clearLabel="Reset filters"
                />
              </div>
            </div>
          </section>

          {/* ---------- Results ---------- */}
          {!data ? (
            <div className="mt-6">
              <TableSkeleton />
            </div>
          ) : users.length === 0 ? (
            <div className="mt-6">
              {hasFilters ? (
                <EmptyState
                  icon={Users}
                  title="No matching users"
                  description="No accounts match the current search and filters. Adjust them, or reset to see every account."
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No users yet"
                  description="Accounts appear here once people sign up through the public signup flow. Roles and display names are managed on this page."
                />
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  Showing <span className="font-semibold text-navy-900">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-navy-900">{total}</span> users
                </p>
                {isFetching && (
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium text-muted"
                    data-refreshing="true"
                  >
                    <RefreshCw size={12} aria-hidden="true" className="animate-spin" />
                    Updating…
                  </span>
                )}
              </div>

              {/* Desktop table */}
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">Users management table</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th scope="col" className="w-[26%] px-4 py-3">User</th>
                      <th scope="col" className="w-[30%] px-4 py-3">Email</th>
                      <th scope="col" className="w-[16%] px-4 py-3">Role</th>
                      <th scope="col" className="w-[16%] px-4 py-3">Joined</th>
                      <th scope="col" className="w-[12%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {users.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-navy-50/60">
                        <UserRowCells user={user} isSelf={user.id === currentUser?.id} />
                        <UserRowActions
                          user={user}
                          isSelf={user.id === currentUser?.id}
                          onEdit={setPendingEdit}
                          onDelete={setPendingDelete}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white lg:hidden [&>li+li]:mt-3 [&>li]:border-b [&>li]:border-line [&>li:last-child]:border-b-0">
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUser?.id}
                    onEdit={setPendingEdit}
                    onDelete={setPendingDelete}
                  />
                ))}
              </ul>

              {/* Pagination */}
              <nav
                aria-label="Users pagination"
                className="mt-5 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-xs text-muted">
                  Page {meta!.page} of {meta!.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={meta!.page <= 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, meta!.totalPages))
                    }
                    disabled={meta!.page >= meta!.totalPages || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </nav>
            </>
          )}
        </>
      )}

      {/* ---------- Edit dialog ---------- */}
      {pendingEdit && (
        <UserEditDialog
          user={pendingEdit}
          isSelf={pendingEdit.id === currentUser?.id}
          onClose={() => setPendingEdit(null)}
        />
      )}

      {/* ---------- Delete confirmation (shared, accessible) ---------- */}
      <AdminEventDeleteDialog
        kind="user"
        event={pendingDelete ? { id: pendingDelete.id, title: pendingDelete.displayName } : null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(id) => {
          deleteUser.mutate(id, {
            onSuccess: () => setPendingDelete(null),
            onError: () => {
              // The dialog stays open so the failure is visible in place.
            },
          });
        }}
        deleting={deleteUser.isPending}
        error={deleteUser.isError ? deleteUser.error?.message ?? null : null}
      />
    </div>
  );
}

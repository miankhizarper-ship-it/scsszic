import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAdminCategories, useAddCategory, useDeleteCategory, useRenameCategory } from "@/hooks/admin";
import { ApiError } from "@/services/apiClient";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import type { AdminCategory, CategorySection } from "@/types";
import { cn } from "@/lib/utils";

/**
 * CategoryField (Phase 10C) — the shared category picker for the CMS forms.
 *
 * Renders the standard select over the section's MANAGED vocabulary
 * (GET /api/admin/categories/:section) plus a "Manage" action opening a
 * small dialog where admins can:
 *   - add a new category (case-insensitive dedupe, server-validated);
 *   - rename a category — the server rewrites every content document using
 *     the old name, so stored data and the picker can never drift;
 *   - delete an unused category — the server refuses (409) while content
 *     still references the name.
 *
 * The current form value is always injected into the options (first slot)
 * when missing, so legacy content with a removed category still displays.
 * Public filter chips read the same vocabulary via GET /api/categories.
 */
export function CategoryField({
  id,
  section,
  value,
  onChange,
  error,
  inputClass,
}: {
  id: string;
  section: CategorySection;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputClass: string;
}) {
  const categoriesQuery = useAdminCategories(section);
  const managed = categoriesQuery.data?.categories ?? [];
  const [manageOpen, setManageOpen] = useState(false);

  const options = useMemoOptions(managed, value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClass}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto shrink-0"
          onClick={() => setManageOpen(true)}
          title="Add, rename, or remove categories"
        >
          <Settings2 size={14} aria-hidden="true" />
          Manage
        </Button>
      </div>

      {categoriesQuery.isError && (
        <p className="text-xs text-muted">Categories could not be loaded — the field still accepts the saved value.</p>
      )}

      <CategoryManageDialog
        section={section}
        open={manageOpen}
        inputClass={inputClass}
        onClose={() => setManageOpen(false)}
        onPick={(name) => {
          onChange(name);
          setManageOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Managed list + current value → ordered option labels. The current value
 * leads when it is absent from the managed vocabulary (legacy/removed
 * categories), so the select never silently rewrites the stored value.
 */
function useMemoOptions(managed: AdminCategory[], value: string): string[] {
  const names = managed.map((entry) => entry.name);
  if (value && !names.some((name) => name.toLowerCase() === value.toLowerCase())) {
    return [value, ...names];
  }
  return names;
}

/** Section label for the dialog heading. */
const SECTION_LABELS: Record<CategorySection, string> = {
  events: "event",
  blogs: "blog",
  gallery: "gallery",
  videos: "video",
  projects: "project",
};

function CategoryManageDialog({
  section,
  open,
  inputClass,
  onClose,
  onPick,
}: {
  section: CategorySection;
  open: boolean;
  inputClass: string;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const categoriesQuery = useAdminCategories(section);
  const addMutation = useAddCategory(section);
  const renameMutation = useRenameCategory(section);
  const deleteMutation = useDeleteCategory(section);

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      setNewName("");
      setEditing(null);
      setDialogError(null);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const categories = categoriesQuery.data?.categories ?? [];
  const busy = addMutation.isPending || renameMutation.isPending || deleteMutation.isPending;

  function describeError(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    return "Something went wrong — please try again.";
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setDialogError(null);
    try {
      const result = await addMutation.mutateAsync(name);
      setNewName("");
      const added = pickNewest(categories, result.categories);
      if (added) onPick(added);
    } catch (error) {
      setDialogError(describeError(error));
    }
  }

  async function handleRename() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    setDialogError(null);
    try {
      await renameMutation.mutateAsync({ id: editing.id, name });
      onPick(name);
    } catch (error) {
      setDialogError(describeError(error));
    }
  }

  async function handleDelete(id: string) {
    setDialogError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      setDialogError(describeError(error));
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button type="button" aria-label="Close category manager" onClick={() => !busy && onClose()} className="absolute inset-0 bg-navy-950/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${section}-categories-title`}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`${section}-categories-title`} className="font-display text-lg font-bold text-navy-900">
              Manage {SECTION_LABELS[section]} categories
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Add a category, rename one (existing {SECTION_LABELS[section]}s are updated), or delete an unused one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            autoComplete="off"
            placeholder="New category name…"
            aria-label="New category name"
            maxLength={60}
            className={cn(inputClass, "flex-1")}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button
            type="button"
            variant="navy"
            size="sm"
            className="h-auto shrink-0"
            onClick={() => void handleAdd()}
            disabled={busy || newName.trim().length === 0}
          >
            <Plus size={14} aria-hidden="true" />
            Add
          </Button>
        </div>

        {dialogError && (
          <p role="alert" className="mt-3 rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
            {dialogError}
          </p>
        )}

        <ul className="mt-4 flex min-h-24 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Current categories">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              {editing?.id === category.id ? (
                <>
                  <input
                    type="text"
                    value={editing.name}
                    autoFocus
                    aria-label={`Rename ${category.name}`}
                    maxLength={60}
                    className={cn(inputClass, "h-9 flex-1 py-1")}
                    onChange={(event) => setEditing({ id: category.id, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleRename();
                      }
                      if (event.key === "Escape") setEditing(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="navy"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => void handleRename()}
                    disabled={busy || editing.name.trim().length === 0}
                  >
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => setEditing(null)} disabled={busy}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">{category.name}</span>
                  <button
                    type="button"
                    aria-label={`Rename ${category.name}`}
                    title="Rename"
                    onClick={() => setEditing({ id: category.id, name: category.name })}
                    disabled={busy}
                    className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    title="Delete (only while unused)"
                    onClick={() => void handleDelete(category.id)}
                    disabled={busy}
                    className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
              {categoriesQuery.isPending ? "Loading categories…" : "No categories yet — add the first one above."}
            </li>
          )}
        </ul>

        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * After a successful add, pick the newly added name so the dialog can
 * select it in the form — the server returns the full refreshed list and
 * the new entry is the one absent from the previous snapshot.
 */
function pickNewest(previous: AdminCategory[], next: AdminCategory[]): string | undefined {
  const before = new Set(previous.map((entry) => entry.id));
  const added = next.find((entry) => !before.has(entry.id));
  return added?.name;
}

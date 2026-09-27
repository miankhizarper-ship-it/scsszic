import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

/**
 * AdminEventDeleteDialog (Phase 9C; generalized for blogs in 9D, alumni +
 * members in 9E, projects + feed in 9F, gallery + videos in 9G) —
 * accessible delete confirmation. The `kind` prop tunes the copy.
 * Deletion is explicit and single-record: the dialog names the exact
 * record, requires a deliberate confirm click, and cancels on
 * ESC/backdrop. Focus starts on the safe action, is restored on close.
 *
 */
const KIND_COPY: Record<string, { noun: string; surface: string }> = {
  event: { noun: "event", surface: "events" },
  blog: { noun: "blog", surface: "blogs" },
  alumnus: { noun: "alumni profile", surface: "alumni directory" },
  member: { noun: "member profile", surface: "member directory" },
  project: { noun: "project", surface: "projects showcase" },
  post: { noun: "feed post", surface: "community feed" },
  album: { noun: "album", surface: "gallery" },
  video: { noun: "video", surface: "Watch hub" },
  user: { noun: "account", surface: "" },
};

export function AdminEventDeleteDialog({
  kind = "event",
  event,
  onClose,
  onConfirm,
  deleting,
  error,
}: {
  kind?:
    | "event"
    | "blog"
    | "alumnus"
    | "member"
    | "project"
    | "post"
    | "album"
    | "video"
    | "user";
  /** Minimal record shape — both CMS items are {id, title}. */
  event: { id: string; title: string } | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  deleting: boolean;
  error: string | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(Boolean(event));

  // ESC cancels; initial focus lands on the safe action (Cancel), and focus
  // returns to the page when the dialog closes.
  useEffect(() => {
    if (!event) return;
    const focusTimer = window.setTimeout(() => {
      const button = dialogRef.current?.querySelector<HTMLButtonElement>("button");
      button?.focus();
    }, 0);
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [event, onClose, deleting]);

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="presentation"
      data-testid="admin-event-delete-dialog"
    >
      <button
        type="button"
        aria-label="Cancel delete"
        onClick={() => !deleting && onClose()}
        className="absolute inset-0 bg-navy-950/60"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-event-delete-title"
        aria-describedby="admin-event-delete-description"
        className="relative w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-error/10 text-error">
          <AlertTriangle size={20} aria-hidden="true" />
        </span>
        <h2
          id="admin-event-delete-title"
          className="mt-4 font-display text-lg font-bold text-navy-900"
        >
          Delete this {kind}?
        </h2>
        <p
          id="admin-event-delete-description"
          className="mt-2 text-sm leading-relaxed text-muted"
        >
          {kind === "user" ? (
            <>
              The account <span className="font-semibold text-navy-900">{event.title}</span> will
              be removed from the database and all of its sessions are signed out immediately.
              The last administrator can never be deleted — the server enforces this. This
              action cannot be undone.
            </>
          ) : (
            <>
              <span className="font-semibold text-navy-900">{event.title}</span> will be
              removed from the database and will no longer appear on the public
              {KIND_COPY[kind]?.surface ?? "events"} page. This action cannot be undone.
            </>
          )}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting} className="sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="navy"
            size="sm"
            onClick={() => onConfirm(event.id)}
            disabled={deleting}
            className="bg-error text-white hover:bg-error/90 active:bg-error/90 sm:w-auto"
          >
            <Trash2 size={14} aria-hidden="true" />
            {deleting
              ? "Deleting…"
              : `Delete ${KIND_COPY[kind]?.noun ?? "event"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

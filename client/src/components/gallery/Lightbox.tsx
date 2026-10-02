import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import type { GalleryPhoto } from "@/types";

/**
 * One viewer entry — a photo, or (Task 33) a video clip carrying its own
 * source URL. Plain GalleryPhoto[] remains assignable, so existing album
 * pages keep passing their photos untouched.
 */
export type LightboxItem = GalleryPhoto & { videoUrl?: string };

interface LightboxProps {
  /** Full item list of the open album/event. */
  photos: LightboxItem[];
  /** Index of the open item (guaranteed non-null while mounted). */
  index: number;
  /** Used for the dialog label and media alt context. */
  albumTitle: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Lightbox — accessible full-screen media viewer.
 *
 * Behavior (spec §10):
 *  - opens on photo click/tap, closes via button, backdrop, or Escape
 *  - ArrowLeft / ArrowRight navigate (wrapping), with visible prev/next buttons
 *  - current item indicator ("2 of 6"), caption where available, real alt text
 *  - role="dialog" + aria-modal, background scroll locked, focus moved into
 *    the dialog on open and returned to the invoking element on close
 *  - a simple Tab loop keeps keyboard focus inside while open
 *  - animations are a single subtle fade (respects prefers-reduced-motion
 *    via the global MotionConfig)
 *  - Task 33: entries carrying `videoUrl` play inline (click-to-play native
 *    player) — the same viewer now serves the event detail media grid
 *
 * Deliberately dependency-free — a third-party lightbox was not warranted.
 */
export function Lightbox({ photos, index, albumTitle, onClose, onNavigate }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const total = photos.length;
  const photo = photos[index];

  useLockBodyScroll(true);

  const goPrev = useCallback(
    () => onNavigate((index - 1 + total) % total),
    [index, total, onNavigate],
  );
  const goNext = useCallback(
    () => onNavigate((index + 1) % total),
    [index, total, onNavigate],
  );

  /* Focus management: remember the invoker, focus the dialog, restore on close. */
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  /* Global keys + a simple focus trap. */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "Tab") {
        /* Keep Tab cycling inside the dialog. */
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], [tabindex]:not([tabindex='-1'])",
        );
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${albumTitle} — ${photo.videoUrl ? "video" : "photo"} ${index + 1} of ${total}`}
      tabIndex={-1}
      className="fixed inset-0 z-[90] flex flex-col bg-navy-950/95 outline-none backdrop-blur-sm"
      onClick={(event) => {
        /* Backdrop click closes; clicks inside the stage do not. */
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Top bar: indicator + close */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-300"
          aria-live="polite"
        >
          <Expand size={14} aria-hidden="true" className="text-gold-400" />
          <span className="font-semibold text-white">{index + 1}</span>
          of {total}
        </p>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="grid size-10 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        {photo.videoUrl ? (
          <video
            key={photo.id}
            src={photo.videoUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-full max-w-full rounded-lg bg-black object-contain shadow-2xl"
            aria-label={photo.alt}
          />
        ) : (
          <img
            key={photo.id}
            src={photo.src}
            alt={photo.alt}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}

        {/* Prev / next — full-height hit areas on desktop, compact on mobile */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous item"
              className="absolute left-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-navy-950/70 text-white backdrop-blur-sm transition-colors hover:border-gold-400/60 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 sm:left-4 sm:size-12"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next item"
              className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-navy-950/70 text-white backdrop-blur-sm transition-colors hover:border-gold-400/60 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 sm:right-4 sm:size-12"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Caption bar */}
      <div className="px-4 py-4 text-center sm:px-6 sm:py-5">
        {photo.caption ? (
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300">
            {photo.caption}
          </p>
        ) : (
          <p className="sr-only">{photo.alt}</p>
        )}
      </div>
    </div>
  );
}

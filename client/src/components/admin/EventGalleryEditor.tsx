import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Film, ImagePlus, Link2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { UploadMediaFilesButton } from "@/components/admin/UploadMediaButton";
import { cn } from "@/lib/utils";

/**
 * EventGalleryEditor (Task 16) — the event form's gallery manager.
 *
 * Replaces the old newline textarea with a visual grid over the model's own
 * `gallery: string[]` (each entry is a plain media reference — a local asset
 * path, an R2 URL, or any external URL):
 *  - MULTI UPLOAD: the file picker accepts any number of images AND videos
 *    (the server allows video in the events library since Task 16) and the
 *    whole batch appends in selection order;
 *  - VIDEO entries render a real <video> preview tile with a clip badge;
 *  - entries can be reordered (move up / down) and removed;
 *  - a path/URL can still be pasted in by hand for existing media.
 *
 * The order here IS the public order on the event detail page.
 */

const MAX_GALLERY_ITEMS = 50;

/** Video entries are recognised by their file extension (mp4/webm — the
 *  only direct-video types the storage layer issues). */
export function isVideoMediaRef(src: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(src.trim());
}

function GalleryTile({
  src,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
  index,
}: {
  src: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}) {
  const [failed, setFailed] = useState(false);
  const video = isVideoMediaRef(src);

  return (
    <li className="group relative overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-navy-950">
        {video ? (
          <video
            src={src}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
            aria-label={`Event gallery clip ${index + 1}`}
          />
        ) : (
          <img
            src={src}
            alt={`Event gallery photo ${index + 1}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover",
              failed && "hidden",
            )}
          />
        )}
        {failed && (
          <div className="grid h-full w-full place-items-center px-2 text-center text-[11px] font-medium text-white/70">
            Preview unavailable — check the media path
          </div>
        )}
        {video && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-navy-950/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
            <Film size={10} aria-hidden="true" />
            Video
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 border-t border-line bg-white px-1.5 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Move gallery item ${index + 1} up`}
            disabled={isFirst}
            onClick={onMoveUp}
            className="grid size-7 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Move gallery item ${index + 1} down`}
            disabled={isLast}
            onClick={onMoveDown}
            className="grid size-7 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={13} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          aria-label={`Remove gallery item ${index + 1}`}
          onClick={onRemove}
          className="grid size-7 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function EventGalleryEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
}) {
  const [manualRef, setManualRef] = useState("");

  // Internal mirror — the rendering source of truth between form hydrations.
  // react-hook-form's useWatch does not reliably re-render for array fields
  // no input registers, so prop-driven rendering could read a STALE array
  // when two items are added back-to-back (the second write would overwrite
  // the first). Every mutation flows through emit(); external changes (form
  // reset / edit hydration) are adopted when they arrive.
  const [inner, setInner] = useState<string[]>(items);
  const lastSeen = useRef(items);

  useEffect(() => {
    if (items !== lastSeen.current) {
      lastSeen.current = items;
      setInner(items);
    }
  }, [items]);

  /** Push the next array to local state AND the form. */
  function emit(next: string[]) {
    lastSeen.current = next;
    setInner(next);
    onChange(next);
  }

  function appendRefs(refs: string[]) {
    const next = [...inner];
    for (const ref of refs) {
      const value = ref.trim();
      if (value && next.length < MAX_GALLERY_ITEMS) next.push(value);
    }
    emit(next);
  }

  function move(index: number, target: number) {
    if (target < 0 || target >= inner.length) return;
    const next = [...inner];
    const [entry] = next.splice(index, 1);
    next.splice(target, 0, entry);
    emit(next);
  }

  function addManualRef() {
    const value = manualRef.trim();
    if (!value) return;
    appendRefs([value]);
    setManualRef("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <UploadMediaFilesButton
          folder="events"
          accept="image/*,video/mp4,video/webm"
          label="Upload images & videos"
          disabled={disabled}
          onUploaded={(urls) => appendRefs(urls)}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Link2
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={manualRef}
              disabled={disabled}
              onChange={(event) => setManualRef(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addManualRef();
                }
              }}
              placeholder="…or paste an image/video path or URL"
              aria-label="Add gallery media by path or URL"
              className="w-full rounded-lg border border-line bg-white py-2 pl-8 pr-3 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 disabled:opacity-60"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            disabled={disabled || !manualRef.trim()}
            onClick={addManualRef}
          >
            <ImagePlus size={14} aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>

      {inner.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface px-3.5 py-3 text-xs text-muted">
          No gallery media yet — upload images and video clips, or paste paths/URLs.
          The first item becomes the large tile on the public event page.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {inner.map((src, index) => (
            <GalleryTile
              key={`${src}-${index}`}
              src={src}
              index={index}
              isFirst={index === 0}
              isLast={index === inner.length - 1}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onRemove={() => emit(inner.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
      )}
      {inner.length >= MAX_GALLERY_ITEMS && (
        <p className="text-xs font-medium text-error">
          An event gallery holds at most {MAX_GALLERY_ITEMS} items.
        </p>
      )}
    </div>
  );
}

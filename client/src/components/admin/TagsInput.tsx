import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * TagsInput (Task 16) — the shared chip-based tag editor for every CMS form
 * that carries a `tags` field.
 *
 * Separators, per the admin-panel request:
 *  - SPACE commits the word being typed as a tag ("ai ml" → two tags);
 *  - COMMA also commits (the classic separator still works everywhere,
 *    including pasted lists);
 *  - ENTER commits for keyboard users.
 *  - The "space system": wrap a phrase in double quotes to keep its spaces —
 *    `"machine learning"` + space/enter/comma becomes ONE multi-word tag.
 *    While a quote is open, typing spaces never splits the tag.
 *
 * Chips can be removed individually (×) and Backspace on an empty input
 * pops the last chip. Duplicate tags (case-insensitive) are ignored. Limits
 * mirror the server schema: at most 20 tags, each at most 40 characters.
 */

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

interface TagsInputProps {
  id?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** Disabled while the parent mutation is pending. */
  disabled?: boolean;
  ariaInvalid?: boolean;
}

/** Strip one wrapping pair of double quotes, if present. */
function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** True while the text opens a quote it has not closed yet. */
function hasOpenQuote(value: string): boolean {
  const quotes = value.split('"').length - 1;
  return quotes % 2 === 1;
}

/** Clean one candidate tag: trim, collapse doubled spaces, drop empties. */
function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function TagsInput({
  id,
  tags,
  onChange,
  placeholder = "Add a tag…",
  disabled = false,
  ariaInvalid = false,
}: TagsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // The internal mirror is the rendering source of truth between form
  // hydrations: react-hook-form's useWatch does not reliably re-render for
  // array fields that no input registers, so prop-driven rendering could
  // read a STALE array when chips are committed quickly (e.g. "a b c"
  // typed at typing speed would drop tags). Every mutation flows through
  // emit() — local state immediately, the form via onChange — and external
  // changes (form reset / edit hydration) are adopted when they arrive.
  const [inner, setInner] = useState<string[]>(tags);
  const lastSeen = useRef(tags);

  useEffect(() => {
    if (tags !== lastSeen.current) {
      lastSeen.current = tags;
      setInner(tags);
    }
  }, [tags]);

  /** Push the next array to local state AND the form. */
  function emit(next: string[]) {
    lastSeen.current = next;
    setInner(next);
    onChange(next);
  }

  const atCapacity = inner.length >= MAX_TAGS;

  /** Commit one cleaned tag if it passes the duplicate/length/capacity rules. */
  function commit(raw: string) {
    const tag = normalizeTag(unquote(raw));
    setNotice(null);
    if (!tag) return;
    if (inner.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    if (tag.length > MAX_TAG_LENGTH) {
      setNotice(`"${tag.slice(0, 20)}…" is over ${MAX_TAG_LENGTH} characters.`);
      return;
    }
    if (inner.length >= MAX_TAGS) {
      setNotice(`At most ${MAX_TAGS} tags are allowed.`);
      return;
    }
    emit([...inner, tag]);
    setDraft("");
  }

  /**
   * Space-commit gate: inside an open quote a space is literal text (the
   * multi-word escape); otherwise it acts as a separator.
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && draft.length === 0 && inner.length > 0) {
      event.preventDefault();
      emit(inner.slice(0, -1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === " " && !hasOpenQuote(draft)) {
      event.preventDefault();
      commit(draft);
    }
  }

  /** Pasted / typed text: split on commas immediately, keep the tail editable. */
  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    setNotice(null);
    if (raw.includes(",")) {
      const parts = raw.split(",");
      const tail = parts.pop() ?? "";
      parts.forEach((part) => commit(part));
      setDraft(tail);
      return;
    }
    setDraft(raw);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="group"
        aria-label="Tags"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-sm shadow-sm transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-gold-500",
          ariaInvalid ? "border-error" : "border-line",
        )}
      >
        {inner.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-navy-200 bg-navy-50 py-0.5 pl-2 pr-0.5 text-xs font-semibold text-navy-900"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
              // Keep focus in the input so the blur-commit never races this
              // removal with a stale tags array.
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                emit(inner.filter((_, i) => i !== index));
              }}
              className="grid size-5 shrink-0 place-items-center rounded text-navy-600 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500 disabled:opacity-50"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled || atCapacity}
          value={draft}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          aria-invalid={ariaInvalid}
          placeholder={inner.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
      <p className={cn("text-xs", notice ? "font-medium text-error" : "text-muted")}>
        {notice ??
          "Separate tags with spaces or commas. Use \"quotes\" for a multi-word tag — e.g. \"machine learning\"."}
      </p>
    </div>
  );
}

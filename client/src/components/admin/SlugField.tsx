import { useQuery } from "@tanstack/react-query";
import { Check, RefreshCw, Search } from "lucide-react";

import { adminService } from "@/services/adminService";
import { Button } from "@/components/ui/Button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AdminPermission } from "@/types";
import { cn } from "@/lib/utils";

/**
 * SlugField (Phase 10C) — the shared slug input for every CMS form.
 *
 * Search-first slug generation, per the admin-panel UX update:
 *  - "Generate" slugifies the title, then CHECKS the live collection BEFORE
 *    writing the value into the form — if the slug is taken, the first free
 *    numbered variant (`my-title-2`) is used immediately.
 *  - While the slug is edited, a debounced availability probe runs against
 *    GET /api/admin/slug-check and shows an inline verdict: available,
 *    checking, or taken-with-suggestion (one click to adopt it).
 *
 * The check is a UX accelerator, NOT the security boundary: the server's
 * unique indexes still reject duplicates with 409 on submit, and the form
 * maps that field error onto this input as before.
 */
export function SlugField({
  id,
  value,
  onChange,
  error,
  title,
  slugify,
  section,
  excludeId,
  urlPrefix,
  inputClass,
  generateLabel = "Generate",
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Source text (usually the title field value) for the Generate action. */
  title: string;
  slugify: (value: string) => string;
  /** CMS section whose unique slugs are checked (8 slug-bearing sections). */
  section: AdminPermission;
  /** Edit forms pass their own document id — it is never a conflict. */
  excludeId?: string;
  /** Public URL prefix for the hint text, e.g. "/events/". */
  urlPrefix: string;
  inputClass: string;
  generateLabel?: string;
  disabled?: boolean;
}) {
  const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
  const debouncedSlug = useDebouncedValue(value, 400);

  const checkable = debouncedSlug.length > 0 && SLUG_PATTERN.test(debouncedSlug);
  const availability = useQuery({
    queryKey: ["admin", "slug-check", section, debouncedSlug, excludeId ?? ""],
    queryFn: () => adminService.checkSlug(section, debouncedSlug, excludeId),
    enabled: checkable && !error,
    staleTime: 15_000,
  });

  const checking = checkable && availability.isPending;
  const result = availability.data;
  const taken = checkable && result ? !result.available : false;
  const available = checkable && result ? result.available : false;

  async function handleGenerate() {
    const base = slugify(title ?? "");
    if (!base) return;
    // Search first: adopt the first free variant immediately when taken.
    onChange(base);
    try {
      const check = await adminService.checkSlug(section, base, excludeId);
      if (!check.available) {
        onChange(check.suggestion);
      }
    } catch {
      // Availability probe is best-effort — the base slug stays in the form
      // and the server's 409 mapping covers a real collision on submit.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error) || taken}
          aria-describedby={error ? `${id}-error` : `${id}-availability`}
          className={inputClass}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto shrink-0"
          onClick={() => void handleGenerate()}
          disabled={disabled}
        >
          <Search size={14} aria-hidden="true" />
          {generateLabel}
        </Button>
      </div>

      {!error && (
        <p
          id={`${id}-availability`}
          role="status"
          className={cn(
            "flex min-h-5 items-center gap-1.5 text-xs font-medium",
            taken ? "text-error" : available ? "text-success" : "text-muted",
          )}
        >
          {checking ? (
            <>
              <RefreshCw size={12} aria-hidden="true" className="animate-spin" />
              Checking whether {urlPrefix}
              {debouncedSlug || "…"} is free…
            </>
          ) : available ? (
            <>
              <Check size={12} aria-hidden="true" />
              {urlPrefix}
              {debouncedSlug} is available.
            </>
          ) : taken ? (
            <>
              <span aria-hidden="true">⚠</span>
              {urlPrefix}
              {debouncedSlug} is taken —{" "}
              <button
                type="button"
                onClick={() => onChange(result?.suggestion ?? debouncedSlug)}
                className="inline-flex items-center gap-1 rounded font-semibold underline underline-offset-2 transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                use {urlPrefix}
                {result?.suggestion}
              </button>
            </>
          ) : checkable ? (
            <>
              {urlPrefix}
              {debouncedSlug}
            </>
          ) : (
            <>
              {urlPrefix}
              {"your-slug"}
            </>
          )}
        </p>
      )}
    </div>
  );
}

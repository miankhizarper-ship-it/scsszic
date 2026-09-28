import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, GripVertical, Info, Link2, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { useAdminSettings, useUpdateSiteSettings } from "@/hooks/admin";
import { ApiError } from "@/services/apiClient";
import { cn } from "@/lib/utils";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  type SerializedSocialLink,
  type SocialPlatform,
} from "@/types";

/**
 * Admin Settings (Task 15) — site-wide configuration. This first release
 * manages the FOOTER SOCIAL LINKS: the same links every public page's
 * footer renders. Saving here replaces the placeholder set immediately —
 * no deploy, no rebuild.
 *
 * Editor model: one row per link = platform picker + URL. The display
 * label (aria-label / title text, e.g. "SCS on GitHub") is derived from
 * the platform so managers never maintain it by hand. Saves are PUT
 * replace-all — the full row list is the payload, matching the server's
 * single-document settings record.
 */

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

/** The platforms a fresh, unconfigured editor starts with (common ones). */
const STARTER_PLATFORMS: SocialPlatform[] = ["github", "linkedin", "instagram", "twitter"];

/** Readable display label derived from the platform — never hand-edited. */
function autoLabel(platform: SocialPlatform): string {
  if (platform === "globe") return "SCS website";
  if (platform === "link") return "SCS link";
  if (platform === "x") return "SCS on X (Twitter)";
  return `SCS on ${SOCIAL_PLATFORM_LABELS[platform]}`;
}

/** Client mirror of the server's settings schema (one row = platform+URL). */
const editorSchema = z.object({
  links: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        href: z
          .string()
          .trim()
          .min(1, "Enter the link URL.")
          .max(500, "Keep the URL under 500 characters.")
          .refine((value) => {
            try {
              const url = new URL(value);
              return url.protocol === "https:" || url.protocol === "http:";
            } catch {
              return false;
            }
          }, "Enter a valid URL starting with https://"),
      }),
    )
    .max(8, "At most 8 social links are allowed."),
});

type EditorValues = z.infer<typeof editorSchema>;

function toFormValues(socials: SerializedSocialLink[]): EditorValues {
  if (socials.length === 0) {
    // Not configured yet — start the editor with the common platforms so
    // the manager only fills in URLs (or deletes the rows they don't use).
    return {
      links: STARTER_PLATFORMS.map((platform) => ({ platform, href: "" })),
    };
  }
  return {
    links: socials.map((social) => ({
      platform: (SOCIAL_PLATFORMS as readonly string[]).includes(social.icon)
        ? (social.icon as SocialPlatform)
        : "link",
      href: social.href,
    })),
  };
}

export default function AdminSettingsPage() {
  const settingsQuery = useAdminSettings();
  const updateMutation = useUpdateSiteSettings();

  const form = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: { links: [] },
    mode: "onSubmit",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "links",
  });

  // Load current settings into the editor once they arrive (and re-sync
  // after each successful save). form.reset keeps the dirty baseline in
  // sync — replace() alone would leave the form marked dirty.
  useEffect(() => {
    if (settingsQuery.data) {
      form.reset(toFormValues(settingsQuery.data.socials));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on data change; form is stable
  }, [settingsQuery.data, form.reset]);

  const onSubmit = form.handleSubmit((values) => {
    updateMutation.mutate(
      values.links.map((link) => ({
        label: autoLabel(link.platform),
        href: link.href.trim(),
        icon: link.platform,
      })),
    );
  });

  const serverError =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.error
        ? "Saving failed. Please try again."
        : null;

  if (settingsQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div role="status" aria-live="polite" className="py-24 text-center text-sm text-muted">
          Loading settings…
        </div>
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-4xl py-10">
        <ErrorState
          title="Settings could not be loaded"
          description="The settings API did not respond. Try again in a moment — the public site is unaffected and still shows its current footer links."
          onRetry={() => void settingsQuery.refetch()}
        />
      </div>
    );
  }

  const isConfigured = (settingsQuery.data?.socials.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ---------- Header ---------- */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
          Administration
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Site-wide configuration. Changes here apply to the whole public site
          the moment you save — no deploy needed.
        </p>
      </header>

      {/* ---------- Footer social links editor ---------- */}
      <section
        aria-labelledby="social-links-heading"
        className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="social-links-heading"
              className="font-display text-base font-bold text-navy-900"
            >
              Footer social links
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              The icon row under the footer's brand description. Adding your
              real profiles replaces the placeholder links everywhere at once.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ platform: "github", href: "" })}
            disabled={fields.length >= 8}
          >
            <Plus size={15} aria-hidden="true" />
            Add link
          </Button>
        </div>

        {!isConfigured && (
          <div
            role="note"
            className="mt-4 flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-gold-700"
            >
              <Info size={16} />
            </span>
            <p className="text-sm leading-relaxed text-navy-900">
              <span className="font-semibold">The footer is showing placeholder links.</span>{" "}
              Fill in the real profile URLs below and save — the placeholders
              are replaced the moment a first link set is stored.
            </p>
          </div>
        )}

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-5">
          {/* ---- Rows ---- */}
          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              No social links yet. Use <span className="font-semibold">Add link</span> to add the
              society's profiles.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const hrefError = form.formState.errors.links?.[index]?.href?.message;
                return (
                  <li
                    key={field.id}
                    className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span aria-hidden="true" className="hidden text-slate-300 sm:block">
                      <GripVertical size={16} />
                    </span>

                    {/* Platform picker */}
                    <div className="sm:w-44">
                      <label
                        htmlFor={`links-${index}-platform`}
                        className="sr-only"
                      >
                        Platform for link {index + 1}
                      </label>
                      <select
                        id={`links-${index}-platform`}
                        {...form.register(`links.${index}.platform`)}
                        className={cn(INPUT_CLASS, "appearance-none bg-white pr-8")}
                      >
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {SOCIAL_PLATFORM_LABELS[platform]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* URL input */}
                    <div className="flex-1">
                      <label htmlFor={`links-${index}-href`} className="sr-only">
                        URL for link {index + 1}
                      </label>
                      <div className="relative">
                        <Link2
                          size={14}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          id={`links-${index}-href`}
                          type="url"
                          inputMode="url"
                          placeholder="https://…"
                          aria-invalid={Boolean(hrefError)}
                          aria-describedby={hrefError ? `links-${index}-href-error` : undefined}
                          {...form.register(`links.${index}.href`)}
                          className={cn(INPUT_CLASS, "pl-9")}
                        />
                      </div>
                      {hrefError && (
                        <p
                          id={`links-${index}-href-error`}
                          role="alert"
                          className="mt-1 text-xs font-medium text-error"
                        >
                          {hrefError}
                        </p>
                      )}
                    </div>

                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove link ${index + 1} (${SOCIAL_PLATFORM_LABELS[form.getValues(`links.${index}.platform`)] ?? "platform"})`}
                      className="inline-flex size-9 shrink-0 items-center justify-center self-end rounded-lg border border-line text-muted transition-colors hover:border-error/40 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 sm:self-center"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ---- Feedback ---- */}
          <div aria-live="polite">
            {updateMutation.isSuccess && !form.formState.isDirty && (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5 text-sm font-medium text-success">
                <CheckCircle2 size={16} aria-hidden="true" />
                Footer social links saved — the site footer is already updated.
              </p>
            )}
            {serverError && (
              <p role="alert" className="mt-4 rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm font-medium text-error">
                {serverError}
              </p>
            )}
          </div>

          {/* ---- Actions ---- */}
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!form.formState.isDirty || updateMutation.isPending}
              onClick={() => form.reset(toFormValues(settingsQuery.data?.socials ?? []))}
            >
              Discard changes
            </Button>
            <Button type="submit" variant="navy" size="sm" disabled={updateMutation.isPending}>
              <Save size={15} aria-hidden="true" />
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, UserPlus } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import {
  useAdminTeamCard,
  useCreateTeamCard,
  useUpdateTeamCard,
} from "@/hooks/admin";
import {
  TEAM_GROUP_LABELS,
  teamFormDefaults,
  teamFormSchema,
  toTeamFormValues,
  toTeamPayload,
  type TeamFormValues,
} from "@/lib/adminTeamForm";
import { initialsFromName } from "@/lib/adminAlumniForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Team form (Phase 12) — one reusable form for create AND edit
 * (/admin/team/new, /admin/team/:id/edit), for BOTH card groups.
 *
 * Fields mirror the TeamCard model exactly (group, name, position,
 * description, initials, image, imageAlt, order, status, socials) — no
 * invented fields. Published cards are public immediately; archived cards
 * stay in the CMS but leave every public surface.
 */

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

/** Label + control + specific error — the shared form-field wrapper. */
function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 id={`${id}-heading`} className="font-display text-base font-bold text-navy-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminTeamFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const cardQuery = useAdminTeamCard(id);
  const createCard = useCreateTeamCard();
  const updateCard = useUpdateTeamCard(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: teamFormDefaults(),
    mode: "onTouched",
  });

  const { fields: socialFields, append: appendSocial, remove: removeSocial } =
    useFieldArray({ control, name: "socials" });

  // Edit mode — hydrate the form once the real card arrives.
  useEffect(() => {
    if (cardQuery.data) {
      reset(toTeamFormValues(cardQuery.data));
    }
  }, [cardQuery.data, reset]);

  const name = useWatch({ control, name: "name" });
  const initialsValue = useWatch({ control, name: "initials" });
  const initialsDirty = Boolean(initialsValue && initialsValue !== initialsFromName(name ?? ""));

  const pending = isSubmitting || createCard.isPending || updateCard.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof TeamFormValues, { type: "server", message });
          mapped = true;
        } catch {
          // Unknown key — fall through to the form-level message.
        }
      }
      if (mapped) return;
    }
    setFormError(
      error instanceof Error ? error.message : "Saving failed. Please try again.",
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit && id) {
        await updateCard.mutateAsync(toTeamPayload(values));
      } else {
        await createCard.mutateAsync(toTeamPayload(values));
      }
      navigate(ROUTES.admin.team);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (cardQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this card"
            description="The team card may not exist anymore, or the API is unreachable. Head back to the team list and try again."
            onRetry={() => void cardQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.team} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to team
            </Button>
          </div>
        </div>
      );
    }
    if (cardQuery.isPending || !cardQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading team card…</p>
          <div className="h-9 w-56 animate-pulse rounded-lg border border-line bg-white" />
          <div className="mt-6 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl border border-line bg-white" />
            ))}
          </div>
        </div>
      );
    }
  }

  const card = cardQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Team Card" : "New Team Card"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this card — published cards appear on the site immediately; archived cards are hidden from every public surface."
              : "Add a card to the Leadership or Developers group. Published cards appear on the home page (and the About leadership strip) as soon as they are saved."}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="team-basics" title="Basics" description="Which group the card belongs to, and the person's identity.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="team-group" label="Group" required error={errors.group?.message} hint="Where the card appears.">
                <select
                  id="team-group"
                  aria-invalid={Boolean(errors.group)}
                  className={INPUT_CLASS}
                  {...register("group")}
                >
                  {Object.entries(TEAM_GROUP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="team-name" label="Name" required error={errors.name?.message} className="sm:col-span-2">
                <input
                  id="team-name"
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  className={INPUT_CLASS}
                  {...register("name")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                id="team-position"
                label="Position"
                required
                error={errors.position?.message}
                hint="e.g. President, Backend Lead"
                className="sm:col-span-2"
              >
                <input
                  id="team-position"
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.position)}
                  className={INPUT_CLASS}
                  {...register("position")}
                />
              </Field>
              <Field
                id="team-initials"
                label="Initials"
                required
                error={errors.initials?.message}
                hint={initialsDirty ? "Custom initials — shown without a photo." : "Auto-matches the name."}
              >
                <input
                  id="team-initials"
                  type="text"
                  maxLength={4}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.initials)}
                  className={INPUT_CLASS}
                  {...register("initials")}
                />
              </Field>
            </div>

            <Field
              id="team-description"
              label="Short description"
              error={errors.description?.message}
              hint="One or two lines shown under the name on the card."
            >
              <textarea
                id="team-description"
                rows={2}
                aria-invalid={Boolean(errors.description)}
                className={INPUT_CLASS}
                {...register("description")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Portrait ---------- */}
        <Section id="team-media" title="Portrait & links" description="Photo reference and social profiles (all optional).">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="team-image" label="Portrait path/URL" error={errors.image?.message} hint="Path or URL — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="team-image"
                      type="text"
                      aria-invalid={Boolean(errors.image)}
                      className={INPUT_CLASS}
                      {...register("image")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="misc"
                    accept="image/*"
                    onUploaded={(url) => setValue("image", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="team-image-alt" label="Portrait alt text" error={errors.imageAlt?.message}>
                <input
                  id="team-image-alt"
                  type="text"
                  aria-invalid={Boolean(errors.imageAlt)}
                  className={INPUT_CLASS}
                  {...register("imageAlt")}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Social links
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSocial({ label: "", href: "", icon: "linkedin" })}
                >
                  Add link
                </Button>
              </div>
              {socialFields.length === 0 ? (
                <p className="mt-2 text-xs text-muted">No social links — the card simply hides its links row.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {socialFields.map((link, index) => (
                    <li
                      key={link.id}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[10rem_1fr_7rem_auto] sm:items-start"
                    >
                      <div>
                        <label htmlFor={`team-social-label-${index}`} className="sr-only">
                          Link label
                        </label>
                        <input
                          id={`team-social-label-${index}`}
                          type="text"
                          placeholder="Label"
                          aria-invalid={Boolean(errors.socials?.[index]?.label)}
                          className={INPUT_CLASS}
                          {...register(`socials.${index}.label` as const)}
                        />
                        {errors.socials?.[index]?.label && (
                          <p className="mt-1 text-xs font-medium text-error">{errors.socials[index]?.label?.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`team-social-href-${index}`} className="sr-only">
                          Link URL
                        </label>
                        <input
                          id={`team-social-href-${index}`}
                          type="text"
                          placeholder="https://…"
                          aria-invalid={Boolean(errors.socials?.[index]?.href)}
                          className={INPUT_CLASS}
                          {...register(`socials.${index}.href` as const)}
                        />
                        {errors.socials?.[index]?.href && (
                          <p className="mt-1 text-xs font-medium text-error">{errors.socials[index]?.href?.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`team-social-icon-${index}`} className="sr-only">
                          Icon key
                        </label>
                        <select
                          id={`team-social-icon-${index}`}
                          aria-invalid={Boolean(errors.socials?.[index]?.icon)}
                          className={INPUT_CLASS}
                          {...register(`socials.${index}.icon` as const)}
                        >
                          {["linkedin", "github", "twitter", "instagram", "globe", "mail"].map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSocial(index)}
                        aria-label={`Remove social link ${index + 1}`}
                        className="grid size-9 place-items-center self-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        {/* ---------- Visibility ---------- */}
        <Section id="team-visibility" title="Visibility & order" description="Control where the card sits and whether it is public.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="team-order"
              label="Display order"
              error={errors.order?.message}
              hint="Lower numbers appear first (0–999)."
            >
              <input
                id="team-order"
                type="number"
                min={0}
                max={999}
                aria-invalid={Boolean(errors.order)}
                className={INPUT_CLASS}
                {...register("order")}
              />
            </Field>
            <Field id="team-status" label="Status" required error={errors.status?.message}>
              <select
                id="team-status"
                aria-invalid={Boolean(errors.status)}
                className={INPUT_CLASS}
                {...register("status")}
              >
                <option value="published">Published — visible on the site</option>
                <option value="archived">Archived — hidden from the site</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ---------- Submit ---------- */}
        {formError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm font-medium text-error">
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-1 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <Button to={ROUTES.admin.team} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create card"}
          </Button>
        </div>
      </form>

      {isEdit && card && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <UserPlus size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{card.name}" — id {card.id}. Published cards are public immediately after saving.
        </p>
      )}
    </div>
  );
}

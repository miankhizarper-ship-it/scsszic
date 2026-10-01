import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, UserPlus } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import {
  AiAssistantProvider,
  AiFillButton,
  AiSourcePanel,
} from "@/components/admin/AiAssistant";
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
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes/paths";
import type { TeamGroup } from "@/types";

/**
 * Admin Team form (Phase 12, context-aware since Task 14) — one reusable
 * form for create AND edit, mounted from context-aware routes:
 *
 *   /admin/home-page/leaders/new | :id/edit   → group LOCKED to leaders,
 *   /admin/home-page/developers/…             → group LOCKED to developers,
 *   /admin/about-page/leaders/…               → group LOCKED to leaders.
 *
 * The route prefix decides where "Back" and the post-save redirect land, so
 * the Home Page and About Page managers feel like self-contained sections.
 * A locked group renders as a disabled select (the URL is the source of
 * truth), and an edit route whose fixed group mismatches the card's actual
 * group is refused with a link to the card's REAL edit page — never a silent
 * group re-assignment on save.
 */

interface TeamFormContext {
  /** Fixed group for this route — null only for the legacy fallback. */
  lockedGroup: TeamGroup | null;
  returnTo: string;
  backLabel: string;
}

function resolveTeamFormContext(pathname: string): TeamFormContext {
  if (pathname.startsWith(`${ROUTES.admin.homePage}/developers`)) {
    return {
      lockedGroup: "developers",
      returnTo: `${ROUTES.admin.homePage}?tab=developers`,
      backLabel: "Back to Home Page",
    };
  }
  if (pathname.startsWith(`${ROUTES.admin.homePage}/leaders`)) {
    return {
      lockedGroup: "leaders",
      returnTo: `${ROUTES.admin.homePage}?tab=leaders`,
      backLabel: "Back to Home Page",
    };
  }
  if (pathname.startsWith(`${ROUTES.admin.aboutPage}/leaders`)) {
    return {
      lockedGroup: "leaders",
      returnTo: ROUTES.admin.aboutPage,
      backLabel: "Back to About Page",
    };
  }
  return { lockedGroup: null, returnTo: ROUTES.admin.team, backLabel: "Back to team" };
}

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
  ai,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Optional AI fill button rendered inside the label row (Task 28). */
  ai?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-error">*</span>}
        {ai}
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
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  // Route context is stable per mount — compute it once.
  const context = useMemo(() => resolveTeamFormContext(location.pathname), [location.pathname]);
  const { lockedGroup } = context;

  const cardQuery = useAdminTeamCard(id);
  const createCard = useCreateTeamCard();
  const updateCard = useUpdateTeamCard(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: teamFormDefaults(lockedGroup ?? "leaders"),
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

  // Auto-derive initials while the field still matches the name — the hint
  // promises "auto-matches the name", so the value must actually track it
  // (previously the fallback only ran in the payload, after validation had
  // already rejected the empty field).
  useEffect(() => {
    if (initialsDirty) return;
    const auto = initialsFromName(name ?? "");
    if (auto && auto !== initialsValue) {
      setValue("initials", auto, { shouldValidate: false });
    }
  }, [name, initialsDirty, initialsValue, setValue]);

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
      navigate(context.returnTo);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  // A locked-group edit route that points at a card of the OTHER group is a
  // stale link — refuse it instead of silently re-assigning the group on save.
  if (isEdit && cardQuery.data && lockedGroup && cardQuery.data.group !== lockedGroup) {
    const card = cardQuery.data;
    const correctHref =
      card.group === "leaders"
        ? `${ROUTES.admin.homePage}/leaders/${card.id}/edit`
        : `${ROUTES.admin.homePage}/developers/${card.id}/edit`;
    return (
      <div className="mx-auto w-full max-w-3xl">
        <ErrorState
          title="This card belongs to another group"
          description={`"${card.name}" is a ${TEAM_GROUP_LABELS[card.group]} card, but this form is fixed to ${TEAM_GROUP_LABELS[lockedGroup]}. Open the card's own edit page to change it.`}
        />
        <div className="mt-4 flex justify-center">
          <Button to={correctHref} variant="navy" size="sm">
            Edit as {TEAM_GROUP_LABELS[card.group]} card
          </Button>
        </div>
      </div>
    );
  }

  if (isEdit) {
    if (cardQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this card"
            description="The card may not exist anymore, or the API is unreachable. Head back to the list and try again."
            onRetry={() => void cardQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={context.returnTo} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              {context.backLabel}
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
    <AiAssistantProvider>
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit
              ? `Edit ${lockedGroup ? TEAM_GROUP_LABELS[lockedGroup].replace(/s$/, "") : "Team"} Card`
              : lockedGroup === "developers"
                ? "New Developer Card"
                : lockedGroup === "leaders"
                  ? "New Leader Card"
                  : "New Team Card"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this card — published cards appear on the site immediately; archived cards are hidden from every public surface."
              : lockedGroup
                ? `Add a card to the ${TEAM_GROUP_LABELS[lockedGroup]} group. Published cards appear on the site as soon as they are saved.`
                : "Add a card to the Leadership or Developers group. Published cards appear on the home page (and the About leadership strip) as soon as they are saved."}
          </p>
        </div>
      </div>

      <AiSourcePanel className="mt-6" />

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="team-basics" title="Basics" description="Which group the card belongs to, and the person's identity.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                id="team-group"
                label="Group"
                required
                error={errors.group?.message}
                hint={lockedGroup ? "Fixed by the page you came from." : "Where the card appears."}
              >
                <select
                  id="team-group"
                  aria-invalid={Boolean(errors.group)}
                  className={cn(INPUT_CLASS, lockedGroup && "cursor-not-allowed bg-surface text-muted")}
                  disabled={Boolean(lockedGroup)}
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
              ai={
                <AiFillButton
                  kind="excerpt"
                  label="Short description"
                  context="team card"
                  title={watch("name")}
                  apply={(result) => setValue("description", result.value ?? "", { shouldValidate: true })}
                />
              }
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
              <Field
                id="team-image-alt"
                label="Portrait alt text"
                error={errors.imageAlt?.message}
                ai={
                  <AiFillButton
                    kind="alt"
                    label="Portrait alt text"
                    context="team card portrait"
                    title={watch("name")}
                    apply={(result) => setValue("imageAlt", result.value ?? "", { shouldValidate: true })}
                  />
                }
              >
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
          <Button to={context.returnTo} variant="ghost" size="md" disabled={pending}>
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
    </AiAssistantProvider>
  );
}

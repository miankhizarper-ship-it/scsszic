import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Save, Trash2, UserPlus } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import { SlugField } from "@/components/admin/SlugField";
import {
  useAdminAlumnus,
  useCreateAlumnus,
  useUpdateAlumnus,
} from "@/hooks/admin";
import {
  ALUMNI_FIELDS,
  alumniFormDefaults,
  alumniFormSchema,
  initialsFromName,
  slugifyText,
  toAlumniFormValues,
  toAlumniPayload,
  type AlumniFormValues,
} from "@/lib/adminAlumniForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Alumni form (Phase 9E) — one reusable form for create AND edit
 * (/admin/alumni/new, /admin/alumni/:id/edit).
 *
 * Fields mirror the existing Alumnus model exactly (username, name, batch,
 * batchYear, role, company, achievement, field, initials, image, bio,
 * skills, careerHighlights, socials) — no invented fields, and no status
 * control because the model has no status lifecycle. Saved changes are
 * public immediately (every alumnus is public), which the header copy says
 * plainly. Double submissions are impossible while a mutation is pending.
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

export default function AdminAlumniFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const alumnusQuery = useAdminAlumnus(id);
  const createAlumnus = useCreateAlumnus();
  const updateAlumnus = useUpdateAlumnus(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AlumniFormValues>({
    resolver: zodResolver(alumniFormSchema),
    defaultValues: alumniFormDefaults(),
    mode: "onTouched",
  });

  const { fields: socialFields, append: appendSocial, remove: removeSocial } =
    useFieldArray({ control, name: "socials" });

  // Edit mode — hydrate the form once the real profile arrives.
  useEffect(() => {
    if (alumnusQuery.data) {
      reset(toAlumniFormValues(alumnusQuery.data));
    }
  }, [alumnusQuery.data, reset]);

  const name = useWatch({ control, name: "name" });
  const usernameValue = useWatch({ control, name: "username" });
  const initialsValue = useWatch({ control, name: "initials" });
  const usernameDirty = Boolean(usernameValue && usernameValue !== slugifyText(name ?? ""));
  const initialsDirty = Boolean(initialsValue && initialsValue !== initialsFromName(name ?? ""));

  const pending = isSubmitting || createAlumnus.isPending || updateAlumnus.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof AlumniFormValues, { type: "server", message });
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
        await updateAlumnus.mutateAsync(toAlumniPayload(values));
      } else {
        await createAlumnus.mutateAsync(toAlumniPayload(values));
      }
      navigate(ROUTES.admin.alumni);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (alumnusQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this profile"
            description="The alumni profile may not exist anymore, or the API is unreachable. Head back to the alumni list and try again."
            onRetry={() => void alumnusQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.alumni} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to alumni
            </Button>
          </div>
        </div>
      );
    }
    if (alumnusQuery.isPending || !alumnusQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading alumni profile…</p>
          <div className="h-9 w-56 animate-pulse rounded-lg border border-line bg-white" />
          <div className="mt-6 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-xl border border-line bg-white" />
            ))}
          </div>
        </div>
      );
    }
  }

  const alumnus = alumnusQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Alumni" : "Create Alumni"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this alumni profile — saved changes appear on the public alumni pages immediately."
              : "Add a new member of the alumni directory. The profile appears on the public alumni pages as soon as it is saved."}
          </p>
        </div>
        {isEdit && alumnus && (
          <a
            href={ROUTES.alumniDetail(alumnus.username)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public profile
          </a>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="alumni-basics" title="Basics" description="The profile's identity, batch, and professional field.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="alumni-name" label="Name" required error={errors.name?.message}>
                <input
                  id="alumni-name"
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  className={INPUT_CLASS}
                  {...register("name")}
                />
              </Field>
              <Field id="alumni-initials" label="Initials" required error={errors.initials?.message}
                hint={initialsDirty ? "Custom initials — shown on portrait tiles." : "Auto-matches the name (first two words)."}
              >
                <input
                  id="alumni-initials"
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
              id="alumni-username"
              label="Username (profile handle)"
              required
              error={errors.username?.message}
              hint={
                usernameDirty
                  ? "Custom handle — it becomes the public profile URL (/alumni/your-handle)."
                  : "URL handle for the public profile. Generate searches existing alumni first and picks a free variant."
              }
            >
              <SlugField
                id="alumni-username"
                value={usernameValue}
                onChange={(next) => setValue("username", next, { shouldValidate: true })}
                title={name ?? ""}
                slugify={slugifyText}
                section="alumni"
                excludeId={alumnus?.id}
                urlPrefix="/alumni/"
                inputClass={INPUT_CLASS}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="alumni-batch-year" label="Batch year" required error={errors.batchYear?.message}>
                <input
                  id="alumni-batch-year"
                  type="number"
                  min={1990}
                  max={2100}
                  aria-invalid={Boolean(errors.batchYear)}
                  className={INPUT_CLASS}
                  {...register("batchYear")}
                />
              </Field>
              <Field id="alumni-batch" label="Batch label" required error={errors.batch?.message} hint="Shown on cards, e.g. Batch 2022.">
                <input
                  id="alumni-batch"
                  type="text"
                  aria-invalid={Boolean(errors.batch)}
                  className={INPUT_CLASS}
                  {...register("batch")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="alumni-field" label="Professional field" required error={errors.field?.message}>
                <select
                  id="alumni-field"
                  aria-invalid={Boolean(errors.field)}
                  className={INPUT_CLASS}
                  {...register("field")}
                >
                  {ALUMNI_FIELDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="alumni-role" label="Current role" required error={errors.role?.message}>
                <input
                  id="alumni-role"
                  type="text"
                  aria-invalid={Boolean(errors.role)}
                  className={INPUT_CLASS}
                  {...register("role")}
                />
              </Field>
            </div>

            <Field id="alumni-company" label="Company / organization" required error={errors.company?.message}>
              <input
                id="alumni-company"
                type="text"
                aria-invalid={Boolean(errors.company)}
                className={INPUT_CLASS}
                {...register("company")}
              />
            </Field>

            <Field id="alumni-achievement" label="Achievement summary" required error={errors.achievement?.message} hint="Short card description shown on the directory listing.">
              <textarea
                id="alumni-achievement"
                rows={2}
                aria-invalid={Boolean(errors.achievement)}
                className={INPUT_CLASS}
                {...register("achievement")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Profile detail ---------- */}
        <Section id="alumni-detail" title="Profile detail" description="The bio, skills, and career highlights shown on the profile page.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="alumni-bio" label="Bio" error={errors.bio?.message}>
              <textarea
                id="alumni-bio"
                rows={4}
                aria-invalid={Boolean(errors.bio)}
                className={INPUT_CLASS}
                {...register("bio")}
              />
            </Field>

            <Field id="alumni-skills" label="Skills" error={errors.skills?.message} hint="Comma-separated, e.g. TypeScript, Node.js, AWS">
              <input
                id="alumni-skills"
                type="text"
                aria-invalid={Boolean(errors.skills)}
                className={INPUT_CLASS}
                {...register("skills")}
              />
            </Field>

            <Field id="alumni-highlights" label="Career highlights" error={errors.careerHighlights?.message} hint="One highlight per line.">
              <textarea
                id="alumni-highlights"
                rows={3}
                aria-invalid={Boolean(errors.careerHighlights)}
                className={INPUT_CLASS}
                {...register("careerHighlights")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Portrait & links ---------- */}
        <Section id="alumni-media" title="Portrait & links" description="Placeholder portrait reference and social profiles.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="alumni-image" label="Portrait path/URL" error={errors.image?.message} hint="Path or URL, e.g. /src/assets/people/….jpg — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="alumni-image"
                      type="text"
                      aria-invalid={Boolean(errors.image)}
                      className={INPUT_CLASS}
                      {...register("image")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="alumni"
                    accept="image/*"
                    onUploaded={(url) => setValue("image", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="alumni-image-alt" label="Portrait alt text" error={errors.imageAlt?.message}>
                <input
                  id="alumni-image-alt"
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
                <p className="mt-2 text-xs text-muted">No social links — the profile page simply hides its links row.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {socialFields.map((link, index) => (
                    <li
                      key={link.id}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[10rem_1fr_7rem_auto] sm:items-start"
                    >
                      <div>
                        <label htmlFor={`alumni-social-label-${index}`} className="sr-only">
                          Link label
                        </label>
                        <input
                          id={`alumni-social-label-${index}`}
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
                        <label htmlFor={`alumni-social-href-${index}`} className="sr-only">
                          Link URL
                        </label>
                        <input
                          id={`alumni-social-href-${index}`}
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
                        <label htmlFor={`alumni-social-icon-${index}`} className="sr-only">
                          Icon key
                        </label>
                        <select
                          id={`alumni-social-icon-${index}`}
                          aria-invalid={Boolean(errors.socials?.[index]?.icon)}
                          className={INPUT_CLASS}
                          {...register(`socials.${index}.icon` as const)}
                        >
                          {["linkedin", "github", "twitter", "globe", "mail"].map((icon) => (
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

        {/* ---------- Submit ---------- */}
        {formError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm font-medium text-error">
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-1 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <Button to={ROUTES.admin.alumni} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create alumni profile"}
          </Button>
        </div>
      </form>

      {isEdit && alumnus && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <UserPlus size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{alumnus.name}" — id {alumnus.id}. Profiles are public immediately after saving.
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Save, UserPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import { SlugField } from "@/components/admin/SlugField";
import {
  useAdminMember,
  useCreateMember,
  useUpdateMember,
} from "@/hooks/admin";
import {
  MEMBER_STATUSES,
  initialsFromName,
  memberFormDefaults,
  memberFormSchema,
  slugifyText,
  toMemberFormValues,
  toMemberPayload,
  type MemberFormValues,
} from "@/lib/adminMemberForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Member form (Phase 9E) — one reusable form for create AND edit
 * (/admin/members/new, /admin/members/:id/edit).
 *
 * Fields mirror the existing Member model exactly (username, name, initials,
 * avatar, role, company, batch, batchYear, department, domain, location,
 * bio, skills, interests, social map, projectSlugs, joinedAt, status,
 * featured) — no invented fields. Status uses the model's own directory
 * lifecycle; archived profiles stay private publicly (the header says so).
 * Project slugs cross-reference the existing projects showcase — the server
 * verifies existence and returns field-level errors. Double submissions are
 * impossible while a mutation is pending.
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

export default function AdminMemberFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const memberQuery = useAdminMember(id);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: memberFormDefaults(),
    mode: "onTouched",
  });

  // Edit mode — hydrate the form once the real member arrives.
  useEffect(() => {
    if (memberQuery.data) {
      reset(toMemberFormValues(memberQuery.data));
    }
  }, [memberQuery.data, reset]);

  const name = useWatch({ control, name: "name" });
  const usernameValue = useWatch({ control, name: "username" });
  const initialsValue = useWatch({ control, name: "initials" });
  const batchYear = useWatch({ control, name: "batchYear" });
  const batch = useWatch({ control, name: "batch" });
  const usernameDirty = Boolean(usernameValue && usernameValue !== slugifyText(name ?? ""));
  const initialsDirty = Boolean(initialsValue && initialsValue !== initialsFromName(name ?? ""));
  const batchDirty = Boolean(batch && batch !== `Batch ${batchYear}`);

  const pending = isSubmitting || createMember.isPending || updateMember.isPending;

  // Keep the display label in sync with the numeric year until manually edited.
  function handleBatchYearChange(nextYear: string) {
    const parsed = Number.parseInt(nextYear, 10);
    if (!Number.isNaN(parsed)) {
      const currentYear = Number(batchYear);
      if (!batch || batch === `Batch ${currentYear}`) {
        setValue("batch", `Batch ${parsed}`, { shouldValidate: false });
      }
    }
    setValue("batchYear", nextYear, { shouldValidate: true });
  }

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof MemberFormValues, { type: "server", message });
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
        await updateMember.mutateAsync(toMemberPayload(values));
      } else {
        await createMember.mutateAsync(toMemberPayload(values));
      }
      navigate(ROUTES.admin.members);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (memberQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this member"
            description="The member profile may not exist anymore, or the API is unreachable. Head back to the members list and try again."
            onRetry={() => void memberQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.members} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to members
            </Button>
          </div>
        </div>
      );
    }
    if (memberQuery.isPending || !memberQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading member profile…</p>
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

  const member = memberQuery.data;
  const isPublic = member ? member.status !== "archived" : true;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Member" : "Create Member"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this member profile — active and alumni-status profiles are public immediately; archived profiles stay private."
              : "Add a new member to the directory. The profile appears on the public members page as soon as it is saved (unless archived)."}
          </p>
        </div>
        {isEdit && member && isPublic && (
          <a
            href={ROUTES.profile(member.username)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public profile
          </a>
        )}
        {isEdit && member && !isPublic && (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3.5 text-xs font-medium text-muted">
            No public page — member is archived
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="member-basics" title="Basics" description="The member's identity, directory status, and role.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="member-name" label="Name" required error={errors.name?.message}>
                <input
                  id="member-name"
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  className={INPUT_CLASS}
                  {...register("name")}
                />
              </Field>
              <Field id="member-initials" label="Initials" required error={errors.initials?.message}
                hint={initialsDirty ? "Custom initials — shown on avatar tiles." : "Auto-matches the name (first two words)."}
              >
                <input
                  id="member-initials"
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
              id="member-username"
              label="Username (profile handle)"
              required
              error={errors.username?.message}
              hint={
                usernameDirty
                  ? "Custom handle — it becomes the public profile URL (/profile/your-handle)."
                  : "URL handle for the public profile. Generate searches existing members first and picks a free variant."
              }
            >
              <SlugField
                id="member-username"
                value={usernameValue}
                onChange={(next) => setValue("username", next, { shouldValidate: true })}
                title={name ?? ""}
                slugify={slugifyText}
                section="members"
                excludeId={member?.id}
                urlPrefix="/profile/"
                inputClass={INPUT_CLASS}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="member-role" label="Role" required error={errors.role?.message} hint='Society role for active members ("President"), job role for alumni.'>
                <input
                  id="member-role"
                  type="text"
                  aria-invalid={Boolean(errors.role)}
                  className={INPUT_CLASS}
                  {...register("role")}
                />
              </Field>
              <Field id="member-company" label="Company / organization" error={errors.company?.message} hint="Present on alumni-status members.">
                <input
                  id="member-company"
                  type="text"
                  aria-invalid={Boolean(errors.company)}
                  className={INPUT_CLASS}
                  {...register("company")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="member-batch-year" label="Batch year" required error={errors.batchYear?.message}>
                <input
                  id="member-batch-year"
                  type="number"
                  min={1990}
                  max={2100}
                  aria-invalid={Boolean(errors.batchYear)}
                  className={INPUT_CLASS}
                  onChange={(changeEvent) => handleBatchYearChange(changeEvent.target.value)}
                />
              </Field>
              <Field id="member-batch" label="Batch label" required error={errors.batch?.message} hint={batchDirty ? "Custom label." : "Auto-matches the batch year."}>
                <input
                  id="member-batch"
                  type="text"
                  aria-invalid={Boolean(errors.batch)}
                  className={INPUT_CLASS}
                  {...register("batch")}
                />
              </Field>
              <Field id="member-status" label="Status" required error={errors.status?.message} hint="Archived profiles stay private publicly.">
                <select
                  id="member-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {MEMBER_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="member-department" label="Department" error={errors.department?.message}>
                <input
                  id="member-department"
                  type="text"
                  aria-invalid={Boolean(errors.department)}
                  className={INPUT_CLASS}
                  {...register("department")}
                />
              </Field>
              <Field id="member-domain" label="Primary domain" required error={errors.domain?.message} hint="Directory filter dimension, e.g. Web Development.">
                <input
                  id="member-domain"
                  type="text"
                  aria-invalid={Boolean(errors.domain)}
                  className={INPUT_CLASS}
                  {...register("domain")}
                />
              </Field>
            </div>

            <div className="flex items-center pb-1">
              <label htmlFor="member-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  id="member-featured"
                  type="checkbox"
                  className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  {...register("featured")}
                />
                Featured member (highlighted on /members)
              </label>
            </div>
          </div>
        </Section>

        {/* ---------- Profile detail ---------- */}
        <Section id="member-detail" title="Profile detail" description="The bio, skills, and interests shown on the profile page.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="member-bio" label="Bio" required error={errors.bio?.message}>
              <textarea
                id="member-bio"
                rows={4}
                aria-invalid={Boolean(errors.bio)}
                className={INPUT_CLASS}
                {...register("bio")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="member-location" label="Location" error={errors.location?.message}>
                <input
                  id="member-location"
                  type="text"
                  aria-invalid={Boolean(errors.location)}
                  className={INPUT_CLASS}
                  {...register("location")}
                />
              </Field>
              <Field id="member-joined" label="Joined date" error={errors.joinedAt?.message} hint="ISO date the member joined, e.g. 2023-10-05.">
                <input
                  id="member-joined"
                  type="date"
                  aria-invalid={Boolean(errors.joinedAt)}
                  className={INPUT_CLASS}
                  {...register("joinedAt")}
                />
              </Field>
            </div>

            <Field id="member-skills" label="Skills" error={errors.skills?.message} hint="Comma-separated, e.g. React, TypeScript">
              <input
                id="member-skills"
                type="text"
                aria-invalid={Boolean(errors.skills)}
                className={INPUT_CLASS}
                {...register("skills")}
              />
            </Field>

            <Field id="member-interests" label="Interests" error={errors.interests?.message} hint="Comma-separated, e.g. EdTech, Mentoring">
              <input
                id="member-interests"
                type="text"
                aria-invalid={Boolean(errors.interests)}
                className={INPUT_CLASS}
                {...register("interests")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Avatar & references ---------- */}
        <Section id="member-media" title="Avatar & references" description="Avatar reference, social links, and project cross-references.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="member-avatar" label="Avatar path/URL" error={errors.avatar?.message} hint="Path or URL, e.g. /src/assets/people/….jpg — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="member-avatar"
                      type="text"
                      aria-invalid={Boolean(errors.avatar)}
                      className={INPUT_CLASS}
                      {...register("avatar")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="members"
                    accept="image/*"
                    onUploaded={(url) => setValue("avatar", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="member-avatar-alt" label="Avatar alt text" error={errors.avatarAlt?.message}>
                <input
                  id="member-avatar-alt"
                  type="text"
                  aria-invalid={Boolean(errors.avatarAlt)}
                  className={INPUT_CLASS}
                  {...register("avatarAlt")}
                />
              </Field>
            </div>

            <Field
              id="member-social"
              label="Social links"
              error={errors.socialText?.message}
              hint="One per line as platform: URL, e.g. github: https://github.com/username"
            >
              <textarea
                id="member-social"
                rows={3}
                aria-invalid={Boolean(errors.socialText)}
                className={INPUT_CLASS}
                {...register("socialText")}
              />
            </Field>

            <Field
              id="member-projects"
              label="Project slugs"
              error={errors.projectSlugsText?.message}
              hint="Comma-separated slugs from the projects showcase — the server verifies they exist."
            >
              <input
                id="member-projects"
                type="text"
                aria-invalid={Boolean(errors.projectSlugsText)}
                className={INPUT_CLASS}
                {...register("projectSlugsText")}
              />
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
          <Button to={ROUTES.admin.members} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create member profile"}
          </Button>
        </div>
      </form>

      {isEdit && member && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <UserPlus size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{member.name}" — id {member.id}. Archived profiles stay private publicly.
        </p>
      )}
    </div>
  );
}

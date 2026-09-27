import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FolderPlus, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import {
  useAdminProject,
  useCreateProject,
  useUpdateProject,
} from "@/hooks/admin";
import { useMembers, useEvents } from "@/hooks/content";
import {
  PROJECT_STATUSES,
  projectFormDefaults,
  projectFormSchema,
  slugifyText,
  toProjectFormValues,
  toProjectPayload,
  type ProjectFormValues,
} from "@/lib/adminProjectForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Project form (Phase 9F) — one reusable form for create AND edit
 * (/admin/projects/new, /admin/projects/:id/edit).
 *
 * Fields mirror the existing Project model exactly (title, slug, tagline,
 * description, cover, category, technologies, status, team roster, event
 * reference, dates, tags, repository/live links, featured) — no invented
 * fields. Reference selectors use REAL MongoDB data through the existing
 * public queries: the owner/team pickers list the member directory and the
 * event picker lists the events collection; the server re-verifies
 * existence before persistence. The status lifecycle is the model's own —
 * archived projects stay private publicly, which the header says plainly.
 * Double submissions are impossible while a mutation is pending.
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

export default function AdminProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const projectQuery = useAdminProject(id);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(id ?? "");

  // Real member directory (active + alumni — the same set the public
  // project pages resolve team rosters against).
  const { data: membersData } = useMembers({});
  const members = membersData?.data ?? [];

  // Real events collection (the origin-event picker's honest option list).
  const { data: eventsData } = useEvents({});
  const events = eventsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectFormDefaults(),
    mode: "onTouched",
  });

  // Edit mode — hydrate the form once the real project arrives.
  useEffect(() => {
    if (projectQuery.data) {
      reset(toProjectFormValues(projectQuery.data));
    }
  }, [projectQuery.data, reset]);

  const title = useWatch({ control, name: "title" });
  const slugValue = useWatch({ control, name: "slug" });
  const rosterText = useWatch({ control, name: "memberUsernamesText" });
  const slugDirty = Boolean(slugValue && slugValue !== slugifyText(title ?? ""));

  const pending = isSubmitting || createProject.isPending || updateProject.isPending;

  // Team checkbox state mirrors the roster text field (comma-separated).
  const roster = rosterText
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  function toggleTeamMember(username: string) {
    const next = roster.includes(username)
      ? roster.filter((entry) => entry !== username)
      : [...roster, username];
    setValue("memberUsernamesText", next.join(", "), { shouldValidate: true });
  }

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof ProjectFormValues, { type: "server", message });
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
        await updateProject.mutateAsync(toProjectPayload(values));
      } else {
        await createProject.mutateAsync(toProjectPayload(values));
      }
      navigate(ROUTES.admin.projects);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (projectQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this project"
            description="The project may not exist anymore, or the API is unreachable. Head back to the projects list and try again."
            onRetry={() => void projectQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.projects} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to projects
            </Button>
          </div>
        </div>
      );
    }
    if (projectQuery.isPending || !projectQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading project…</p>
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

  const project = projectQuery.data;
  const isPublic = project ? project.status !== "archived" : true;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Project" : "Create Project"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this project — active and completed builds are public immediately; archived builds stay private."
              : "Add a new build to the showcase. The project appears on the public projects page as soon as it is saved (unless archived)."}
          </p>
        </div>
        {isEdit && project && isPublic && (
          <a
            href={ROUTES.projectDetail(project.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public page
          </a>
        )}
        {isEdit && project && !isPublic && (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3.5 text-xs font-medium text-muted">
            No public page — project is archived
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="project-basics" title="Basics" description="The project's identity, pitch, and showcase state.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="project-title" label="Title" required error={errors.title?.message}>
              <input
                id="project-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <Field
              id="project-slug"
              label="Slug"
              required
              error={errors.slug?.message}
              hint={
                slugDirty
                  ? "Custom slug — it becomes the public page URL (/projects/your-slug)."
                  : "URL handle for the public page. Generate it from the title or set your own."
              }
            >
              <div className="flex gap-2">
                <input
                  id="project-slug"
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.slug)}
                  className={INPUT_CLASS}
                  {...register("slug")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto shrink-0"
                  onClick={() => setValue("slug", slugifyText(title ?? ""), { shouldValidate: true })}
                >
                  Generate
                </Button>
              </div>
            </Field>

            <Field id="project-tagline" label="Tagline" required error={errors.tagline?.message} hint="One-line pitch shown under the title.">
              <textarea
                id="project-tagline"
                rows={2}
                aria-invalid={Boolean(errors.tagline)}
                className={INPUT_CLASS}
                {...register("tagline")}
              />
            </Field>

            <Field id="project-description" label="Description" required error={errors.description?.message} hint="Long-form overview — paragraphs separated by blank lines.">
              <textarea
                id="project-description"
                rows={6}
                aria-invalid={Boolean(errors.description)}
                className={INPUT_CLASS}
                {...register("description")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="project-category" label="Category" required error={errors.category?.message} hint="Free label, e.g. Web, AI/ML.">
                <input
                  id="project-category"
                  type="text"
                  list="project-category-options"
                  aria-invalid={Boolean(errors.category)}
                  className={INPUT_CLASS}
                  {...register("category")}
                />
                <datalist id="project-category-options">
                  {["Web", "AI/ML", "Community", "Cybersecurity", "Developer Tools", "Education"].map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>
              <Field id="project-status" label="Status" required error={errors.status?.message} hint="Archived builds stay private publicly.">
                <select
                  id="project-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {PROJECT_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="project-started" label="Start date" required error={errors.startedAt?.message}>
                <input
                  id="project-started"
                  type="date"
                  aria-invalid={Boolean(errors.startedAt)}
                  className={INPUT_CLASS}
                  {...register("startedAt")}
                />
              </Field>
              <div className="flex items-end pb-2">
                <label htmlFor="project-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    id="project-featured"
                    type="checkbox"
                    className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    {...register("featured")}
                  />
                  Featured project
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Team & event ---------- */}
        <Section
          id="project-team"
          title="Team & event"
          description="Pick the owner and roster from the real member directory; optionally link the event where the project started."
        >
          <div className="grid grid-cols-1 gap-4">
            <Field id="project-owner" label="Owner" required error={errors.ownerUsername?.message} hint="Team lead — also added to the roster automatically.">
              <select
                id="project-owner"
                aria-invalid={Boolean(errors.ownerUsername)}
                className={INPUT_CLASS}
                {...register("ownerUsername")}
              >
                <option value="">— choose a member —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.username}>
                    {member.name} (@{member.username})
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="project-team"
              label="Team roster"
              required
              error={errors.memberUsernamesText?.message}
              hint="Tick every builder — the public profile pages list these projects back."
            >
              <fieldset className="rounded-lg border border-line bg-surface p-3">
                <legend className="sr-only">Team members (from the member directory)</legend>
                <input type="hidden" {...register("memberUsernamesText")} />
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      htmlFor={`project-team-${member.username}`}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-navy-50"
                    >
                      <input
                        id={`project-team-${member.username}`}
                        type="checkbox"
                        checked={roster.includes(member.username)}
                        onChange={() => toggleTeamMember(member.username)}
                        className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      />
                      <span className="min-w-0 truncate">
                        {member.name} <span className="text-muted">@{member.username}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </Field>

            <Field id="project-event" label="Origin event" error={errors.eventSlug?.message} hint="Optional — the event where the project started, if one exists.">
              <input
                id="project-event"
                type="text"
                list="project-event-options"
                aria-invalid={Boolean(errors.eventSlug)}
                className={INPUT_CLASS}
                {...register("eventSlug")}
              />
              <datalist id="project-event-options">
                {events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </datalist>
            </Field>
          </div>
        </Section>

        {/* ---------- Media & links ---------- */}
        <Section id="project-media" title="Media & links" description="Cover artwork, technologies, tags, and repository/demo links.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="project-cover" label="Cover image" required error={errors.coverImage?.message} hint="Path or URL, e.g. /src/assets/projects/….jpg — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="project-cover"
                      type="text"
                      aria-invalid={Boolean(errors.coverImage)}
                      className={INPUT_CLASS}
                      {...register("coverImage")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="projects"
                    accept="image/*"
                    onUploaded={(url) => setValue("coverImage", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="project-cover-alt" label="Cover image alt text" required error={errors.coverImageAlt?.message}>
                <input
                  id="project-cover-alt"
                  type="text"
                  aria-invalid={Boolean(errors.coverImageAlt)}
                  className={INPUT_CLASS}
                  {...register("coverImageAlt")}
                />
              </Field>
            </div>

            <Field id="project-technologies" label="Technologies" required error={errors.technologies?.message} hint="Comma-separated, e.g. React, TypeScript, Node.js">
              <input
                id="project-technologies"
                type="text"
                aria-invalid={Boolean(errors.technologies)}
                className={INPUT_CLASS}
                {...register("technologies")}
              />
            </Field>

            <Field id="project-tags" label="Tags" error={errors.tags?.message} hint="Comma-separated, e.g. Hackathon, Dashboard">
              <input
                id="project-tags"
                type="text"
                aria-invalid={Boolean(errors.tags)}
                className={INPUT_CLASS}
                {...register("tags")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="project-repo" label="Repository URL" error={errors.repositoryUrl?.message}>
                <input
                  id="project-repo"
                  type="text"
                  aria-invalid={Boolean(errors.repositoryUrl)}
                  className={INPUT_CLASS}
                  {...register("repositoryUrl")}
                />
              </Field>
              <Field id="project-live" label="Live demo URL" error={errors.liveUrl?.message}>
                <input
                  id="project-live"
                  type="text"
                  aria-invalid={Boolean(errors.liveUrl)}
                  className={INPUT_CLASS}
                  {...register("liveUrl")}
                />
              </Field>
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
          <Button to={ROUTES.admin.projects} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>

      {isEdit && project && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <FolderPlus size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{project.title}" — id {project.id}. Every save bumps the project's updatedAt revision date.
        </p>
      )}
    </div>
  );
}

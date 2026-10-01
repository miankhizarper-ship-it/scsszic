import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Newspaper, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import { TagsInput } from "@/components/admin/TagsInput";
import {
  AiAssistantProvider,
  AiFillButton,
  AiSourcePanel,
} from "@/components/admin/AiAssistant";
import {
  useAdminFeedPost,
  useCreateFeedPost,
  useUpdateFeedPost,
} from "@/hooks/admin";
import { useBlogs, useEvents, useMembers, useProjects } from "@/hooks/content";
import {
  FEED_STATUSES,
  FEED_TYPES,
  feedFormDefaults,
  feedFormSchema,
  toFeedFormValues,
  toFeedPayload,
  type FeedFormValues,
} from "@/lib/adminFeedForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Feed form (Phase 9F) — one reusable form for create AND edit
 * (/admin/feed/new, /admin/feed/:id/edit), built on the EXISTING FeedPost
 * model and its five post types (announcement/project/community/article/
 * event). The form changes with the selected type exactly as the model
 * does: project posts require a project reference, event posts an event,
 * article posts a blog — all picked from REAL MongoDB data through the
 * existing public queries, with the server re-verifying existence.
 * Authorship is a snapshot + username reference (the model's shape); the
 * picker prefills both and stays editable. Archived posts stay private
 * publicly. Double submissions are impossible while a mutation is pending.
 */

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

const TYPE_LABELS: Record<string, string> = {
  announcement: "Announcement",
  project: "Project update",
  event: "Event",
  article: "Article",
  community: "Community",
};

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

export default function AdminFeedFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const postQuery = useAdminFeedPost(id);
  const createFeedPost = useCreateFeedPost();
  const updateFeedPost = useUpdateFeedPost(id ?? "");

  // Real reference data for the selectors (the same sets the public feed
  // enrichment resolves against).
  const { data: membersData } = useMembers({});
  const members = membersData?.data ?? [];
  const { data: projectsData } = useProjects({});
  const projects = projectsData?.data ?? [];
  const { data: eventsData } = useEvents({});
  const events = eventsData?.data ?? [];
  const { data: blogsData } = useBlogs({});
  const blogs = blogsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FeedFormValues>({
    resolver: zodResolver(feedFormSchema),
    defaultValues: feedFormDefaults(),
    mode: "onTouched",
  });

  // Controlled array field (no attached input) — register it so RHF tracks
  // it: useWatch stays in sync on setValue and validation runs on submit.
  useEffect(() => {
    register("tags");
  }, [register]);

  // Edit mode — hydrate the form once the real post arrives.
  useEffect(() => {
    if (postQuery.data) {
      reset(toFeedFormValues(postQuery.data));
    }
  }, [postQuery.data, reset]);

  const type = useWatch({ control, name: "type" });
  const tagsValue = useWatch({ control, name: "tags" });

  const pending = isSubmitting || createFeedPost.isPending || updateFeedPost.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof FeedFormValues, { type: "server", message });
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
        await updateFeedPost.mutateAsync(toFeedPayload(values));
      } else {
        await createFeedPost.mutateAsync(toFeedPayload(values));
      }
      navigate(ROUTES.admin.feed);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (postQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this post"
            description="The post may not exist anymore, or the API is unreachable. Head back to the feed list and try again."
            onRetry={() => void postQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.feed} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to feed
            </Button>
          </div>
        </div>
      );
    }
    if (postQuery.isPending || !postQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading post…</p>
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

  const post = postQuery.data;

  return (
    <AiAssistantProvider>
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Post" : "Create Post"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this feed post — published posts appear on the public feed immediately; archived posts stay private."
              : "Write a community feed post. Published posts appear on the public feed as soon as they are saved."}
          </p>
        </div>
      </div>

      <AiSourcePanel className="mt-6" />

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="feed-basics" title="Basics" description="The post's type, title, and publication state.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="feed-type" label="Post type" required error={errors.type?.message}
                hint="The required reference below follows the type.">
                <select
                  id="feed-type"
                  aria-invalid={Boolean(errors.type)}
                  className={INPUT_CLASS}
                  {...register("type")}
                >
                  {FEED_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="feed-status" label="Status" required error={errors.status?.message} hint="Archived posts stay private publicly.">
                <select
                  id="feed-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {FEED_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              id="feed-title"
              label="Title"
              required
              error={errors.title?.message}
              ai={
                <AiFillButton
                  kind="title"
                  label="Title"
                  context="feed post"
                  apply={(result) => setValue("title", result.value ?? "", { shouldValidate: true })}
                />
              }
            >
              <input
                id="feed-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <p className="rounded-lg border border-dashed border-line bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-muted">
              <span className="font-semibold text-navy-900">Post handle:</span> generated
              automatically from the title when you save — duplicates get a numbered
              variant. Nothing to fill in.
            </p>

            <Field
              id="feed-excerpt"
              label="Excerpt"
              required
              error={errors.excerpt?.message}
              hint="Short card description shown on the feed."
              ai={
                <AiFillButton
                  kind="excerpt"
                  label="Excerpt"
                  context="feed post"
                  title={watch("title")}
                  apply={(result) => setValue("excerpt", result.value ?? "", { shouldValidate: true })}
                />
              }
            >
              <textarea
                id="feed-excerpt"
                rows={2}
                aria-invalid={Boolean(errors.excerpt)}
                className={INPUT_CLASS}
                {...register("excerpt")}
              />
            </Field>

            <Field
              id="feed-content"
              label="Content"
              error={errors.content?.message}
              hint="Full post body — paragraphs separated by blank lines."
              ai={
                <AiFillButton
                  kind="content"
                  label="Content"
                  context="feed post"
                  title={watch("title")}
                  apply={(result) => setValue("content", result.value ?? "", { shouldValidate: true })}
                />
              }
            >
              <textarea
                id="feed-content"
                rows={6}
                aria-invalid={Boolean(errors.content)}
                className={INPUT_CLASS}
                {...register("content")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Author ---------- */}
        <Section id="feed-author" title="Author" description="Pick a member to prefill the snapshot, or edit it freely — authors are snapshots in this model.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="feed-author-pick" label="Pick a member">
              <select
                id="feed-author-pick"
                className={INPUT_CLASS}
                defaultValue=""
                onChange={(changeEvent) => {
                  const picked = members.find((member) => member.username === changeEvent.target.value);
                  if (!picked) return;
                  setValue("authorUsername", picked.username, { shouldValidate: true });
                  setValue("authorName", picked.name, { shouldValidate: true });
                }}
              >
                <option value="">— choose an existing member —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.username}>
                    {member.name} (@{member.username})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="feed-author-username" label="Author username" error={errors.authorUsername?.message} hint="Member reference — the public card links their profile.">
                <input
                  id="feed-author-username"
                  type="text"
                  aria-invalid={Boolean(errors.authorUsername)}
                  className={INPUT_CLASS}
                  {...register("authorUsername")}
                />
              </Field>
              <Field id="feed-author-name" label="Author name" required error={errors.authorName?.message}>
                <input
                  id="feed-author-name"
                  type="text"
                  aria-invalid={Boolean(errors.authorName)}
                  className={INPUT_CLASS}
                  {...register("authorName")}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ---------- Related content ---------- */}
        <Section
          id="feed-related"
          title="Related content"
          description={
            type === "project"
              ? "Project updates reference the project they announce."
              : type === "event"
                ? "Event posts reference the event they promote."
                : type === "article"
                  ? "Article posts reference the blog article they highlight."
                  : "Optional cross-links — announcements and community posts may reference any related content."
          }
        >
          <div className="grid grid-cols-1 gap-4">
            {(type === "project" || type === "announcement" || type === "community") && (
              <Field
                id="feed-project"
                label={`Project${type === "project" ? "" : " (optional)"}`}
                required={type === "project"}
                error={errors.projectSlug?.message}
                hint="From the real projects showcase."
              >
                <select
                  id="feed-project"
                  aria-invalid={Boolean(errors.projectSlug)}
                  className={INPUT_CLASS}
                  {...register("projectSlug")}
                >
                  <option value="">— no linked project —</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.slug}>
                      {project.title} ({project.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {(type === "event" || type === "announcement" || type === "community") && (
              <Field
                id="feed-event"
                label={`Event${type === "event" ? "" : " (optional)"}`}
                required={type === "event"}
                error={errors.eventSlug?.message}
                hint="From the real events collection."
              >
                <select
                  id="feed-event"
                  aria-invalid={Boolean(errors.eventSlug)}
                  className={INPUT_CLASS}
                  {...register("eventSlug")}
                >
                  <option value="">— no linked event —</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.slug}>
                      {event.title} ({event.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {(type === "article" || type === "announcement" || type === "community") && (
              <Field
                id="feed-blog"
                label={`Blog article${type === "article" ? "" : " (optional)"}`}
                required={type === "article"}
                error={errors.blogSlug?.message}
                hint="From the real published articles."
              >
                <select
                  id="feed-blog"
                  aria-invalid={Boolean(errors.blogSlug)}
                  className={INPUT_CLASS}
                  {...register("blogSlug")}
                >
                  <option value="">— no linked article —</option>
                  {blogs.map((blog) => (
                    <option key={blog.id} value={blog.slug}>
                      {blog.title} ({blog.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </Section>

        {/* ---------- Media & metadata ---------- */}
        <Section id="feed-media" title="Media & metadata" description="Optional artwork, publication timestamp, tags, and seed engagement counts.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="feed-image" label="Image path/URL" error={errors.image?.message} hint="Path or URL — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="feed-image"
                      type="text"
                      aria-invalid={Boolean(errors.image)}
                      className={INPUT_CLASS}
                      {...register("image")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="feed"
                    accept="image/*"
                    onUploaded={(url) => setValue("image", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field
                id="feed-image-alt"
                label="Image alt text"
                error={errors.imageAlt?.message}
                ai={
                  <AiFillButton
                    kind="alt"
                    label="Image alt text"
                    context="feed post image"
                    title={watch("title")}
                    apply={(result) => setValue("imageAlt", result.value ?? "", { shouldValidate: true })}
                  />
                }
              >
                <input
                  id="feed-image-alt"
                  type="text"
                  aria-invalid={Boolean(errors.imageAlt)}
                  className={INPUT_CLASS}
                  {...register("imageAlt")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="feed-published" label="Published at" required error={errors.publishedAtLocal?.message} hint="Timestamp shown on the card.">
                <input
                  id="feed-published"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.publishedAtLocal)}
                  className={INPUT_CLASS}
                  {...register("publishedAtLocal")}
                />
              </Field>
              <Field id="feed-likes" label="Likes" error={errors.likes?.message} hint="Display-only seed count shown on the card.">
                <input
                  id="feed-likes"
                  type="number"
                  min={0}
                  aria-invalid={Boolean(errors.likes)}
                  className={INPUT_CLASS}
                  {...register("likes")}
                />
              </Field>
              <Field id="feed-comments" label="Comments" error={errors.comments?.message} hint="Display-only seed count shown on the card.">
                <input
                  id="feed-comments"
                  type="number"
                  min={0}
                  aria-invalid={Boolean(errors.comments)}
                  className={INPUT_CLASS}
                  {...register("comments")}
                />
              </Field>
            </div>

            <Field
              id="feed-tags"
              label="Tags"
              error={errors.tags?.message}
              ai={
                <AiFillButton
                  kind="tags"
                  label="Tags"
                  context="feed post"
                  title={watch("title")}
                  apply={(result) => setValue("tags", result.items ?? [], { shouldValidate: true })}
                />
              }
            >
              <TagsInput
                id="feed-tags"
                tags={tagsValue ?? []}
                onChange={(next) => setValue("tags", next, { shouldValidate: true })}
                ariaInvalid={Boolean(errors.tags)}
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
          <Button to={ROUTES.admin.feed} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : `Create ${TYPE_LABELS[type] ?? "post"} post`}
          </Button>
        </div>
      </form>

      {isEdit && post && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <Newspaper size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{post.title}" — id {post.id}. Archived posts stay private publicly.
        </p>
      )}
    </div>
    </AiAssistantProvider>
  );
}

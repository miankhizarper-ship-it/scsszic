import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Save, MonitorPlay } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import {
  useAdminVideo,
  useCreateVideo,
  useUpdateVideo,
} from "@/hooks/admin";
import { useEvents } from "@/hooks/content";
import {
  VIDEO_STATUSES,
  slugifyText,
  toVideoFormValues,
  toVideoPayload,
  videoFormDefaults,
  videoFormSchema,
  type VideoFormValues,
} from "@/lib/adminVideoForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Watch video form (Phase 9G) — one reusable form for create AND
 * edit (/admin/videos/new, /admin/videos/:id/edit).
 *
 * Fields mirror the existing WatchVideo model exactly (title, slug,
 * excerpt, description, thumbnail, videoUrl/embedUrl, duration, category,
 * speaker, event reference, publish date, status, tags, featured) — no
 * invented fields. The numeric durationMinutes is derived SERVER-side from
 * the editorial duration string; the client never sends it.
 *
 * Media/source fields (spec §7/§9): there is NO upload or transcoding —
 * thumbnail/videoUrl/embedUrl are references to EXISTING media (local
 * asset path or external URL), validated as such and labeled plainly.
 * There is deliberately no upload button, and admin previews reuse the
 * public page's existing VideoPlayer (no autoplay added). The event
 * reference is picked from the REAL events collection; the server
 * re-verifies existence. Double submissions are impossible while a
 * mutation is pending.
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

export default function AdminVideoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const videoQuery = useAdminVideo(id);
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo(id ?? "");

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
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: videoFormDefaults(),
    mode: "onTouched",
  });

  // Edit mode — hydrate the form once the real video arrives.
  useEffect(() => {
    if (videoQuery.data) {
      reset(toVideoFormValues(videoQuery.data));
    }
  }, [videoQuery.data, reset]);

  const title = useWatch({ control, name: "title" });
  const slugValue = useWatch({ control, name: "slug" });
  const slugDirty = Boolean(slugValue && slugValue !== slugifyText(title ?? ""));

  const pending = isSubmitting || createVideo.isPending || updateVideo.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof VideoFormValues, { type: "server", message });
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
        await updateVideo.mutateAsync(toVideoPayload(values));
      } else {
        await createVideo.mutateAsync(toVideoPayload(values));
      }
      navigate(ROUTES.admin.videos);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (videoQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this video"
            description="The video may not exist anymore, or the API is unreachable. Head back to the videos list and try again."
            onRetry={() => void videoQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.videos} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to videos
            </Button>
          </div>
        </div>
      );
    }
    if (videoQuery.isPending || !videoQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading video…</p>
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

  const video = videoQuery.data;
  const isPublic = video ? video.status === "published" : true;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Video" : "Create Video"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this video — published videos are public immediately; archived videos stay private."
              : "Add a new video to the Watch hub. It appears on the public Watch page as soon as it is saved (unless archived)."}
          </p>
        </div>
        {isEdit && video && isPublic && (
          <a
            href={ROUTES.videoDetail(video.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public page
          </a>
        )}
        {isEdit && video && !isPublic && (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3.5 text-xs font-medium text-muted">
            No public page — video is archived
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="video-basics" title="Basics" description="The video's identity, blurb, and publication state.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="video-title" label="Title" required error={errors.title?.message}>
              <input
                id="video-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <Field
              id="video-slug"
              label="Slug"
              required
              error={errors.slug?.message}
              hint={
                slugDirty
                  ? "Custom slug — it becomes the public page URL (/watch/your-slug)."
                  : "URL handle for the public page. Generate it from the title or set your own."
              }
            >
              <div className="flex gap-2">
                <input
                  id="video-slug"
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

            <Field id="video-excerpt" label="Excerpt" required error={errors.excerpt?.message} hint="Short card description shown on the Watch grid.">
              <textarea
                id="video-excerpt"
                rows={2}
                aria-invalid={Boolean(errors.excerpt)}
                className={INPUT_CLASS}
                {...register("excerpt")}
              />
            </Field>

            <Field id="video-description" label="Description" required error={errors.description?.message} hint="Long-form overview — paragraphs separated by blank lines.">
              <textarea
                id="video-description"
                rows={5}
                aria-invalid={Boolean(errors.description)}
                className={INPUT_CLASS}
                {...register("description")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="video-category" label="Category" required error={errors.category?.message} hint="Free label, e.g. Talks, Tutorials.">
                <input
                  id="video-category"
                  type="text"
                  list="video-category-options"
                  aria-invalid={Boolean(errors.category)}
                  className={INPUT_CLASS}
                  {...register("category")}
                />
                <datalist id="video-category-options">
                  {["Talks", "Tutorials", "Sessions", "Workshops", "Events", "Community"].map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>
              <Field id="video-status" label="Status" required error={errors.status?.message} hint="Archived videos stay private publicly.">
                <select
                  id="video-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {VIDEO_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="video-published" label="Release date" required error={errors.publishedAt?.message}>
                <input
                  id="video-published"
                  type="date"
                  aria-invalid={Boolean(errors.publishedAt)}
                  className={INPUT_CLASS}
                  {...register("publishedAt")}
                />
              </Field>
              <Field id="video-speaker" label="Speaker" error={errors.speaker?.message}>
                <input
                  id="video-speaker"
                  type="text"
                  aria-invalid={Boolean(errors.speaker)}
                  className={INPUT_CLASS}
                  {...register("speaker")}
                />
              </Field>
            </div>

            <Field id="video-event" label="Event" error={errors.eventSlug?.message} hint="Optional — link the society event this recording belongs to.">
              <input
                id="video-event"
                type="text"
                list="video-event-options"
                aria-invalid={Boolean(errors.eventSlug)}
                className={INPUT_CLASS}
                {...register("eventSlug")}
              />
              <datalist id="video-event-options">
                {events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </datalist>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="video-duration" label="Duration" required error={errors.duration?.message} hint='Editorial display string — "m:ss" or "h:mm:ss", e.g. 42:18.'>
                <input
                  id="video-duration"
                  type="text"
                  placeholder="42:18"
                  aria-invalid={Boolean(errors.duration)}
                  className={INPUT_CLASS}
                  {...register("duration")}
                />
              </Field>
              <Field id="video-tags" label="Tags" error={errors.tags?.message} hint="Comma-separated, e.g. AI, Workshop">
                <input
                  id="video-tags"
                  type="text"
                  aria-invalid={Boolean(errors.tags)}
                  className={INPUT_CLASS}
                  {...register("tags")}
                />
              </Field>
            </div>

            <div className="flex items-end pb-2">
              <label htmlFor="video-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  id="video-featured"
                  type="checkbox"
                  className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  {...register("featured")}
                />
                Featured video
              </label>
            </div>
          </div>
        </Section>

        {/* ---------- Media & source ---------- */}
        <Section
          id="video-media"
          title="Media & source"
          description="Existing media references or R2 uploads — direct clips play via the click-to-play player; embed URLs are unchanged."
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="video-thumbnail" label="Thumbnail reference" required error={errors.thumbnail?.message} hint="Path or URL of existing media, e.g. /src/assets/watch/….jpg — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="video-thumbnail"
                      type="text"
                      aria-invalid={Boolean(errors.thumbnail)}
                      className={INPUT_CLASS}
                      {...register("thumbnail")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="videos"
                    accept="image/*"
                    onUploaded={(url) => setValue("thumbnail", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="video-thumbnail-alt" label="Thumbnail alt text" required error={errors.thumbnailAlt?.message}>
                <input
                  id="video-thumbnail-alt"
                  type="text"
                  aria-invalid={Boolean(errors.thumbnailAlt)}
                  className={INPUT_CLASS}
                  {...register("thumbnailAlt")}
                />
              </Field>
            </div>

            <Field
              id="video-url"
              label="Direct video URL"
              error={errors.videoUrl?.message}
              hint="Optional — direct media file (path or URL, mp4/webm up to 4 MB). Used by the public player when present."
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    id="video-url"
                    type="text"
                    aria-invalid={Boolean(errors.videoUrl)}
                    className={INPUT_CLASS}
                    {...register("videoUrl")}
                  />
                </div>
                <UploadMediaButton
                  folder="videos"
                  accept="video/mp4,video/webm"
                  onUploaded={(url) => setValue("videoUrl", url, { shouldValidate: true })}
                />
              </div>
            </Field>

            <Field
              id="video-embed-url"
              label="Embed URL"
              error={errors.embedUrl?.message}
              hint="Optional — embeddable player URL (YouTube-nocookie style). Used when no direct video URL is set."
            >
              <input
                id="video-embed-url"
                type="text"
                aria-invalid={Boolean(errors.embedUrl)}
                className={INPUT_CLASS}
                {...register("embedUrl")}
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
          <Button to={ROUTES.admin.videos} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create video"}
          </Button>
        </div>
      </form>

      {isEdit && video && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <MonitorPlay size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{video.title}" — id {video.id}. The duration filter value is derived from the duration string on every save.
        </p>
      )}
    </div>
  );
}

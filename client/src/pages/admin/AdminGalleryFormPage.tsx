import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, ImagePlus, Images, Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import {
  useAdminAlbum,
  useCreateAlbum,
  useUpdateAlbum,
} from "@/hooks/admin";
import { useEvents } from "@/hooks/content";
import {
  GALLERY_STATUSES,
  galleryFormDefaults,
  galleryFormSchema,
  slugifyText,
  toGalleryFormValues,
  toGalleryPayload,
  type GalleryFormValues,
} from "@/lib/adminGalleryForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Gallery album form (Phase 9G) — one reusable form for create AND
 * edit (/admin/gallery/new, /admin/gallery/:id/edit).
 *
 * Fields mirror the existing GalleryAlbum model exactly (title, slug,
 * description, cover, category, event reference, capture date, location,
 * status, tags, featured, embedded photos) — no invented fields. The photo
 * editor is the model's own embedded-array surface: add a photo reference,
 * edit alt/caption, reorder with move up/down, remove — the array order IS
 * the public display order and is persisted on save (photoCount is
 * recomputed server-side).
 *
 * Media references (spec §7): there is NO upload infrastructure — photo
 * src and cover art are references to EXISTING media (local asset path or
 * URL), validated as such and labeled plainly. There is deliberately no
 * upload button. The event reference is picked from the REAL events
 * collection through the existing public query; the server re-verifies
 * existence. Double submissions are impossible while a mutation is pending.
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

/** Photo-row thumbnail — previews the existing media reference, degrades honestly. */
function PhotoPreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-surface text-muted"
        title={src ? "Preview unavailable — check the media path" : "No media reference yet"}
      >
        <ImagePlus size={16} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt ? `Preview: ${alt}` : ""}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-lg border border-line object-cover"
    />
  );
}

export default function AdminGalleryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const albumQuery = useAdminAlbum(id);
  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum(id ?? "");

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
  } = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: galleryFormDefaults(),
    mode: "onTouched",
  });

  // The embedded photo rows — add / reorder / remove operate on this array.
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "photos",
  });

  // Edit mode — hydrate the form once the real album arrives.
  useEffect(() => {
    if (albumQuery.data) {
      reset(toGalleryFormValues(albumQuery.data));
    }
  }, [albumQuery.data, reset]);

  const title = useWatch({ control, name: "title" });
  const slugValue = useWatch({ control, name: "slug" });
  // One top-level watch for the photo rows (never useWatch inside a loop —
  // the row count changes as photos are added/removed).
  const photosWatch = useWatch({ control, name: "photos" });
  const slugDirty = Boolean(slugValue && slugValue !== slugifyText(title ?? ""));

  const pending = isSubmitting || createAlbum.isPending || updateAlbum.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof GalleryFormValues, { type: "server", message });
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
        await updateAlbum.mutateAsync(toGalleryPayload(values));
      } else {
        await createAlbum.mutateAsync(toGalleryPayload(values));
      }
      navigate(ROUTES.admin.gallery);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (albumQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this album"
            description="The album may not exist anymore, or the API is unreachable. Head back to the gallery list and try again."
            onRetry={() => void albumQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.gallery} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to gallery
            </Button>
          </div>
        </div>
      );
    }
    if (albumQuery.isPending || !albumQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading album…</p>
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

  const album = albumQuery.data;
  const isPublic = album ? album.status === "published" : true;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Album" : "Create Album"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this album — published albums are public immediately; archived albums stay private."
              : "Add a new album to the gallery. It appears on the public gallery as soon as it is saved (unless archived)."}
          </p>
        </div>
        {isEdit && album && isPublic && (
          <a
            href={ROUTES.albumDetail(album.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public page
          </a>
        )}
        {isEdit && album && !isPublic && (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3.5 text-xs font-medium text-muted">
            No public page — album is archived
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="album-basics" title="Basics" description="The album's identity, story, and publication state.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="album-title" label="Title" required error={errors.title?.message}>
              <input
                id="album-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <Field
              id="album-slug"
              label="Slug"
              required
              error={errors.slug?.message}
              hint={
                slugDirty
                  ? "Custom slug — it becomes the public page URL (/gallery/your-slug)."
                  : "URL handle for the public page. Generate it from the title or set your own."
              }
            >
              <div className="flex gap-2">
                <input
                  id="album-slug"
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

            <Field id="album-description" label="Description" required error={errors.description?.message} hint="The album's story — shown on the public album page.">
              <textarea
                id="album-description"
                rows={4}
                aria-invalid={Boolean(errors.description)}
                className={INPUT_CLASS}
                {...register("description")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="album-category" label="Category" required error={errors.category?.message} hint="Free label, e.g. Workshops, Competitions.">
                <input
                  id="album-category"
                  type="text"
                  list="album-category-options"
                  aria-invalid={Boolean(errors.category)}
                  className={INPUT_CLASS}
                  {...register("category")}
                />
                <datalist id="album-category-options">
                  {["Competitions", "Workshops", "Seminars", "Community", "Sessions", "Ceremonies"].map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>
              <Field id="album-status" label="Status" required error={errors.status?.message} hint="Archived albums stay private publicly.">
                <select
                  id="album-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {GALLERY_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="album-date" label="Capture date" required error={errors.date?.message}>
                <input
                  id="album-date"
                  type="date"
                  aria-invalid={Boolean(errors.date)}
                  className={INPUT_CLASS}
                  {...register("date")}
                />
              </Field>
              <Field id="album-location" label="Location" error={errors.location?.message}>
                <input
                  id="album-location"
                  type="text"
                  aria-invalid={Boolean(errors.location)}
                  className={INPUT_CLASS}
                  {...register("location")}
                />
              </Field>
            </div>

            <Field id="album-event" label="Event" error={errors.eventSlug?.message} hint="Optional — link the society event this album documents.">
              <input
                id="album-event"
                type="text"
                list="album-event-options"
                aria-invalid={Boolean(errors.eventSlug)}
                className={INPUT_CLASS}
                {...register("eventSlug")}
              />
              <datalist id="album-event-options">
                {events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </datalist>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="album-tags" label="Tags" error={errors.tags?.message} hint="Comma-separated, e.g. Hackathon, 2026">
                <input
                  id="album-tags"
                  type="text"
                  aria-invalid={Boolean(errors.tags)}
                  className={INPUT_CLASS}
                  {...register("tags")}
                />
              </Field>
              <div className="flex items-end pb-2">
                <label htmlFor="album-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    id="album-featured"
                    type="checkbox"
                    className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    {...register("featured")}
                  />
                  Featured album
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Cover ---------- */}
        <Section
          id="album-cover"
          title="Cover"
          description="The album's card artwork on the gallery grid. Existing media reference — there is no upload pipeline yet."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="album-cover" label="Cover image reference" required error={errors.coverImage?.message} hint="Path or URL of existing media, e.g. /src/assets/media/gallery-lecture.jpg">
              <input
                id="album-cover"
                type="text"
                aria-invalid={Boolean(errors.coverImage)}
                className={INPUT_CLASS}
                {...register("coverImage")}
              />
            </Field>
            <Field id="album-cover-alt" label="Cover image alt text" required error={errors.coverImageAlt?.message}>
              <input
                id="album-cover-alt"
                type="text"
                aria-invalid={Boolean(errors.coverImageAlt)}
                className={INPUT_CLASS}
                {...register("coverImageAlt")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Photos (embedded, ordered) ---------- */}
        <Section
          id="album-photos"
          title="Photos"
          description="The album's embedded photo rows — the order here is the public display order. Add references to existing media, edit alt/caption, reorder, or remove."
        >
          <div className="flex flex-col gap-4">
            {fields.map((field, index) => {
              const rowError = errors.photos?.[index];
              return (
                <fieldset
                  key={field.id}
                  aria-label={`Photo ${index + 1} of ${fields.length}`}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <legend className="sr-only">Photo {index + 1}</legend>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {/* Row controls: move up / move down / remove */}
                    <div className="flex flex-row gap-1.5 sm:flex-col">
                      <button
                        type="button"
                        aria-label={`Move photo ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        className="grid size-8 place-items-center rounded-lg border border-line bg-white text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move photo ${index + 1} down`}
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                        className="grid size-8 place-items-center rounded-lg border border-line bg-white text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => remove(index)}
                        className="grid size-8 place-items-center rounded-lg border border-line bg-white text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <PhotoPreview
                          src={photosWatch?.[index]?.src ?? ""}
                          alt=""
                        />
                        <div className="grid min-w-0 flex-1 gap-3">
                          <Field
                            id={`album-photo-${index}-src`}
                            label={`Photo ${index + 1} media reference`}
                            required
                            error={rowError?.src?.message}
                            hint="Path or URL of existing media, e.g. /src/assets/gallery/photo-1.jpg"
                          >
                            <input
                              id={`album-photo-${index}-src`}
                              type="text"
                              autoComplete="off"
                              aria-invalid={Boolean(rowError?.src)}
                              className={INPUT_CLASS}
                              {...register(`photos.${index}.src` as const)}
                            />
                          </Field>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field
                              id={`album-photo-${index}-alt`}
                              label={`Photo ${index + 1} alt text`}
                              required
                              error={rowError?.alt?.message}
                            >
                              <input
                                id={`album-photo-${index}-alt`}
                                type="text"
                                aria-invalid={Boolean(rowError?.alt)}
                                className={INPUT_CLASS}
                                {...register(`photos.${index}.alt` as const)}
                              />
                            </Field>
                            <Field
                              id={`album-photo-${index}-caption`}
                              label={`Photo ${index + 1} caption`}
                              error={rowError?.caption?.message}
                              hint="Shown in the lightbox."
                            >
                              <input
                                id={`album-photo-${index}-caption`}
                                type="text"
                                aria-invalid={Boolean(rowError?.caption)}
                                className={INPUT_CLASS}
                                {...register(`photos.${index}.caption` as const)}
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              );
            })}

            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ src: "", alt: "", caption: "" })}
                disabled={fields.length >= 100}
              >
                <Plus size={14} aria-hidden="true" />
                Add photo reference
              </Button>
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
          <Button to={ROUTES.admin.gallery} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create album"}
          </Button>
        </div>
      </form>

      {isEdit && album && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <Images size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{album.title}" — id {album.id}. The photo count is recomputed from the photo rows on every save.
        </p>
      )}
    </div>
  );
}

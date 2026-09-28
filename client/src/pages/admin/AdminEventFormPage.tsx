import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, ExternalLink, Plus, Save, X } from "lucide-react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import { TagsInput } from "@/components/admin/TagsInput";
import { EventGalleryEditor } from "@/components/admin/EventGalleryEditor";
import { CategoryField } from "@/components/admin/CategoryField";
import { useAdminEvent, useCreateEvent, useUpdateEvent } from "@/hooks/admin";
import { eventFormSchema, type EventFormValues } from "@/lib/adminEventForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";
import type { SocietyEvent } from "@/types";

/**
 * Admin Event form (Phase 9C) — one reusable form for create AND edit
 * (/admin/events/new, /admin/events/:id/edit).
 *
 * Fields mirror the existing Event model exactly (SocietyEvent) — no
 * invented fields. Client validation uses the project's established stack
 * (React Hook Form + Zod via zodResolver); the server re-validates
 * authoritatively and its field errors map back onto the inputs. Double
 * submissions are impossible while a mutation is pending — the submit
 * button disables and react-hook-form holds isSubmitting for the whole
 * async submission.
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

/** Fetched event → form values (arrays become editable chip lists). */
function toFormValues(event: SocietyEvent): EventFormValues {
  return {
    title: event.title,
    category: event.category,
    status: event.status,
    featured: Boolean(event.featured),
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime ?? "",
    location: event.location,
    organizer: event.organizer ?? "",
    excerpt: event.excerpt,
    description: event.description,
    coverImage: event.coverImage,
    coverImageAlt: event.coverImageAlt,
    tags: event.tags ?? [],
    gallery: event.gallery ?? [],
    registrationEnabled: event.registration?.enabled ?? false,
    registrationLabel: event.registration?.label ?? "",
    registrationExternalUrl: event.registration?.externalUrl ?? "",
    registrationCapacity: event.registration?.capacity ? String(event.registration.capacity) : "",
    registrationNote: event.registration?.note ?? "",
    speakers: (event.speakers ?? []).map((speaker) => ({
      name: speaker.name,
      role: speaker.role,
      organization: speaker.organization,
      initials: speaker.initials,
      bio: speaker.bio ?? "",
    })),
    schedule: (event.schedule ?? []).map((item) => ({
      time: item.time,
      title: item.title,
      description: item.description ?? "",
    })),
  };
}

const CREATE_DEFAULTS: EventFormValues = {
  title: "",
  category: "Workshops",
  status: "upcoming",
  featured: false,
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  organizer: "",
  excerpt: "",
  description: "",
  coverImage: "",
  coverImageAlt: "",
  tags: [],
  gallery: [],
  registrationEnabled: false,
  registrationLabel: "",
  registrationExternalUrl: "",
  registrationCapacity: "",
  registrationNote: "",
  speakers: [],
  schedule: [],
};

/** Server field-error keys → form field paths (registration.* is flattened). */
function mapServerErrorKey(key: string): string {
  const registrationMatch = key.match(/^registration\.(.+)$/);
  if (registrationMatch) {
    const part = registrationMatch[1];
    const name = part === "enabled" ? "registrationEnabled" : `registration${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    return name;
  }
  return key;
}

export default function AdminEventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const eventQuery = useAdminEvent(id);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: CREATE_DEFAULTS,
    mode: "onTouched",
  });

  // Controlled array fields (no attached input) — register them so RHF
  // tracks them: useWatch stays in sync on setValue and validation runs.
  useEffect(() => {
    register("tags");
    register("gallery");
  }, [register]);

  const speakersArray = useFieldArray({ control, name: "speakers" });
  const scheduleArray = useFieldArray({ control, name: "schedule" });

  // Chip editors are controlled through watches — the form owns the arrays.
  const tagsValue = useWatch({ control, name: "tags" });
  const galleryValue = useWatch({ control, name: "gallery" });

  // Edit mode — hydrate the form once the real event arrives.
  useEffect(() => {
    if (eventQuery.data) {
      reset(toFormValues(eventQuery.data));
    }
  }, [eventQuery.data, reset]);

  const categoryValue = watch("category");
  const registrationEnabled = watch("registrationEnabled");

  const pending = isSubmitting || createEvent.isPending || updateEvent.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        const path = mapServerErrorKey(key);
        try {
          setError(path as keyof EventFormValues, { type: "server", message });
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

    const payload: Partial<SocietyEvent> = {
      title: values.title,
      excerpt: values.excerpt,
      description: values.description,
      category: values.category,
      status: values.status,
      featured: values.featured,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime || undefined,
      location: values.location,
      organizer: values.organizer || undefined,
      coverImage: values.coverImage,
      coverImageAlt: values.coverImageAlt,
      tags: values.tags,
      gallery: values.gallery,
      registration: {
        enabled: values.registrationEnabled,
        ...(values.registrationLabel ? { label: values.registrationLabel } : {}),
        ...(values.registrationExternalUrl ? { externalUrl: values.registrationExternalUrl } : {}),
        ...(values.registrationCapacity ? { capacity: Number(values.registrationCapacity) } : {}),
        ...(values.registrationNote ? { note: values.registrationNote } : {}),
      },
      speakers: values.speakers.map((speaker) => ({
        name: speaker.name,
        role: speaker.role,
        organization: speaker.organization,
        initials: speaker.initials,
        ...(speaker.bio ? { bio: speaker.bio } : {}),
      })),
      schedule: values.schedule.map((item) => ({
        time: item.time,
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
      })),
    };

    try {
      if (isEdit && id) {
        await updateEvent.mutateAsync(payload);
      } else {
        await createEvent.mutateAsync(payload);
      }
      navigate(ROUTES.admin.events);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (eventQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this event"
            description="The event may not exist anymore, or the API is unreachable. Head back to the events list and try again."
            onRetry={() => void eventQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.events} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to events
            </Button>
          </div>
        </div>
      );
    }
    if (eventQuery.isPending || !eventQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading event…</p>
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

  const event = eventQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Event" : "Create Event"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this event — changes go live on the public events page as soon as they are saved."
              : "Publish a new society event. Fields marked with an asterisk are required."}
          </p>
        </div>
        {isEdit && event && (
          <a
            href={`${ROUTES.events}/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public page
          </a>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="basics" title="Basics" description="The event's identity and lifecycle.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="event-title" label="Title" required error={errors.title?.message}>
              <input
                id="event-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "event-title-error" : undefined}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <p className="rounded-lg border border-dashed border-line bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-muted">
              <span className="font-semibold text-navy-900">Public URL:</span> generated
              automatically from the title when you save — duplicates get a numbered
              variant. Nothing to fill in.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="event-category" label="Category" required error={errors.category?.message}>
                <CategoryField
                  id="event-category"
                  section="events"
                  value={categoryValue}
                  onChange={(next) => setValue("category", next, { shouldValidate: true })}
                  error={errors.category?.message}
                  inputClass={INPUT_CLASS}
                />
              </Field>

              <Field id="event-status" label="Status" required error={errors.status?.message}>
                <select
                  id="event-status"
                  aria-invalid={Boolean(errors.status)}
                  aria-describedby={errors.status ? "event-status-error" : undefined}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {["upcoming", "ongoing", "completed", "cancelled"].map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label htmlFor="event-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                id="event-featured"
                type="checkbox"
                className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                {...register("featured")}
              />
              Featured event (highlighted on the public events page)
            </label>
          </div>
        </Section>

        {/* ---------- When & where ---------- */}
        <Section id="when" title="When & where" description="Schedule, venue, and organizer.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="event-date" label="Date" required error={errors.date?.message} className="sm:col-span-1">
              <input
                id="event-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "event-date-error" : undefined}
                className={INPUT_CLASS}
                {...register("date")}
              />
            </Field>
            <Field id="event-start" label="Start time" required error={errors.startTime?.message}>
              <input
                id="event-start"
                type="text"
                placeholder="10:00 AM"
                aria-invalid={Boolean(errors.startTime)}
                aria-describedby={errors.startTime ? "event-start-error" : undefined}
                className={INPUT_CLASS}
                {...register("startTime")}
              />
            </Field>
            <Field id="event-end" label="End time" error={errors.endTime?.message}>
              <input
                id="event-end"
                type="text"
                placeholder="1:00 PM"
                aria-invalid={Boolean(errors.endTime)}
                aria-describedby={errors.endTime ? "event-end-error" : undefined}
                className={INPUT_CLASS}
                {...register("endTime")}
              />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="event-location" label="Location" required error={errors.location?.message}>
              <input
                id="event-location"
                type="text"
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? "event-location-error" : undefined}
                className={INPUT_CLASS}
                {...register("location")}
              />
            </Field>
            <Field id="event-organizer" label="Organizer" error={errors.organizer?.message}>
              <input
                id="event-organizer"
                type="text"
                aria-invalid={Boolean(errors.organizer)}
                aria-describedby={errors.organizer ? "event-organizer-error" : undefined}
                className={INPUT_CLASS}
                {...register("organizer")}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Content & media ---------- */}
        <Section id="content" title="Content & media" description="What appears on the public detail page.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="event-excerpt" label="Excerpt" required error={errors.excerpt?.message} hint="Short card description shown on listings.">
              <textarea
                id="event-excerpt"
                rows={2}
                aria-invalid={Boolean(errors.excerpt)}
                aria-describedby={errors.excerpt ? "event-excerpt-error" : undefined}
                className={INPUT_CLASS}
                {...register("excerpt")}
              />
            </Field>

            <Field id="event-description" label="Description" required error={errors.description?.message}>
              <textarea
                id="event-description"
                rows={8}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "event-description-error" : undefined}
                className={INPUT_CLASS}
                {...register("description")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="event-cover" label="Cover image" required error={errors.coverImage?.message} hint="Path or URL, e.g. /src/assets/events/….jpg — or upload a file.">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      id="event-cover"
                      type="text"
                      aria-invalid={Boolean(errors.coverImage)}
                      aria-describedby={errors.coverImage ? "event-cover-error" : undefined}
                      className={INPUT_CLASS}
                      {...register("coverImage")}
                    />
                  </div>
                  <UploadMediaButton
                    folder="events"
                    accept="image/*"
                    onUploaded={(url) => setValue("coverImage", url, { shouldValidate: true })}
                  />
                </div>
              </Field>
              <Field id="event-cover-alt" label="Cover image alt text" required error={errors.coverImageAlt?.message}>
                <input
                  id="event-cover-alt"
                  type="text"
                  aria-invalid={Boolean(errors.coverImageAlt)}
                  aria-describedby={errors.coverImageAlt ? "event-cover-alt-error" : undefined}
                  className={INPUT_CLASS}
                  {...register("coverImageAlt")}
                />
              </Field>
            </div>

            <Field
              id="event-tags"
              label="Tags"
              error={errors.tags?.message}
            >
              <TagsInput
                id="event-tags"
                tags={tagsValue ?? []}
                onChange={(next) => setValue("tags", next, { shouldValidate: true })}
                ariaInvalid={Boolean(errors.tags)}
              />
            </Field>

            <Field
              id="event-gallery"
              label="Gallery images & videos"
              error={errors.gallery?.message}
              hint="Upload any number of images and clips, or paste paths/URLs. The first item becomes the large tile on the public page."
            >
              <EventGalleryEditor
                items={galleryValue ?? []}
                onChange={(next) => setValue("gallery", next, { shouldValidate: true })}
              />
            </Field>
          </div>
        </Section>

        {/* ---------- Registration ---------- */}
        <Section id="registration" title="Registration" description="Signup CTA state shown on the public page.">
          <label htmlFor="event-registration-enabled" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              id="event-registration-enabled"
              type="checkbox"
              className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              {...register("registrationEnabled")}
            />
            Registration open
          </label>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="event-registration-capacity"
              label="Capacity"
              error={errors.registrationCapacity?.message}
              hint="Seats available (whole number)."
            >
              <input
                id="event-registration-capacity"
                type="number"
                min={1}
                aria-invalid={Boolean(errors.registrationCapacity)}
                aria-describedby={errors.registrationCapacity ? "event-registration-capacity-error" : undefined}
                className={INPUT_CLASS}
                {...register("registrationCapacity")}
              />
            </Field>
            <Field id="event-registration-label" label="CTA label" error={errors.registrationLabel?.message} hint='Override, e.g. "Register now" or "Registration Closed".'>
              <input
                id="event-registration-label"
                type="text"
                aria-invalid={Boolean(errors.registrationLabel)}
                aria-describedby={errors.registrationLabel ? "event-registration-label-error" : undefined}
                className={INPUT_CLASS}
                {...register("registrationLabel")}
              />
            </Field>
            <Field id="event-registration-url" label="External registration URL" error={errors.registrationExternalUrl?.message}>
              <input
                id="event-registration-url"
                type="text"
                aria-invalid={Boolean(errors.registrationExternalUrl)}
                aria-describedby={errors.registrationExternalUrl ? "event-registration-url-error" : undefined}
                className={INPUT_CLASS}
                {...register("registrationExternalUrl")}
              />
            </Field>
            <Field id="event-registration-note" label="Note" error={errors.registrationNote?.message} hint="Short supporting line under the CTA.">
              <input
                id="event-registration-note"
                type="text"
                aria-invalid={Boolean(errors.registrationNote)}
                aria-describedby={errors.registrationNote ? "event-registration-note-error" : undefined}
                className={INPUT_CLASS}
                {...register("registrationNote")}
              />
            </Field>
          </div>
          {!registrationEnabled && (
            <p className="mt-3 text-xs text-muted">
              Registration is closed — the label (or a default "Registration Closed") is shown on the public page.
            </p>
          )}
        </Section>

        {/* ---------- Speakers ---------- */}
        <Section id="speakers" title="Speakers" description="People presenting at this event (optional).">
          {speakersArray.fields.length === 0 ? (
            <p className="text-sm text-muted">No speakers added yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {speakersArray.fields.map((field, index) => (
                <li key={field.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Speaker {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => speakersArray.remove(index)}
                      aria-label={`Remove speaker ${index + 1}`}
                      className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id={`speaker-${index}-name`} label="Name" required error={errors.speakers?.[index]?.name?.message}>
                      <input
                        id={`speaker-${index}-name`}
                        type="text"
                        aria-invalid={Boolean(errors.speakers?.[index]?.name)}
                        className={INPUT_CLASS}
                        {...register(`speakers.${index}.name` as const)}
                      />
                    </Field>
                    <Field id={`speaker-${index}-role`} label="Role" required error={errors.speakers?.[index]?.role?.message}>
                      <input
                        id={`speaker-${index}-role`}
                        type="text"
                        aria-invalid={Boolean(errors.speakers?.[index]?.role)}
                        className={INPUT_CLASS}
                        {...register(`speakers.${index}.role` as const)}
                      />
                    </Field>
                    <Field id={`speaker-${index}-org`} label="Organization" required error={errors.speakers?.[index]?.organization?.message}>
                      <input
                        id={`speaker-${index}-org`}
                        type="text"
                        aria-invalid={Boolean(errors.speakers?.[index]?.organization)}
                        className={INPUT_CLASS}
                        {...register(`speakers.${index}.organization` as const)}
                      />
                    </Field>
                    <Field id={`speaker-${index}-initials`} label="Initials" required error={errors.speakers?.[index]?.initials?.message}>
                      <input
                        id={`speaker-${index}-initials`}
                        type="text"
                        maxLength={4}
                        aria-invalid={Boolean(errors.speakers?.[index]?.initials)}
                        className={INPUT_CLASS}
                        {...register(`speakers.${index}.initials` as const)}
                      />
                    </Field>
                    <Field id={`speaker-${index}-bio`} label="Bio" error={errors.speakers?.[index]?.bio?.message} className="sm:col-span-2">
                      <textarea
                        id={`speaker-${index}-bio`}
                        rows={2}
                        aria-invalid={Boolean(errors.speakers?.[index]?.bio)}
                        className={INPUT_CLASS}
                        {...register(`speakers.${index}.bio` as const)}
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => speakersArray.append({ name: "", role: "", organization: "", initials: "", bio: "" })}
          >
            <Plus size={14} aria-hidden="true" />
            Add speaker
          </Button>
        </Section>

        {/* ---------- Schedule ---------- */}
        <Section id="schedule" title="Schedule" description="Timed agenda shown on the detail page (optional).">
          {scheduleArray.fields.length === 0 ? (
            <p className="text-sm text-muted">No schedule items added yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {scheduleArray.fields.map((field, index) => (
                <li key={field.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Item {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => scheduleArray.remove(index)}
                      aria-label={`Remove schedule item ${index + 1}`}
                      className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field id={`schedule-${index}-time`} label="Time" required error={errors.schedule?.[index]?.time?.message}>
                      <input
                        id={`schedule-${index}-time`}
                        type="text"
                        placeholder="10:00 AM"
                        aria-invalid={Boolean(errors.schedule?.[index]?.time)}
                        className={INPUT_CLASS}
                        {...register(`schedule.${index}.time` as const)}
                      />
                    </Field>
                    <Field id={`schedule-${index}-title`} label="Title" required error={errors.schedule?.[index]?.title?.message} className="sm:col-span-2">
                      <input
                        id={`schedule-${index}-title`}
                        type="text"
                        aria-invalid={Boolean(errors.schedule?.[index]?.title)}
                        className={INPUT_CLASS}
                        {...register(`schedule.${index}.title` as const)}
                      />
                    </Field>
                    <Field id={`schedule-${index}-description`} label="Description" error={errors.schedule?.[index]?.description?.message} className="sm:col-span-3">
                      <input
                        id={`schedule-${index}-description`}
                        type="text"
                        aria-invalid={Boolean(errors.schedule?.[index]?.description)}
                        className={INPUT_CLASS}
                        {...register(`schedule.${index}.description` as const)}
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => scheduleArray.append({ time: "", title: "", description: "" })}
          >
            <Plus size={14} aria-hidden="true" />
            Add schedule item
          </Button>
        </Section>

        {/* ---------- Submit ---------- */}
        {formError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm font-medium text-error">
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-1 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <Button to={ROUTES.admin.events} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
          </Button>
        </div>
      </form>

      {isEdit && event && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <CalendarPlus size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{event.title}" — id {event.id}. Saved changes appear on the public page immediately.
        </p>
      )}
    </div>
  );
}

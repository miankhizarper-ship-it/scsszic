import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FilePlus2, Save } from "lucide-react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { useAdminBlogs, useAdminBlog, useCreateBlog, useUpdateBlog } from "@/hooks/admin";
import {
  blogFormDefaults,
  blogFormSchema,
  slugifyText,
  toBlogFormValues,
  toBlogPayload,
  type BlogFormValues,
} from "@/lib/adminBlogForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";

/**
 * Admin Blog form (Phase 9D) — one reusable form for create AND edit
 * (/admin/blogs/new, /admin/blogs/:id/edit).
 *
 * Fields mirror the existing Blog model exactly (title, slug, excerpt,
 * structured content, cover, embedded author snapshot, category, tags,
 * publishedAt, readingTime, featured, status, seo) — no invented fields.
 * The structured content editor reuses the project's existing block schema;
 * the public renderer keeps rendering the result unchanged. The author
 * picker lists the real distinct contributors (admin facets) and can be
 * edited freely — authors are embedded snapshots in this model, so there
 * is no foreign-key lookup to break. Double submissions are impossible
 * while a mutation is pending.
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

/** Author snapshot fields, prefilled from the real contributor list. */
function AuthorFields({ control, register, errors, setValue }: {
  control: Control<BlogFormValues>;
  register: ReturnType<typeof useForm<BlogFormValues>>["register"];
  errors: ReturnType<typeof useForm<BlogFormValues>>["formState"]["errors"];
  setValue: ReturnType<typeof useForm<BlogFormValues>>["setValue"];
}) {
  const authorName = useWatch({ control, name: "authorName" });
  const authorId = useWatch({ control, name: "authorId" });
  const dirty = Boolean(authorId && authorId !== slugifyText(authorName ?? ""));

  // Distinct real authors from the admin facet (unfiltered distributions).
  const { data } = useAdminBlogs({ page: 1, pageSize: 1, search: "", sort: "published_desc" });
  const authors = data?.meta.facets.authors ?? [];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label htmlFor="blog-author-pick" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
          Pick a contributor
        </label>
        <select
          id="blog-author-pick"
          className={INPUT_CLASS}
          defaultValue=""
          onChange={(changeEvent) => {
            const picked = authors.find((author) => author.id === changeEvent.target.value);
            if (!picked) return;
            setValue("authorId", picked.id, { shouldValidate: true });
            setValue("authorName", picked.name, { shouldValidate: true });
          }}
        >
          <option value="">— choose an existing author —</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name} ({author.n} article{author.n === 1 ? "" : "s"})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Prefills the fields below. Authors are embedded snapshots — edit them freely.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="blog-author-id"
          label="Author id"
          required
          error={errors.authorId?.message}
          hint={dirty ? "Custom id — part of the author snapshot." : "Auto-matches the name (kebab-case)."}
        >
          <input
            id="blog-author-id"
            type="text"
            aria-invalid={Boolean(errors.authorId)}
            className={INPUT_CLASS}
            {...register("authorId")}
          />
        </Field>
        <Field id="blog-author-name" label="Author name" required error={errors.authorName?.message}>
          <input
            id="blog-author-name"
            type="text"
            aria-invalid={Boolean(errors.authorName)}
            className={INPUT_CLASS}
            {...register("authorName")}
          />
        </Field>
        <Field id="blog-author-role" label="Author role" required error={errors.authorRole?.message}>
          <input
            id="blog-author-role"
            type="text"
            aria-invalid={Boolean(errors.authorRole)}
            className={INPUT_CLASS}
            {...register("authorRole")}
          />
        </Field>
        <Field id="blog-author-initials" label="Author initials" required error={errors.authorInitials?.message}>
          <input
            id="blog-author-initials"
            type="text"
            maxLength={4}
            aria-invalid={Boolean(errors.authorInitials)}
            className={INPUT_CLASS}
            {...register("authorInitials")}
          />
        </Field>
        <Field id="blog-author-avatar" label="Avatar path/URL" error={errors.authorAvatar?.message}>
          <input
            id="blog-author-avatar"
            type="text"
            aria-invalid={Boolean(errors.authorAvatar)}
            className={INPUT_CLASS}
            {...register("authorAvatar")}
          />
        </Field>
        <Field id="blog-author-bio" label="Author bio" error={errors.authorBio?.message}>
          <input
            id="blog-author-bio"
            type="text"
            aria-invalid={Boolean(errors.authorBio)}
            className={INPUT_CLASS}
            {...register("authorBio")}
          />
        </Field>
      </div>
    </div>
  );
}

export default function AdminBlogFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const blogQuery = useAdminBlog(id);
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog(id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: blogFormDefaults(),
    mode: "onTouched",
  });

  // Edit mode — hydrate the form once the real blog arrives.
  useEffect(() => {
    if (blogQuery.data) {
      reset(toBlogFormValues(blogQuery.data));
    }
  }, [blogQuery.data, reset]);

  const title = useWatch({ control, name: "title" });
  const slugValue = useWatch({ control, name: "slug" });
  const status = useWatch({ control, name: "status" });
  const slugDirty = Boolean(slugValue && slugValue !== slugifyText(title ?? ""));

  const pending = isSubmitting || createBlog.isPending || updateBlog.isPending;

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.errors) {
      let mapped = false;
      for (const [key, message] of Object.entries(error.errors)) {
        try {
          setError(key as keyof BlogFormValues, { type: "server", message });
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
        await updateBlog.mutateAsync(toBlogPayload(values));
      } else {
        await createBlog.mutateAsync(toBlogPayload(values));
      }
      navigate(ROUTES.admin.blogs);
    } catch (error) {
      applyServerErrors(error);
    }
  });

  /* ------------------------------ states ------------------------------ */

  if (isEdit) {
    if (blogQuery.isError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <ErrorState
            title="Couldn't load this article"
            description="The article may not exist anymore, or the API is unreachable. Head back to the blogs list and try again."
            onRetry={() => void blogQuery.refetch()}
          />
          <div className="mt-4 flex justify-center">
            <Button to={ROUTES.admin.blogs} variant="outline" size="sm">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to blogs
            </Button>
          </div>
        </div>
      );
    }
    if (blogQuery.isPending || !blogQuery.data) {
      return (
        <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-3xl">
          <p className="sr-only">Loading article…</p>
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

  const blog = blogQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
            Administration
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            {isEdit ? "Edit Blog" : "Create Blog"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {isEdit
              ? "Update this article — published changes go live on the public blogs page as soon as they are saved; drafts stay private."
              : "Write a new article. It saves as a draft until you publish it — only published articles appear publicly."}
          </p>
        </div>
        {isEdit && blog && blog.status === "published" && (
          <a
            href={`${ROUTES.blogs}/${blog.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-navy-200 px-3.5 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public page
          </a>
        )}
        {isEdit && blog && blog.status !== "published" && (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3.5 text-xs font-medium text-muted">
            No public page — article is {blog.status}
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {/* ---------- Basics ---------- */}
        <Section id="basics" title="Basics" description="The article's identity, category, and publication state.">
          <div className="grid grid-cols-1 gap-4">
            <Field id="blog-title" label="Title" required error={errors.title?.message}>
              <input
                id="blog-title"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                className={INPUT_CLASS}
                {...register("title")}
              />
            </Field>

            <Field
              id="blog-slug"
              label="Slug"
              required
              error={errors.slug?.message}
              hint={
                slugDirty
                  ? "Custom slug — it becomes the public page URL (/blogs/your-slug)."
                  : "URL handle for the public page. Generate it from the title or set your own."
              }
            >
              <div className="flex gap-2">
                <input
                  id="blog-slug"
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

            <Field id="blog-excerpt" label="Excerpt" required error={errors.excerpt?.message} hint="Short card description shown on listings.">
              <textarea
                id="blog-excerpt"
                rows={2}
                aria-invalid={Boolean(errors.excerpt)}
                className={INPUT_CLASS}
                {...register("excerpt")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="blog-category" label="Category" required error={errors.category?.message} hint="Free label, e.g. Web Development.">
                <input
                  id="blog-category"
                  type="text"
                  list="blog-category-options"
                  aria-invalid={Boolean(errors.category)}
                  className={INPUT_CLASS}
                  {...register("category")}
                />
                <datalist id="blog-category-options">
                  {CATEGORY_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>

              <Field id="blog-status" label="Status" required error={errors.status?.message} hint="Only published articles appear publicly.">
                <select
                  id="blog-status"
                  aria-invalid={Boolean(errors.status)}
                  className={INPUT_CLASS}
                  {...register("status")}
                >
                  {["draft", "published", "archived"].map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="blog-published" label="Publication date" required error={errors.publishedAt?.message}>
                <input
                  id="blog-published"
                  type="date"
                  aria-invalid={Boolean(errors.publishedAt)}
                  className={INPUT_CLASS}
                  {...register("publishedAt")}
                />
              </Field>
              <Field id="blog-reading-time" label="Reading time (min)" required error={errors.readingTime?.message}>
                <input
                  id="blog-reading-time"
                  type="number"
                  min={1}
                  aria-invalid={Boolean(errors.readingTime)}
                  className={INPUT_CLASS}
                  {...register("readingTime")}
                />
              </Field>
              <div className="flex items-end pb-2">
                <label htmlFor="blog-featured" className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    id="blog-featured"
                    type="checkbox"
                    className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                    {...register("featured")}
                  />
                  Featured article
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Author ---------- */}
        <Section id="author" title="Author" description="The embedded author snapshot shown on the article.">
          <AuthorFields control={control} register={register} errors={errors} setValue={setValue} />
        </Section>

        {/* ---------- Content ---------- */}
        <Section
          id="content"
          title="Content"
          description="Structured blocks — add, edit, reorder, or remove them. The public page renders exactly these blocks."
        >
          <ContentBlockEditor control={control} register={register} errors={errors} />
        </Section>

        {/* ---------- Media & metadata ---------- */}
        <Section id="media" title="Media & metadata" description="Cover artwork, tags, and optional SEO fields.">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="blog-cover" label="Cover image" required error={errors.coverImage?.message} hint="Path or URL, e.g. /src/assets/blogs/….jpg">
                <input
                  id="blog-cover"
                  type="text"
                  aria-invalid={Boolean(errors.coverImage)}
                  className={INPUT_CLASS}
                  {...register("coverImage")}
                />
              </Field>
              <Field id="blog-cover-alt" label="Cover image alt text" required error={errors.coverImageAlt?.message}>
                <input
                  id="blog-cover-alt"
                  type="text"
                  aria-invalid={Boolean(errors.coverImageAlt)}
                  className={INPUT_CLASS}
                  {...register("coverImageAlt")}
                />
              </Field>
            </div>

            <Field id="blog-tags" label="Tags" error={errors.tags?.message} hint="Comma-separated, e.g. React, Design, CSS">
              <input
                id="blog-tags"
                type="text"
                aria-invalid={Boolean(errors.tags)}
                className={INPUT_CLASS}
                {...register("tags")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="blog-seo-title" label="SEO title" error={errors.seoTitle?.message}>
                <input
                  id="blog-seo-title"
                  type="text"
                  aria-invalid={Boolean(errors.seoTitle)}
                  className={INPUT_CLASS}
                  {...register("seoTitle")}
                />
              </Field>
              <Field id="blog-seo-description" label="SEO description" error={errors.seoDescription?.message}>
                <input
                  id="blog-seo-description"
                  type="text"
                  aria-invalid={Boolean(errors.seoDescription)}
                  className={INPUT_CLASS}
                  {...register("seoDescription")}
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
          <Button to={ROUTES.admin.blogs} variant="ghost" size="md" disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="navy" size="md" disabled={pending} aria-busy={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : isEdit ? "Save changes" : `Create ${status === "published" ? "published article" : "draft"}`}
          </Button>
        </div>
      </form>

      {isEdit && blog && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <FilePlus2 size={13} aria-hidden="true" className="text-gold-600" />
          Editing "{blog.title}" — id {blog.id}. Every save bumps the article's updatedAt revision date.
        </p>
      )}
    </div>
  );
}

/** Real categories from the seeded dataset — suggestions only, not an enum. */
const CATEGORY_SUGGESTIONS = [
  "AI & Machine Learning",
  "Career & Community",
  "Cybersecurity",
  "Data Science",
  "Open Source",
  "Software Engineering",
  "Web Development",
];

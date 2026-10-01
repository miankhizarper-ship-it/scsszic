import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Rss, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Container } from "@/components/ui/Container";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { TagsInput } from "@/components/admin/TagsInput";
import { useMyMemberProfile, useCreateMemberFeedPost } from "@/hooks/me";
import { useAuth } from "@/context/AuthProvider";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * MemberFeedFormPage (Task 29) — "Share a post" at /member/feed/new.
 *
 * The MEMBER self-service posting surface — deliberately OUTSIDE the admin
 * panel. The member supplies the content (title, excerpt, body, tags, an
 * optional image URL); the SERVER owns everything else: the author identity
 * comes from the linked member record, the type is always "community", the
 * post is published immediately, and the slug/timestamp are generated
 * server-side. Plain users hitting this URL get the MemberRoute upgrade
 * panel, and the API re-verifies the role + linkage on every call.
 */

const memberFeedSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be at most 200 characters."),
  excerpt: z
    .string()
    .trim()
    .min(1, "Excerpt is required.")
    .max(500, "Excerpt must be at most 500 characters."),
  content: z
    .string()
    .trim()
    .max(20_000, "The post body must be at most 20,000 characters.")
    .optional()
    .or(z.literal("")),
  image: z
    .string()
    .trim()
    .max(500, "Image URL must be at most 500 characters.")
    .regex(/^(https?:\/\/|\/)[^\s]*$/, "Use a valid image URL (https://…).")
    .optional()
    .or(z.literal("")),
  imageAlt: z
    .string()
    .trim()
    .max(200, "Image alt text must be at most 200 characters.")
    .optional()
    .or(z.literal("")),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(10, "At most 10 tags are allowed."),
});

type MemberFeedFormValues = z.infer<typeof memberFeedSchema>;

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

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

export default function MemberFeedFormPage() {
  usePageMetadata({
    title: buildPageTitle("Share a Post"),
    description: "Share an update with the Society of Computer Science community feed.",
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const profileQuery = useMyMemberProfile();
  const member = profileQuery.data;
  const createPost = useCreateMemberFeedPost();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFeedFormValues>({
    resolver: zodResolver(memberFeedSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      image: "",
      imageAlt: "",
      tags: [],
    },
  });

  const tags = watch("tags");
  const excerptValue = watch("excerpt");

  if (profileQuery.isError) {
    return (
      <Container className="py-16">
        <ErrorState
          title="Member profile not linked"
          description="Your account is not linked to a member record yet. Ask the society admin to add you to the members directory."
          onRetry={() => void profileQuery.refetch()}
        />
      </Container>
    );
  }

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createPost.mutateAsync({
        title: values.title,
        excerpt: values.excerpt,
        ...(values.content ? { content: values.content } : {}),
        ...(values.image ? { image: values.image } : {}),
        ...(values.imageAlt ? { imageAlt: values.imageAlt } : {}),
        tags: values.tags,
      });
      navigate(ROUTES.feed, { state: { posted: true } });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setFormError(error.message);
          return;
        }
        if (error.errors) {
          let hadFieldError = false;
          for (const [key, message] of Object.entries(error.errors)) {
            if (
              key === "title" ||
              key === "excerpt" ||
              key === "content" ||
              key === "image" ||
              key === "imageAlt" ||
              key === "tags"
            ) {
              setError(key as keyof MemberFeedFormValues, { type: "server", message });
              hadFieldError = true;
            }
          }
          if (!hadFieldError) setFormError(error.message);
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Couldn't share the post right now — please try again in a moment.");
    }
  });

  const initials = (user?.displayName ?? "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* ---------- Page hero ---------- */}
      <section aria-labelledby="member-feed-hero" className="relative overflow-hidden bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />
        <Container className="relative py-12 sm:py-14">
          <Link
            to={ROUTES.feed}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-gold-400"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to the feed
          </Link>
          <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            <Rss size={13} aria-hidden="true" />
            Member self-service
          </p>
          <h1
            id="member-feed-hero"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            Share a <span className="text-gold-400">community post</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Your post is published to the community feed immediately under your member profile.
            Admins can edit or archive posts from the CMS.
          </p>
        </Container>
      </section>

      <Container className="py-10 lg:py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6">
          {/* ---------- Posting-as identity strip ---------- */}
          <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <Avatar src={user?.picture} initials={initials} size={48} alt="" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Posting as</p>
              {profileQuery.isPending ? (
                <p className="mt-0.5 text-sm text-muted">Loading your member profile…</p>
              ) : member ? (
                <p className="mt-0.5 font-display text-sm font-bold text-navy-900">
                  {member.name}{" "}
                  <span className="font-mono font-medium text-muted">@{member.username}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted">{user?.displayName}</p>
              )}
            </div>
          </div>

          {/* ---------- Form ---------- */}
          <form
            onSubmit={(event) => {
              setFormError(null);
              void submit(event);
            }}
            noValidate
            className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-8"
          >
            <div className="flex flex-col gap-5">
              <Field id="member-feed-title" label="Title" required error={errors.title?.message}>
                <input
                  id="member-feed-title"
                  type="text"
                  maxLength={200}
                  placeholder="What do you want to share?"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "member-feed-title-error" : undefined}
                  className={INPUT_CLASS}
                  {...register("title")}
                />
              </Field>

              <Field
                id="member-feed-excerpt"
                label="Excerpt"
                required
                error={errors.excerpt?.message}
                hint={`${excerptValue?.length ?? 0}/500 — the one-liner shown on the feed card.`}
              >
                <textarea
                  id="member-feed-excerpt"
                  rows={2}
                  maxLength={500}
                  placeholder="A short summary for the feed card."
                  aria-invalid={Boolean(errors.excerpt)}
                  aria-describedby={errors.excerpt ? "member-feed-excerpt-error" : undefined}
                  className={INPUT_CLASS}
                  {...register("excerpt")}
                />
              </Field>

              <Field
                id="member-feed-content"
                label="Post body"
                error={errors.content?.message}
                hint="Optional — paragraphs separated by blank lines."
              >
                <textarea
                  id="member-feed-content"
                  rows={8}
                  placeholder="The full post body…"
                  aria-invalid={Boolean(errors.content)}
                  className={INPUT_CLASS}
                  {...register("content")}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  id="member-feed-image"
                  label="Image URL"
                  error={errors.image?.message}
                  hint="Optional cover artwork."
                >
                  <input
                    id="member-feed-image"
                    type="url"
                    placeholder="https://…"
                    aria-invalid={Boolean(errors.image)}
                    className={INPUT_CLASS}
                    {...register("image")}
                  />
                </Field>
                <Field
                  id="member-feed-image-alt"
                  label="Image alt text"
                  error={errors.imageAlt?.message}
                >
                  <input
                    id="member-feed-image-alt"
                    type="text"
                    maxLength={200}
                    placeholder="Describe the image for screen readers"
                    aria-invalid={Boolean(errors.imageAlt)}
                    className={INPUT_CLASS}
                    {...register("imageAlt")}
                  />
                </Field>
              </div>

              <Field
                id="member-feed-tags"
                label="Tags"
                error={errors.tags?.message}
                hint="Up to 10 — press Enter or comma after each tag."
              >
                <TagsInput
                  id="member-feed-tags"
                  tags={tags}
                  onChange={(next) => setValue("tags", next, { shouldValidate: true })}
                  placeholder="community, win, workshop…"
                  disabled={createPost.isPending || isSubmitting}
                  ariaInvalid={Boolean(errors.tags)}
                />
              </Field>

              {formError && (
                <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" to={ROUTES.feed} disabled={createPost.isPending || isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="navy" disabled={createPost.isPending || isSubmitting}>
                  {createPost.isPending || isSubmitting ? (
                    "Sharing…"
                  ) : (
                    <>
                      <Send size={15} aria-hidden="true" className="mr-1.5" />
                      Share post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* ---------- Posting guidelines ---------- */}
          <div className="rounded-xl border border-gold-500/30 bg-gold-50 p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
              <CheckCircle2 size={16} aria-hidden="true" className="text-gold-700" />
              Posting guidelines
            </h2>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-ink/80">
              <li>Posts go live immediately with your name and public profile attached — write for the whole community.</li>
              <li>You can share one post per minute; larger announcements may deserve a blog article instead (ask an admin).</li>
              <li>Be respectful. Admins can edit or archive posts that break the community rules.</li>
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}

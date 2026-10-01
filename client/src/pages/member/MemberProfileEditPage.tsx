import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Eye, Lock, Save, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Container } from "@/components/ui/Container";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/CollectionState";
import { TagsInput } from "@/components/admin/TagsInput";
import { useMyMemberProfile, useUpdateMyMemberProfile } from "@/hooks/me";
import { splitList } from "@/lib/adminMemberForm";
import { ApiError } from "@/services/apiClient";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * MemberProfileEditPage (Task 29) — "Edit public profile" at /member/profile.
 *
 * The MEMBER self-service editor for the PUBLIC community profile
 * (/profile/:username) — deliberately OUTSIDE the admin panel. Editable
 * fields mirror the server's memberSelfUpdateSchema exactly: about/bio,
 * skills, interests, social links, project references, avatar, location,
 * department. Identity/admin-owned fields (name, handle, role in society,
 * batch, directory status) are READ-ONLY here — the society admin owns
 * them, and the server rejects them with a strict schema regardless.
 */

const PROJECT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const memberProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(1, "Bio is required.")
    .max(4000, "Bio must be at most 4000 characters."),
  location: z
    .string()
    .trim()
    .max(120, "Location must be at most 120 characters.")
    .optional()
    .or(z.literal("")),
  department: z
    .string()
    .trim()
    .max(120, "Department must be at most 120 characters.")
    .optional()
    .or(z.literal("")),
  avatar: z
    .string()
    .trim()
    .max(500, "Avatar URL must be at most 500 characters.")
    .optional()
    .or(z.literal("")),
  avatarAlt: z
    .string()
    .trim()
    .max(200, "Avatar alt text must be at most 200 characters.")
    .optional()
    .or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(60)).max(30, "At most 30 skills."),
  interests: z.array(z.string().trim().min(1).max(60)).max(30, "At most 30 interests."),
  /** One platform per line: "github: https://github.com/…" — mirrors the
   *  admin form's editor and the server's ≤10 links / platform ≤40 /
   *  href ≤500 rules. */
  socialText: z
    .string()
    .max(2000, "Social links must be at most 2000 characters.")
    .superRefine((text, ctx) => {
      const entries = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const parsed: Array<readonly [string, string]> = [];
      for (const line of entries) {
        const separator = line.indexOf(":");
        if (separator <= 0) continue;
        const platform = line.slice(0, separator).trim();
        const href = line.slice(separator + 1).trim();
        if (!platform || !href) continue;
        parsed.push([platform, href] as const);
      }
      if (parsed.length > 10) {
        ctx.addIssue({ code: "custom", message: "At most 10 social links are allowed." });
      }
      for (const [platform, href] of parsed) {
        if (platform.length > 40) {
          ctx.addIssue({
            code: "custom",
            message: `Platform "${platform.slice(0, 40)}" must be at most 40 characters.`,
          });
        }
        if (href.length > 500) {
          ctx.addIssue({
            code: "custom",
            message: `The link for "${platform.slice(0, 40)}" must be at most 500 characters.`,
          });
        }
      }
    }),
  projectSlugsText: z
    .string()
    .max(1000, "Project slugs must be at most 1000 characters.")
    .superRefine((text, ctx) => {
      const slugs = splitList(text).map((slug) => slug.toLowerCase());
      if (slugs.length > 20) {
        ctx.addIssue({ code: "custom", message: "At most 20 project references are allowed." });
      }
      for (const slug of slugs) {
        if (!PROJECT_SLUG_PATTERN.test(slug)) {
          ctx.addIssue({
            code: "custom",
            message: `"${slug}" is not a valid project slug — use lowercase letters, numbers, and hyphens only.`,
          });
        }
      }
    }),
});

type MemberProfileFormValues = z.infer<typeof memberProfileSchema>;

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

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

/** A read-only identity row for the admin-owned panel. */
function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Lock size={12} aria-hidden="true" className="text-navy-400" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-navy-900">{value}</dd>
    </div>
  );
}

function parseSocialMap(text: string): Record<string, string> | undefined {
  const entries = (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator <= 0) return null;
      const platform = line.slice(0, separator).trim();
      const href = line.slice(separator + 1).trim();
      if (!platform || !href) return null;
      return [platform, href] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export default function MemberProfileEditPage() {
  usePageMetadata({
    title: buildPageTitle("Edit Public Profile"),
    description: "Edit your public community profile in the Society of Computer Science member directory.",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const profileQuery = useMyMemberProfile();
  const member = profileQuery.data;
  const updateProfile = useUpdateMyMemberProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MemberProfileFormValues>({
    resolver: zodResolver(memberProfileSchema),
    mode: "onSubmit",
    defaultValues: {
      bio: "",
      location: "",
      department: "",
      avatar: "",
      avatarAlt: "",
      skills: [],
      interests: [],
      socialText: "",
      projectSlugsText: "",
    },
  });

  // The query resolves AFTER mount — fold the fetched record into the form
  // exactly once (reset also clears the dirty state, so the save button
  // only lights up once there is something to change).
  useEffect(() => {
    if (!member) return;
    reset({
      bio: member.bio ?? "",
      location: member.location ?? "",
      department: member.department ?? "",
      avatar: member.avatar ?? "",
      avatarAlt: member.avatarAlt ?? "",
      skills: (member.skills ?? []).slice(),
      interests: (member.interests ?? []).slice(),
      socialText: Object.entries(member.social ?? {})
        .map(([platform, href]) => `${platform}: ${href}`)
        .join("\n"),
      projectSlugsText: (member.projectSlugs ?? []).join(", "),
    });
  }, [member, reset]);

  const skills = watch("skills");
  const interests = watch("interests");

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
    setSaved(false);
    try {
      await updateProfile.mutateAsync({
        bio: values.bio,
        ...(values.location ? { location: values.location } : {}),
        ...(values.department ? { department: values.department } : {}),
        ...(values.avatar ? { avatar: values.avatar } : {}),
        ...(values.avatarAlt ? { avatarAlt: values.avatarAlt } : {}),
        skills: values.skills,
        interests: values.interests,
        ...(parseSocialMap(values.socialText) ? { social: parseSocialMap(values.socialText) } : {}),
        ...(splitList(values.projectSlugsText).length > 0
          ? { projectSlugs: splitList(values.projectSlugsText).map((slug) => slug.toLowerCase()) }
          : {}),
      });
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          let hadFieldError = false;
          for (const [key, message] of Object.entries(error.errors)) {
            if (key === "bio") {
              setError("bio", { type: "server", message });
              hadFieldError = true;
            } else if (key === "skills") {
              setError("skills", { type: "server", message });
              hadFieldError = true;
            } else if (key === "interests") {
              setError("interests", { type: "server", message });
              hadFieldError = true;
            } else if (key === "social") {
              setError("socialText", { type: "server", message });
              hadFieldError = true;
            } else if (key === "projectSlugs") {
              setError("projectSlugsText", { type: "server", message });
              hadFieldError = true;
            } else if (key === "avatar") {
              setError("avatar", { type: "server", message });
              hadFieldError = true;
            }
          }
          if (!hadFieldError) setFormError(error.message);
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Couldn't save your profile right now — please try again in a moment.");
    }
  });

  return (
    <>
      {/* ---------- Page hero ---------- */}
      <section aria-labelledby="member-profile-hero" className="relative overflow-hidden bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />
        <Container className="relative py-12 sm:py-14">
          <Link
            to={ROUTES.account}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-gold-400"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to my account
          </Link>
          <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            <UserRound size={13} aria-hidden="true" />
            Member self-service
          </p>
          <h1
            id="member-profile-hero"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            Edit your <span className="text-gold-400">public profile</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            These fields appear on your public community profile for the whole campus to see.
            Your name, handle, and batch are managed by the society admin.
          </p>
        </Container>
      </section>

      <Container className="py-10 lg:py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* ---------- Editable form ---------- */}
          <form
            onSubmit={(event) => {
              setFormError(null);
              setSaved(false);
              void submit(event);
            }}
            noValidate
            className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-8"
          >
            {profileQuery.isPending ? (
              <p role="status" className="py-10 text-center text-sm text-muted">
                Loading your profile…
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <Field
                  id="member-profile-bio"
                  label="About / bio"
                  required
                  error={errors.bio?.message}
                  hint="Shown at the top of your public profile — what you do, what you're building."
                >
                  <textarea
                    id="member-profile-bio"
                    rows={5}
                    maxLength={4000}
                    aria-invalid={Boolean(errors.bio)}
                    aria-describedby={errors.bio ? "member-profile-bio-error" : undefined}
                    className={INPUT_CLASS}
                    {...register("bio")}
                  />
                </Field>

                <Field
                  id="member-profile-skills"
                  label="Skills"
                  error={errors.skills?.message}
                  hint="Up to 30 — press Enter or comma after each."
                >
                  <TagsInput
                    id="member-profile-skills"
                    tags={skills}
                    onChange={(next) => setValue("skills", next, { shouldValidate: true })}
                    placeholder="React, TypeScript, Design…"
                    disabled={updateProfile.isPending || isSubmitting}
                    ariaInvalid={Boolean(errors.skills)}
                  />
                </Field>

                <Field
                  id="member-profile-interests"
                  label="Interests"
                  error={errors.interests?.message}
                  hint="Up to 30 — press Enter or comma after each."
                >
                  <TagsInput
                    id="member-profile-interests"
                    tags={interests}
                    onChange={(next) => setValue("interests", next, { shouldValidate: true })}
                    placeholder="AI/ML, Hackathons, Open source…"
                    disabled={updateProfile.isPending || isSubmitting}
                    ariaInvalid={Boolean(errors.interests)}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="member-profile-location" label="Location" error={errors.location?.message}>
                    <input
                      id="member-profile-location"
                      type="text"
                      maxLength={120}
                      aria-invalid={Boolean(errors.location)}
                      className={INPUT_CLASS}
                      {...register("location")}
                    />
                  </Field>
                  <Field id="member-profile-department" label="Department" error={errors.department?.message}>
                    <input
                      id="member-profile-department"
                      type="text"
                      maxLength={120}
                      aria-invalid={Boolean(errors.department)}
                      className={INPUT_CLASS}
                      {...register("department")}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field
                    id="member-profile-avatar"
                    label="Avatar URL"
                    error={errors.avatar?.message}
                    hint="A square image works best."
                  >
                    <input
                      id="member-profile-avatar"
                      type="url"
                      placeholder="https://…"
                      aria-invalid={Boolean(errors.avatar)}
                      className={INPUT_CLASS}
                      {...register("avatar")}
                    />
                  </Field>
                  <Field id="member-profile-avatar-alt" label="Avatar alt text" error={errors.avatarAlt?.message}>
                    <input
                      id="member-profile-avatar-alt"
                      type="text"
                      maxLength={200}
                      aria-invalid={Boolean(errors.avatarAlt)}
                      className={INPUT_CLASS}
                      {...register("avatarAlt")}
                    />
                  </Field>
                </div>

                <Field
                  id="member-profile-social"
                  label="Social links"
                  error={errors.socialText?.message}
                  hint="One per line — platform: link (e.g. github: https://github.com/username). Up to 10."
                >
                  <textarea
                    id="member-profile-social"
                    rows={4}
                    aria-invalid={Boolean(errors.socialText)}
                    className={`${INPUT_CLASS} font-mono`}
                    {...register("socialText")}
                  />
                </Field>

                <Field
                  id="member-profile-projects"
                  label="Your projects"
                  error={errors.projectSlugsText?.message}
                  hint="Project slugs from the showcase, comma- or space-separated — your builds appear on your profile."
                >
                  <input
                    id="member-profile-projects"
                    type="text"
                    aria-invalid={Boolean(errors.projectSlugsText)}
                    className={`${INPUT_CLASS} font-mono`}
                    {...register("projectSlugsText")}
                  />
                </Field>

                {formError && (
                  <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
                    {formError}
                  </p>
                )}
                {saved && !formError && (
                  <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Profile saved — your public page is updated.
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
                  {saved && (
                    <span className="mr-auto hidden text-xs text-muted sm:inline">
                      Changes are live on your public profile.
                    </span>
                  )}
                  <Button type="submit" variant="navy" disabled={updateProfile.isPending || isSubmitting || !isDirty}>
                    {updateProfile.isPending || isSubmitting ? (
                      "Saving…"
                    ) : (
                      <>
                        <Save size={15} aria-hidden="true" className="mr-1.5" />
                        Save changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* ---------- Read-only identity panel ---------- */}
          <aside className="flex min-w-0 flex-col gap-6">
            {member && (
              <>
                <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar
                      src={member.avatar}
                      alt={member.avatarAlt}
                      initials={member.initials}
                      size={72}
                    />
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-navy-900">{member.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">@{member.username}</p>
                    </div>
                    <Badge variant="solidGold">{member.role}</Badge>
                  </div>
                  <dl className="mt-4 divide-y divide-line border-t border-line">
                    <LockedRow label="Batch" value={member.batch} />
                    <LockedRow label="Domain" value={member.domain} />
                    <LockedRow label="Status" value={member.status} />
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Locked fields are managed by the society admin — contact the team to change
                    them.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                  <h2 className="font-display text-sm font-bold text-navy-900">See it live</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    Your public community profile is at /profile/{member.username}.
                  </p>
                  <Button to={ROUTES.profile(member.username)} variant="outline" size="sm" className="mt-3 w-full justify-center">
                    <Eye size={14} aria-hidden="true" className="mr-1.5" />
                    View public profile
                    <ExternalLink size={12} aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}

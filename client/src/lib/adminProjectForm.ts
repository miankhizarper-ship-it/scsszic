import { z } from "zod";

import type { Project } from "@/types";

/**
 * Client-side form schema for the admin Project form (Phase 9F).
 *
 * Mirrors server/src/http/projectSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative (including reference
 * existence for the team roster and event link). Team members and the
 * event reference are selected from REAL MongoDB data via the existing
 * public queries. No new fields: the model's own lifecycle
 * (active/completed/archived) is the only status dimension.
 */

export const PROJECT_STATUSES = ["active", "completed", "archived"] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

export const projectFormSchema = z.object({
  title: requiredText("Title", 200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required.")
    .max(80, "Slug must be at most 80 characters.")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only."),
  tagline: requiredText("Tagline", 300),
  description: requiredText("Description", 20000),
  coverImage: requiredText("Cover image", 500),
  coverImageAlt: requiredText("Cover image alt text", 200),
  category: requiredText("Category", 60),
  technologies: z
    .string()
    .trim()
    .min(1, "Add at least one technology.")
    .max(1200, "Technologies must be at most 1200 characters."),
  status: z.enum(PROJECT_STATUSES, { message: "Choose a valid status." }),
  ownerUsername: requiredText("Owner", 80),
  /** Team roster as comma-separated usernames (model's username references). */
  memberUsernamesText: z
    .string()
    .trim()
    .min(1, "Add at least one team member.")
    .max(1500, "Team roster must be at most 1500 characters."),
  eventSlug: optionalText("Event", 80),
  startedAt: z
    .string()
    .trim()
    .min(1, "Start date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)."),
  tags: z
    .string()
    .trim()
    .max(400, "Tags must be at most 400 characters.")
    .optional()
    .or(z.literal("")),
  repositoryUrl: optionalText("Repository URL", 500),
  liveUrl: optionalText("Live demo URL", 500),
  featured: z.boolean(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/** "Campus Connect" → "campus-connect" (same slugify as blogs/events). */
export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Fetched project → form values (roster becomes an editable text field). */
export function toProjectFormValues(project: Project): ProjectFormValues {
  return {
    title: project.title,
    slug: project.slug,
    tagline: project.tagline,
    description: project.description,
    coverImage: project.coverImage,
    coverImageAlt: project.coverImageAlt,
    category: project.category,
    technologies: (project.technologies ?? []).join(", "),
    status: project.status,
    ownerUsername: project.ownerUsername,
    memberUsernamesText: (project.memberUsernames ?? []).join(", "),
    eventSlug: project.eventSlug ?? "",
    startedAt: project.startedAt,
    tags: (project.tags ?? []).join(", "),
    repositoryUrl: project.repositoryUrl ?? "",
    liveUrl: project.liveUrl ?? "",
    featured: Boolean(project.featured),
  };
}

/** Create defaults — status active, today's date. */
export function projectFormDefaults(): ProjectFormValues {
  return {
    title: "",
    slug: "",
    tagline: "",
    description: "",
    coverImage: "",
    coverImageAlt: "",
    category: "",
    technologies: "",
    status: "active",
    ownerUsername: "",
    memberUsernamesText: "",
    eventSlug: "",
    startedAt: new Date().toISOString().slice(0, 10),
    tags: "",
    repositoryUrl: "",
    liveUrl: "",
    featured: false,
  };
}

/** Form values → API payload (exact Project model shape). */
export function toProjectPayload(values: ProjectFormValues): Partial<Project> {
  const splitList = (text: string | undefined) =>
    (text ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const technologies = splitList(values.technologies);
  const tags = splitList(values.tags);
  // The owner always sits on the roster too (the seed data's convention).
  const roster = splitList(values.memberUsernamesText);
  const memberUsernames = roster.includes(values.ownerUsername)
    ? roster
    : [values.ownerUsername, ...roster];

  return {
    title: values.title,
    slug: values.slug,
    tagline: values.tagline,
    description: values.description,
    coverImage: values.coverImage,
    coverImageAlt: values.coverImageAlt,
    category: values.category,
    technologies,
    status: values.status,
    ownerUsername: values.ownerUsername,
    memberUsernames,
    ...(values.eventSlug ? { eventSlug: values.eventSlug } : {}),
    startedAt: values.startedAt,
    tags,
    ...(values.repositoryUrl ? { repositoryUrl: values.repositoryUrl } : {}),
    ...(values.liveUrl ? { liveUrl: values.liveUrl } : {}),
    featured: values.featured,
  };
}

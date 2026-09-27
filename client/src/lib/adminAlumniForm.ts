import { z } from "zod";

import type { AlumnusWrite } from "@/types";

/**
 * Client-side form schema for the admin Alumni form (Phase 9E).
 *
 * Mirrors server/src/http/alumniSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative. Social links use a
 * flat editable array (label/href/icon) matching the model's serialized
 * socials; the icon stays a registry KEY (resolved client-side exactly like
 * the seed data does). No new fields: the alumni model has no status
 * lifecycle, so the form has no status control either.
 *
 * The admin write shape (AlumnusWrite, defined with the other admin API
 * types) equals the API document shape — social icon keys stay strings; the
 * public alumni service resolves them to Lucide components at its boundary.
 */

export const ALUMNI_FIELDS = [
  "Software Engineering",
  "AI/ML",
  "Data Science",
  "Cybersecurity",
  "Web Development",
  "Research",
  "Entrepreneurship",
] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

export const alumniFormSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Username is required.")
    .max(80, "Username must be at most 80 characters.")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens only."),
  name: requiredText("Name", 120),
  batch: requiredText("Batch label", 40),
  /** String in the form (native number input), converted on submit. */
  batchYear: z
    .string()
    .trim()
    .min(1, "Batch year is required.")
    .regex(/^\d{4}$/, "Use a valid batch year (YYYY).")
    .refine((value) => {
      const year = Number(value);
      return year >= 1990 && year <= 2100;
    }, "Batch year must be between 1990 and 2100."),
  role: requiredText("Role", 120),
  company: requiredText("Company", 120),
  achievement: requiredText("Achievement summary", 500),
  field: z.enum(ALUMNI_FIELDS, { message: "Choose a professional field." }),
  initials: z
    .string()
    .trim()
    .min(1, "Initials are required.")
    .max(4, "Initials must be at most 4 characters."),
  image: optionalText("Portrait path/URL", 500),
  imageAlt: optionalText("Portrait alt text", 200),
  bio: optionalText("Bio", 4000),
  skills: z
    .string()
    .trim()
    .max(1200, "Skills must be at most 1200 characters.")
    .optional()
    .or(z.literal("")),
  careerHighlights: z
    .string()
    .trim()
    .max(3000, "Highlights must be at most 3000 characters.")
    .optional()
    .or(z.literal("")),
  socials: z.array(
    z.object({
      label: requiredText("Link label", 80),
      href: requiredText("Link URL", 500),
      icon: requiredText("Icon key", 40),
    }),
  ),
});

export type AlumniFormValues = z.infer<typeof alumniFormSchema>;

/** "Kamran Yousafzai" → "kamran-yousafzai" (same slugify as blogs/events). */
export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** "Kamran Yousafzai" → "KY" — up to the first two words' initials. */
export function initialsFromName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Fetched alumnus → form values (arrays become editable text areas). */
export function toAlumniFormValues(alumnus: AlumnusWrite): AlumniFormValues {
  return {
    username: alumnus.username,
    name: alumnus.name,
    batch: alumnus.batch,
    batchYear: String(alumnus.batchYear),
    role: alumnus.role,
    company: alumnus.company,
    achievement: alumnus.achievement,
    field: alumnus.field,
    initials: alumnus.initials,
    image: alumnus.image ?? "",
    imageAlt: alumnus.imageAlt ?? "",
    bio: alumnus.bio ?? "",
    skills: (alumnus.skills ?? []).join(", "),
    careerHighlights: (alumnus.careerHighlights ?? []).join("\n"),
    socials: (alumnus.socials ?? []).map((link) => ({
      label: link.label,
      href: link.href,
      icon: link.icon,
    })),
  };
}

/** Create defaults — one empty social row so the pattern is visible. */
export function alumniFormDefaults(): AlumniFormValues {
  return {
    username: "",
    name: "",
    batch: "",
    batchYear: String(new Date().getFullYear()),
    role: "",
    company: "",
    achievement: "",
    field: "Software Engineering",
    initials: "",
    image: "",
    imageAlt: "",
    bio: "",
    skills: "",
    careerHighlights: "",
    socials: [],
  };
}

/** Form values → API payload (exact Alumnus model shape). */
export function toAlumniPayload(values: AlumniFormValues): Partial<AlumnusWrite> {
  const splitSkills = (values.skills ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const highlights = (values.careerHighlights ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const socials = values.socials
    .map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
      icon: link.icon.trim(),
    }))
    .filter((link) => link.label && link.href && link.icon);

  return {
    username: values.username,
    name: values.name,
    batch: values.batch,
    batchYear: Number(values.batchYear),
    role: values.role,
    company: values.company,
    achievement: values.achievement,
    field: values.field,
    initials: values.initials,
    ...(values.image ? { image: values.image } : {}),
    ...(values.imageAlt ? { imageAlt: values.imageAlt } : {}),
    ...(values.bio ? { bio: values.bio } : {}),
    ...(splitSkills.length > 0 ? { skills: splitSkills } : {}),
    ...(highlights.length > 0 ? { careerHighlights: highlights } : {}),
    ...(socials.length > 0 ? { socials } : {}),
  };
}

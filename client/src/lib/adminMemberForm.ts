import { z } from "zod";

import type { Member } from "@/types";

/**
 * Client-side form schema for the admin Member form (Phase 9E).
 *
 * Mirrors server/src/http/memberSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative. Status uses the
 * model's own directory lifecycle (active/alumni/archived — archived
 * members stay private publicly); social links use the model's
 * platform-key → href map shape; projectSlugs reference the existing
 * projects showcase (existence is verified by the server). No new fields.
 */
export const MEMBER_STATUSES = ["active", "alumni", "archived"] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

/** Comma-separated list text — mirrors the server's per-entry rules (≤60
 *  chars each, ≤maxEntries entries) so a rejection can never come as a
 *  surprise 400: what fails here is exactly what the server would refuse. */
const listText = (label: string, maxEntries: number) =>
  z
    .string()
    .trim()
    .max(1200, `${label} must be at most 1200 characters.`)
    .refine(
      (text) => splitList(text).length <= maxEntries,
      `${label}: at most ${maxEntries} entries are allowed.`,
    )
    .refine(
      (text) => splitList(text).every((entry) => entry.length <= 60),
      `Each ${label.toLowerCase()} entry must be at most 60 characters.`,
    )
    .optional()
    .or(z.literal(""));

/** Project slug references — the server verifies existence; format (and the
 *  per-showcase limits) are mirrored here so bad slugs are flagged inline
 *  instead of surfacing as an invisible server-side 400 (Task 25). */
const PROJECT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const memberFormSchema = z.object({
  name: requiredText("Name", 120),
  initials: z
    .string()
    .trim()
    .min(1, "Initials are required.")
    .max(4, "Initials must be at most 4 characters."),
  avatar: optionalText("Avatar path/URL", 500),
  avatarAlt: optionalText("Avatar alt text", 200),
  role: requiredText("Role", 120),
  company: optionalText("Company", 120),
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
  department: optionalText("Department", 120),
  domain: requiredText("Domain", 80),
  location: optionalText("Location", 120),
  bio: requiredText("Bio", 4000),
  skills: listText("Skills", 30),
  interests: listText("Interests", 30),
  /** One platform per line: "github: https://github.com/…" (model's map shape).
   *  Mirrors the server's map rules: ≤10 links, platform ≤40, href ≤500. */
  socialText: z
    .string()
    .trim()
    .max(2000, "Social links must be at most 2000 characters.")
    .superRefine((text, ctx) => {
      const social = parseSocialMap(text);
      if (!social) return;
      const entries = Object.entries(social);
      if (entries.length > 10) {
        ctx.addIssue({ code: "custom", message: "At most 10 social links are allowed." });
      }
      for (const [platform, href] of entries) {
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
    })
    .optional()
    .or(z.literal("")),
  projectSlugsText: z
    .string()
    .trim()
    .max(1000, "Project slugs must be at most 1000 characters.")
    .superRefine((text, ctx) => {
      // The server lowercases before format-checking — mirror that so an
      // uppercase slug is normalized away, not rejected.
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
    })
    .optional()
    .or(z.literal("")),
  /** ISO calendar date — the browser date input yields this, but a manually
   *  typed value must fail HERE, visibly, not as a server 400. */
  joinedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
    .optional()
    .or(z.literal("")),
  status: z.enum(MEMBER_STATUSES, { message: "Choose a valid status." }),
  featured: z.boolean(),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;

/** "Ahmad Shah" → "AS" — up to the first two words' initials. */
export function initialsFromName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Split a comma-separated text list into trimmed, non-empty entries — the
 *  single parsing rule shared by the form schema (pre-validation) and the
 *  payload builder, so what the admin sees validated is what gets sent. */
export function splitList(text: string | undefined | null): string[] {
  return (text ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Server error keys → the form fields that can display them (Task 25).
 *
 * The server reports errors under MODEL keys and indexed paths — e.g.
 * `projectSlugs` / `projectSlugs.0` / `social` / `skills.0` — while the form
 * fields are `projectSlugsText` / `socialText` / `skills`. react-hook-form's
 * setError() on an unregistered name creates an error nothing renders, so
 * without this mapping the admin sees a silent failure (the reported 400).
 */
const SERVER_FIELD_ALIASES: Record<string, keyof MemberFormValues> = {
  projectSlugs: "projectSlugsText",
  social: "socialText",
};

/** Map a server error key onto a displayable form field, or null when the
 *  caller must fall back to the form-level banner (never swallow it). */
export function formFieldForServerError(key: string): keyof MemberFormValues | null {
  const base = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
  const aliased = SERVER_FIELD_ALIASES[base] ?? base;
  return aliased in memberFormDefaults() ? (aliased as keyof MemberFormValues) : null;
}

/** Fetched member → form values (map/arrays become editable text areas).
 *  The username is server-generated (Task 16) and never shown in the form. */
export function toMemberFormValues(member: Member): MemberFormValues {
  return {
    name: member.name,
    initials: member.initials,
    avatar: member.avatar ?? "",
    avatarAlt: member.avatarAlt ?? "",
    role: member.role,
    company: member.company ?? "",
    batch: member.batch,
    batchYear: String(member.batchYear),
    department: member.department ?? "",
    domain: member.domain,
    location: member.location ?? "",
    bio: member.bio,
    skills: (member.skills ?? []).join(", "),
    interests: (member.interests ?? []).join(", "),
    socialText: Object.entries(member.social ?? {})
      .map(([platform, href]) => `${platform}: ${href}`)
      .join("\n"),
    projectSlugsText: (member.projectSlugs ?? []).join(", "),
    joinedAt: member.joinedAt ?? "",
    status: member.status,
    featured: Boolean(member.featured),
  };
}

/** Create defaults — active member, this year's batch. */
export function memberFormDefaults(): MemberFormValues {
  return {
    name: "",
    initials: "",
    avatar: "",
    avatarAlt: "",
    role: "",
    company: "",
    batch: "",
    batchYear: String(new Date().getFullYear()),
    department: "",
    domain: "",
    location: "",
    bio: "",
    skills: "",
    interests: "",
    socialText: "",
    projectSlugsText: "",
    joinedAt: "",
    status: "active",
    featured: false,
  };
}

/** Parses the "platform: href" social text area back into the model's map.
 *  Malformed lines are dropped exactly like the server drops them — dropped
 *  lines can never 400, so the schema does not flag them either. */
function parseSocialMap(text: string | undefined): Record<string, string> | undefined {
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

/** Form values → API payload (exact Member model shape). The username is
 *  server-generated (Task 16) and never sent from the form. */
export function toMemberPayload(values: MemberFormValues): Partial<Member> {
  const skills = splitList(values.skills);
  const interests = splitList(values.interests);
  const projectSlugs = splitList(values.projectSlugsText);
  const social = parseSocialMap(values.socialText);

  return {
    name: values.name,
    initials: values.initials,
    ...(values.avatar ? { avatar: values.avatar } : {}),
    ...(values.avatarAlt ? { avatarAlt: values.avatarAlt } : {}),
    role: values.role,
    ...(values.company ? { company: values.company } : {}),
    batch: values.batch,
    batchYear: Number(values.batchYear),
    ...(values.department ? { department: values.department } : {}),
    domain: values.domain,
    ...(values.location ? { location: values.location } : {}),
    bio: values.bio,
    skills,
    interests,
    ...(social ? { social } : {}),
    ...(projectSlugs.length > 0 ? { projectSlugs } : {}),
    ...(values.joinedAt ? { joinedAt: values.joinedAt } : {}),
    status: values.status,
    featured: values.featured,
  };
}

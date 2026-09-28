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
  skills: z
    .string()
    .trim()
    .max(1200, "Skills must be at most 1200 characters.")
    .optional()
    .or(z.literal("")),
  interests: z
    .string()
    .trim()
    .max(1200, "Interests must be at most 1200 characters.")
    .optional()
    .or(z.literal("")),
  /** One platform per line: "github: https://github.com/…" (model's map shape). */
  socialText: z
    .string()
    .trim()
    .max(2000, "Social links must be at most 2000 characters.")
    .optional()
    .or(z.literal("")),
  projectSlugsText: z
    .string()
    .trim()
    .max(1000, "Project slugs must be at most 1000 characters.")
    .optional()
    .or(z.literal("")),
  joinedAt: optionalText("Joined date", 10),
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

/** Parses the "platform: href" social text area back into the model's map. */
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
  const splitList = (text: string | undefined) =>
    (text ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

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

import { z } from "zod";

import { initialsFromName } from "@/lib/adminAlumniForm";
import type { TeamCardWrite, TeamGroup } from "@/types";

/**
 * Client-side form schema for the admin Team form (Phase 12).
 *
 * Mirrors server/src/http/teamSchemas.ts field-for-field — client
 * validation is UX; the server remains authoritative. One reusable form
 * creates/edits BOTH card groups (Leaders / Developers) — the group is a
 * form select. Social links use the same flat editable array
 * (label/href/icon) as the alumni form; icon keys resolve client-side via
 * the shared registry.
 */

export const TEAM_GROUP_LABELS: Record<TeamGroup, string> = {
  leaders: "Leaders",
  developers: "Developers",
};

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(""));

export const teamFormSchema = z.object({
  group: z.enum(["leaders", "developers"], { message: "Choose a group." }),
  name: requiredText("Name", 120),
  position: requiredText("Position", 120),
  description: optionalText("Short description", 500),
  initials: z
    .string()
    .trim()
    .min(1, "Initials are required.")
    .max(4, "Initials must be at most 4 characters."),
  image: optionalText("Portrait path/URL", 500),
  imageAlt: optionalText("Portrait alt text", 200),
  /** String in the form (native number input), converted on submit. */
  order: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Order must be a whole number between 0 and 999.")
    .optional()
    .or(z.literal("")),
  status: z.enum(["published", "archived"], { message: "Choose a status." }),
  socials: z.array(
    z.object({
      label: requiredText("Link label", 80),
      href: requiredText("Link URL", 500),
      icon: requiredText("Icon key", 40),
    }),
  ),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

/** Fetched card → form values (order becomes an editable text input). */
export function toTeamFormValues(card: TeamCardWrite): TeamFormValues {
  return {
    group: card.group,
    name: card.name,
    position: card.position,
    description: card.description ?? "",
    initials: card.initials,
    image: card.image ?? "",
    imageAlt: card.imageAlt ?? "",
    order: card.order ? String(card.order) : "0",
    status: card.status,
    socials: (card.socials ?? []).map((link) => ({
      label: link.label,
      href: link.href,
      icon: link.icon,
    })),
  };
}

/** Create defaults — sensible starting point for a published card. */
export function teamFormDefaults(group: TeamGroup = "leaders"): TeamFormValues {
  return {
    group,
    name: "",
    position: "",
    description: "",
    initials: "",
    image: "",
    imageAlt: "",
    order: "0",
    status: "published",
    socials: [],
  };
}

/** Form values → API payload (exact TeamCard model shape). */
export function toTeamPayload(values: TeamFormValues): Partial<TeamCardWrite> {
  const socials = values.socials
    .map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
      icon: link.icon.trim(),
    }))
    .filter((link) => link.label && link.href && link.icon);

  return {
    group: values.group,
    name: values.name,
    position: values.position,
    ...(values.description ? { description: values.description } : {}),
    initials: values.initials || initialsFromName(values.name),
    ...(values.image ? { image: values.image } : {}),
    ...(values.imageAlt ? { imageAlt: values.imageAlt } : {}),
    order: values.order ? Number(values.order) : 0,
    status: values.status,
    ...(socials.length > 0 ? { socials } : {}),
  };
}

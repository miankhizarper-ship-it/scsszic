import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";
import { SOCIAL_PLATFORMS } from "../content/types.js";

/**
 * Site-settings validation (Task 15) — server-side, authoritative. The
 * settings document is ONE record (`site_settings`, id "site") holding the
 * footer social links; future settings fields extend the same schema.
 *
 * Social links reuse the EXACT serialized shape the alumni/team CMS uses
 * ({ label, href, icon }) where `icon` is a client icon-registry key from
 * SOCIAL_PLATFORMS — saved settings render through the same resolver, and
 * the admin UI derives the label/platform pair so managers never type it.
 */

/** Full social-link entry as stored/returned. */
export const siteSocialSchema = z.object({
  label: z.string().trim().min(1, "Link label is required.").max(80),
  href: z
    .string()
    .trim()
    .min(1, "Link URL is required.")
    .max(500)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a valid URL starting with https:// (or http://)."),
  icon: z.enum(SOCIAL_PLATFORMS, { message: "Choose a valid platform." }),
});

/** Hero image — https:// URL or site-relative path (uploads return URLs,
 *  the field also accepts /-rooted paths so pre-existing assets work). */
export const heroImageSchema = z
  .string()
  .trim()
  .max(500, "Hero image must be at most 500 characters.")
  .refine(
    (value) => value === "" || /^(https:\/\/|http:\/\/|\/)/.test(value),
    "Use an https:// image URL or a site-relative path starting with /.",
  );

/** PUT /api/admin/settings body — the full settings payload (replace-all). */
export const siteSettingsUpdateSchema = z
  .object({
    socials: z
      .array(siteSocialSchema)
      .max(8, "At most 8 social links are allowed."),
    heroImage: heroImageSchema.optional(),
  })
  .strict();

export type SiteSocialInput = z.infer<typeof siteSocialSchema>;
export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateSchema>;

/** Zod error → field→message map (shared with the query layer). */
export function settingsFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

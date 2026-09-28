import { collections } from "../../db/collections.js";
import { isConnectionError } from "../../db/errors.js";
import type { SiteSettings, SerializedSocialLink } from "../../content/types.js";

/**
 * Site-settings repository (Task 15) — the single `site_settings` document
 * (id "site"). Reads before the first admin save return the DEFAULT
 * (empty socials) so the public footer falls back to its curated
 * placeholder set with zero migration or seeding.
 */

const SETTINGS_ID = "site" as const;

/** The pre-first-save shape — an empty link list, no placeholders stored. */
const DEFAULT_SETTINGS: SiteSettings = {
  socials: [],
  updatedAt: "",
};

function toSettings(doc: { socials?: SerializedSocialLink[]; updatedAt: string } | null): SiteSettings {
  if (!doc) return { ...DEFAULT_SETTINGS };
  return {
    socials: (doc.socials ?? []).map((social) => ({
      label: social.label,
      href: social.href,
      icon: social.icon,
    })),
    updatedAt: doc.updatedAt,
  };
}

export const siteSettingsRepository = {
  /** Current settings — never null (defaults when the doc doesn't exist). */
  async get(): Promise<SiteSettings> {
    try {
      const doc = await collections.siteSettings().findOne({ _id: SETTINGS_ID });
      return toSettings(doc);
    } catch (error) {
      if (isConnectionError(error)) throw error;
      // A malformed doc must not take the footer down — degrade to defaults.
      return { ...DEFAULT_SETTINGS };
    }
  },

  /** Replace-all update (PUT semantics) — upserts the single document. */
  async update(socials: SerializedSocialLink[]): Promise<SiteSettings> {
    const now = new Date().toISOString();
    const result = await collections.siteSettings().findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $set: { socials, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    return toSettings(result ?? null) ?? { socials, updatedAt: now };
  },
};

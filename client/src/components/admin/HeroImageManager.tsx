import { useEffect, useState } from "react";
import { Image as ImageIcon, Save } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { UploadMediaButton } from "@/components/admin/UploadMediaButton";
import { useAdminSettings, useUpdateSiteSettings } from "@/hooks/admin";
import { ApiError } from "@/services/apiClient";
import type { SerializedSocialLink } from "@/types";

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500";

/**
 * HeroImageManager (Task 26) — the admin "Home Page → Hero" tab. One job:
 * pick the picture the public hero renders (replacing the old decorative
 * code panel). The image lives on the site-settings document, so saving
 * uses the replace-all PUT — the CURRENT socials always travel along so a
 * hero-only save can never wipe the footer links.
 *
 * Visible to admins and accounts with the Settings permission (both the
 * route gate and the server-side /admin/settings section enforce this).
 */
export function HeroImageManager() {
  const settingsQuery = useAdminSettings();
  const updateSettings = useUpdateSiteSettings();
  const [heroImage, setHeroImage] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the editor from the current settings once (and after refetches
  // that were NOT caused by this editor's own successful save).
  useEffect(() => {
    const data = settingsQuery.data;
    if (data && !updateSettings.isPending) {
      setHeroImage(data.heroImage ?? "");
      setHydrated(true);
    }
  }, [settingsQuery.data, updateSettings.isPending]);

  const pending = updateSettings.isPending || !settingsQuery.isFetched || !hydrated;

  function handleSave() {
    setFeedback(null);
    const current: SerializedSocialLink[] = settingsQuery.data?.socials ?? [];
    updateSettings.mutate(
      { socials: current, heroImage: heroImage.trim() },
      {
        onSuccess: () => setFeedback({ kind: "ok", message: "Hero image saved — it is live on the home page." }),
        onError: (error) =>
          setFeedback({
            kind: "error",
            message:
              error instanceof ApiError && error.message
                ? error.message
                : "Saving failed. Please try again.",
          }),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section aria-labelledby="hero-image-heading" className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="hero-image-heading" className="font-display text-base font-bold text-navy-900">
              Hero image
            </h2>
            <p className="mt-1 text-sm text-muted">
              The picture shown on the home-page hero, next to the welcome text. Upload a file or
              paste an image URL — leave it empty to show the branded fallback tile.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-300">
            <ImageIcon size={19} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
          <div>
            <label htmlFor="hero-image-url" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Image URL or path
            </label>
            <div className="flex items-center gap-2">
              <input
                id="hero-image-url"
                type="text"
                value={heroImage}
                onChange={(event) => setHeroImage(event.target.value)}
                placeholder="https://… or /api/media/… (empty = fallback tile)"
                className={INPUT_CLASS}
              />
              <UploadMediaButton
                folder="misc"
                accept="image/*"
                onUploaded={(url) => setHeroImage(url)}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Landscape images look best (the frame is 4:3 and always crops to fill).
            </p>

            {feedback && (
              <p
                role="alert"
                className={
                  feedback.kind === "ok"
                    ? "mt-4 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5 text-sm font-medium text-success"
                    : "mt-4 rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm font-medium text-error"
                }
              >
                {feedback.message}
              </p>
            )}

            <div className="mt-5">
              <Button type="button" variant="navy" size="md" onClick={handleSave} disabled={pending} aria-busy={pending}>
                <Save size={16} aria-hidden="true" />
                {pending ? "Saving…" : "Save hero image"}
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Preview
            </p>
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface">
              {heroImage.trim() ? (
                <img
                  src={heroImage.trim()}
                  alt="Hero image preview"
                  className="size-full object-cover"
                  decoding="async"
                />
              ) : (
                <div aria-hidden="true" className="grid size-full place-items-center bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950">
                  <span className="font-display text-4xl font-extrabold text-white/90">SCS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect } from "react";

import type { PageMetadata } from "@/types";

/**
 * SEO foundation.
 *
 * The brand strings below are the canonical home-page metadata (see spec).
 * Per-route metadata is applied via the `usePageMetadata` hook; when Phase 2
 * introduces SSR/prerendering, this hook is the single place to upgrade.
 */

export const SITE_NAME = "Society of Computer Science | SZIC";

export const DEFAULT_DESCRIPTION =
  "Society of Computer Science at SZIC — a student-driven community focused on technology, learning, innovation, collaboration, and real-world computing experiences.";

/** Build a page title in the canonical "<Page> | Society of Computer Science" format. */
export function buildPageTitle(page?: string): string {
  if (!page) return SITE_NAME;
  return `${page} | Society of Computer Science`;
}

function setMetaDescription(content: string) {
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * Applies per-route document title + meta description.
 *
 * @example
 * usePageMetadata({ title: buildPageTitle("Events"), description: "…" });
 */
export function usePageMetadata({ title, description }: PageMetadata) {
  useEffect(() => {
    document.title = title ?? SITE_NAME;
  }, [title]);

  useEffect(() => {
    setMetaDescription(description ?? DEFAULT_DESCRIPTION);
  }, [description]);
}

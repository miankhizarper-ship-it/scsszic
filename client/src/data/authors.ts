import authorHafiz from "@/assets/people/author-hafiz-usman.jpg";
import authorAyesha from "@/assets/people/author-ayesha-noor.jpg";
import authorUsman from "@/assets/people/author-usman-ali.jpg";
import authorBilal from "@/assets/people/author-bilal-ahmed.jpg";
import authorMahnoor from "@/assets/people/author-mahnoor-shah.jpg";
import authorDanish from "@/assets/people/author-danish-rehman.jpg";
import type { BlogAuthorProfile } from "@/types";

/**
 * MOCK DATA — Blog authors.
 *
 * All authors below are FICTIONAL demo personas created for design purposes
 * only. They deliberately do not describe real students, graduates, or
 * faculty of the Society of Computer Science / SZIC. Every article rendered
 * from this data carries the same demo disclaimer on its detail page.
 *
 * Phase 5+: replaced by an `authors` collection (MongoDB) with R2 avatars;
 * each blog stores an author snapshot, so the UI never needs reshaping.
 *
 * Centralized here (instead of repeated inline in blogs.ts) so bios, roles,
 * and artwork stay consistent across articles.
 */
export const AUTHORS = {
  "hafiz-usman": {
    id: "hafiz-usman",
    name: "Hafiz Usman",
    role: "Contributing Writer (demo)",
    initials: "HU",
    avatar: authorHafiz,
    avatarAlt:
      "Placeholder portrait tile for demo author Hafiz Usman — abstract navy and gold monogram",
    bio: "A demo writer persona who documents the student journey — internships, portfolios, and the habits that turn coursework into craft.",
  },
  "ayesha-noor": {
    id: "ayesha-noor",
    name: "Ayesha Noor",
    role: "Community Contributor (demo)",
    initials: "AN",
    avatar: authorAyesha,
    avatarAlt:
      "Placeholder portrait tile for demo author Ayesha Noor — abstract navy and gold monogram",
    bio: "A demo contributor persona who writes about hackathons, community events, and the student competition circuit.",
  },
  "usman-ali": {
    id: "usman-ali",
    name: "Usman Ali",
    role: "Technical Writer (demo)",
    initials: "UA",
    avatar: authorUsman,
    avatarAlt:
      "Placeholder portrait tile for demo author Usman Ali — abstract navy and gold monogram",
    bio: "A demo technical persona focused on practical tutorials — Git, tooling, and the workflows professional teams rely on.",
  },
  "bilal-ahmed": {
    id: "bilal-ahmed",
    name: "Bilal Ahmed",
    role: "Technical Writer (demo)",
    initials: "BA",
    avatar: authorBilal,
    avatarAlt:
      "Placeholder portrait tile for demo author Bilal Ahmed — abstract navy and gold monogram",
    bio: "A demo writer persona exploring AI, generative models, and what modern tooling means for everyday developers.",
  },
  "mahnoor-shah": {
    id: "mahnoor-shah",
    name: "Mahnoor Shah",
    role: "Guest Contributor (demo)",
    initials: "MS",
    avatar: authorMahnoor,
    avatarAlt:
      "Placeholder portrait tile for demo author Mahnoor Shah — abstract navy and gold monogram",
    bio: "A demo contributor persona covering data science, security hygiene, and the unglamorous habits that keep projects alive.",
  },
  "danish-rehman": {
    id: "danish-rehman",
    name: "Danish Rehman",
    role: "Contributing Writer (demo)",
    initials: "DR",
    avatar: authorDanish,
    avatarAlt:
      "Placeholder portrait tile for demo author Danish Rehman — abstract navy and gold monogram",
    bio: "A demo writer persona who maps the space between classroom assignments and production software.",
  },
} as const satisfies Record<string, BlogAuthorProfile>;

/** Convenience lookup used by the mock blog data. */
export function getAuthor(id: keyof typeof AUTHORS): BlogAuthorProfile {
  return AUTHORS[id];
}

import { useMemo, useState } from "react";
import { PenLine, Rss, SearchX } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CollectionLoading, ErrorState } from "@/components/ui/CollectionState";
import { FeedPostCard } from "@/components/community/FeedPostCard";
import {
  useFeedPosts,
  useFeedViewerState,
} from "@/hooks/content";
import { useAuth } from "@/context/AuthProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { hasActiveFilters } from "@/lib/feedSearch";
import { CTASection } from "@/components/sections/CTASection";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";
import { ROUTES } from "@/routes/paths";

/**
 * Community feed filter options — derived from the API's facet block
 * (server-computed over published posts), with the All-sentinel the
 * FilterBar contract expects.
 */
const FEED_TYPES = ["announcement", "project", "event", "article", "community"] as const;

const TYPE_LABELS: Record<(typeof FEED_TYPES)[number], string> = {
  announcement: "Announcements",
  project: "Project Updates",
  event: "Events",
  article: "Articles",
  community: "Community",
};

/**
 * FeedPage — the community feed (/feed).
 *
 * Server-side search + type + tag filtering (the API owns the query — the
 * page only sends parameters and renders results). Cross-references arrive
 * pre-resolved on each post, so cards never issue per-card lookups. Since
 * Task 29, society members share posts via /member/feed/new and every
 * signed-in account can like + comment.
 */
export default function FeedPage() {
  usePageMetadata({
    title: buildPageTitle("Community Feed"),
    description:
      "The community feed of the Society of Computer Science — announcements, discussions, wins, and shared resources.",
  });

  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [tag, setTag] = useState("All");
  const debouncedQuery = useDebouncedValue(query);

  const filters = useMemo(
    () => ({ query: debouncedQuery, type: type === "All" ? "" : type, tag: tag === "All" ? "" : tag }),
    [debouncedQuery, type, tag],
  );

  const postsQuery = useFeedPosts(filters);
  const postsData = postsQuery.data?.data;
  const posts = useMemo(() => postsData ?? [], [postsData]);
  const facets = postsQuery.data?.meta.facets;
  const total = facets?.total ?? 0;

  /* Batched per-viewer like-state — ONE request for the whole page,
   * only while signed in (anonymous visitors skip it entirely). */
  const { user } = useAuth();
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const viewerStateQuery = useFeedViewerState(postIds, user?.id ?? null);
  const likedIds = useMemo(
    () => new Set(viewerStateQuery.data?.likedIds ?? []),
    [viewerStateQuery.data],
  );

  const popularTags = ((facets?.tags ?? []) as Array<{ value?: string; n?: number }>)
    .map((entry) => String(entry.value ?? ""))
    .filter(Boolean);

  const handleToggle = (groupId: string, value: string) => {
    const next = value === "All" ? "" : value;
    if (groupId === "type") setType(next);
    if (groupId === "tag") setTag(next);
  };

  const handleClear = () => {
    setQuery("");
    setType("");
    setTag("");
  };

  const filterGroups = [
    { id: "type", label: "Type", options: [...FEED_TYPES] },
    ...(popularTags.length > 0 ? [{ id: "tag", label: "Tag", options: popularTags }] : []),
  ];

  const filtersActive = hasActiveFilters(filters);
  const showEmpty = !postsQuery.isPending && !postsQuery.isError && posts.length === 0;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section aria-labelledby="feed-hero" className="relative overflow-hidden bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark mask-fade-radial" />
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-navy-600/30 blur-3xl"
        />
        <div aria-hidden="true" className="gold-hairline absolute inset-x-0 top-0 h-px" />

        <Container className="relative py-16 text-center sm:py-20 lg:py-24">
          <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500/50" />
            Community Feed
            <span aria-hidden="true" className="h-px w-8 bg-gold-500/50" />
          </p>
          <h1
            id="feed-hero"
            className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl"
          >
            What's happening
            <br />
            in <span className="text-gold-400">our community</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Announcements, project milestones, event news, and new articles — the running story of
            a society that builds together. Log in to like posts and join the conversation.
          </p>
          <p className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
            <Rss size={13} aria-hidden="true" className="text-gold-400" />
            {user?.role === "member"
              ? "You post as your public member profile"
              : "Members share posts · everyone can like and comment"}
          </p>
          {/* Task 29 — society members post from here; the copy reflects the
              real role split (members publish, every account engages). */}
          {user?.role === "member" && (
            <div className="mx-auto mt-6 flex justify-center">
              <Button to={ROUTES.member.feedNew} variant="gold">
                <PenLine size={15} aria-hidden="true" className="mr-1.5" />
                Share a post
              </Button>
            </div>
          )}
        </Container>
      </section>

      {/* ---------- Feed body ---------- */}
      <section aria-label="Feed posts" className="bg-surface py-12 lg:py-16">
        <Container>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
            {/* ---------- Filters ---------- */}
            <SearchInput
              id="feed-search"
              value={query}
              onChange={setQuery}
              placeholder="Search posts by title, author, tag, or topic…"
              label="Search feed posts"
            />

            <div className="mt-5 border-t border-line pt-5">
              <FilterBar
                groups={filterGroups}
                values={{
                  type: type || "All",
                  ...(popularTags.length > 0 ? { tag: tag || "All" } : {}),
                }}
                onToggle={handleToggle}
                onClear={handleClear}
                getOptionLabel={
                  (group, option) =>
                    group === "type" ? TYPE_LABELS[option as (typeof FEED_TYPES)[number]] : option
                }
              />
            </div>

            <p className="mt-5 border-t border-line pt-4 text-sm text-muted" aria-live="polite">
              {postsQuery.isPending
                ? "Loading posts…"
                : postsQuery.isError
                  ? "Showing results is temporarily unavailable."
                  : `${posts.length} ${posts.length === 1 ? "post" : "posts"}${
                      filtersActive ? " matching your filters" : ""
                    } · ${total} published in total`}
            </p>
          </div>

          {/* ---------- States ---------- */}
          {postsQuery.isPending && (
            <CollectionLoading rows={6} className="mt-10" label="Loading feed posts…" />
          )}

          {postsQuery.isError && (
            <ErrorState
              title="The feed couldn't load"
              description="Posts are temporarily unavailable — the rest of the site is still available. Please try again."
              onRetry={() => void postsQuery.refetch()}
              className="mt-10 border-solid"
            />
          )}

          {showEmpty && (
            <EmptyState
              icon={SearchX}
              title="No posts match those filters"
              description="Try a different search term, or reset the filters to see the full feed."
              className="mt-10"
            >
              {filtersActive && (
                <Button
                  variant="navy"
                  onClick={() => {
                    setQuery("");
                    setType("All");
                    setTag("All");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </EmptyState>
          )}

          {/* ---------- Posts grid ---------- */}
          {posts.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  className="h-full"
                  likedByViewer={likedIds.has(post.id)}
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      <CTASection
        id="feed-cta"
        eyebrow="Add Your Voice"
        title="Your win could be the next post"
        description="Project launches, contest results, internship offers, event recaps — the feed is written by members like you. Create an account to get ready for posting."
        primary={{ label: "Join the Community", to: "/signup" }}
        secondary={{ label: "Browse Projects", to: "/projects" }}
      />
    </>
  );
}

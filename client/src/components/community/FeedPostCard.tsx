import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  FolderGit2,
  Heart,
  Loader2,
  MessageCircle,
  Megaphone,
  Newspaper,
  Send,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/routes/paths";
import { formatCardDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import {
  useAddFeedComment,
  useFeedComments,
  useToggleFeedLike,
} from "@/hooks/content";
import type { FeedPost, FeedPostType } from "@/types";

interface FeedPostCardProps {
  post: FeedPost;
  /** "compact" trims the artwork/tags for the Home preview grid. */
  variant?: "default" | "compact";
  /**
   * Whether the signed-in viewer has already liked this post (batched
   * viewer-state from the page). Ignored for anonymous viewers and the
   * compact variant.
   */
  likedByViewer?: boolean;
  className?: string;
}

/**
 * Post-type presentation map — subtle, palette-only differentiation
 * (spec §22): each type gets its own icon, singular label, and alternates
 * between the two brand chip styles. No colors outside the SCS system.
 */
const TYPE_META: Record<
  FeedPostType,
  { icon: React.ElementType; label: string; badge: "goldSoft" | "navySoft" }
> = {
  announcement: { icon: Megaphone, label: "Announcement", badge: "navySoft" },
  project: { icon: FolderGit2, label: "Project Update", badge: "goldSoft" },
  event: { icon: CalendarDays, label: "Event", badge: "navySoft" },
  article: { icon: Newspaper, label: "Article", badge: "goldSoft" },
  community: { icon: Users, label: "Community", badge: "navySoft" },
};

/**
 * FeedPostCard — the feed item card for /feed (and the Home preview).
 *
 * Author, type, copy, optional artwork, cross-reference links, and tags.
 * Cross-references arrive PRE-RESOLVED on the post (`post.refs`) — the API
 * batches author/project/event/blog lookups per page (no per-card
 * requests), and unknown/archived entities simply omit their ref so the
 * card can never render a dead link.
 *
 * Engagement (community phase): Like toggles a persisted per-viewer like
 * (signed-in accounts; anonymous visitors are pointed at login) and the
 * Comments control opens the post's real comment thread — readable by
 * everyone, writable by signed-in accounts. Counts shown are server-owned
 * (seeded baseline + real activity); local deltas only bridge the gap
 * until the next server render.
 */
export function FeedPostCard({
  post,
  variant = "default",
  likedByViewer = false,
  className,
}: FeedPostCardProps) {
  const compact = variant === "compact";
  const author = post.refs?.author;
  const project = post.refs?.project;
  const event = post.refs?.event;
  const blog = post.refs?.blog;
  const { icon: TypeIcon, label: typeLabel, badge: typeBadge } = TYPE_META[post.type];

  const { user } = useAuth();
  const location = useLocation();
  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`;

  /* ----- Like state: server truth + local override after a toggle ----- */
  const [likeOverride, setLikeOverride] = useState<{
    liked: boolean;
    likes: number;
  } | null>(null);
  const likeMutation = useToggleFeedLike();
  const liked = likeOverride?.liked ?? likedByViewer;
  const likeCount = likeOverride?.likes ?? post.likes;

  const handleToggleLike = async () => {
    if (!user || likeMutation.isPending) return;
    // Optimistic flip — corrected (or reverted) by the server response.
    const optimistic = {
      liked: !liked,
      likes: likeCount + (liked ? -1 : 1),
    };
    setLikeOverride(optimistic);
    try {
      const result = await likeMutation.mutateAsync(post.id);
      setLikeOverride({ liked: result.liked, likes: result.likes });
    } catch {
      setLikeOverride(null);
      setActionError("Your like couldn't be saved. Please try again.");
    }
  };

  /* ----- Comments: lazily fetched thread + inline composer ----- */
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [localCommentDelta, setLocalCommentDelta] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const commentsQuery = useFeedComments(showComments && !compact ? post.id : null);
  const comments = commentsQuery.data ?? [];
  const addCommentMutation = useAddFeedComment(post.id);
  const commentCount = post.comments + localCommentDelta;

  const handleAddComment = async () => {
    const body = commentDraft.trim();
    if (!body || addCommentMutation.isPending) return;
    try {
      await addCommentMutation.mutateAsync(body);
      setCommentDraft("");
      setLocalCommentDelta((n) => n + 1);
      setActionError(null);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "Your comment couldn't be posted. Please try again.",
      );
    }
  };

  const toggleComments = () => {
    setActionError(null);
    setShowComments((open) => !open);
  };

  const chipClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5",
    "text-xs font-semibold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
  );

  const engagementControl =
    "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {/* ---------- Author + type ---------- */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {author ? (
            <Link
              to={ROUTES.profile(author.username)}
              aria-label={`View profile: ${author.name}`}
              className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold-500/25 to-navy-300/20"
              />
              <Avatar
                src={author.avatar}
                alt={author.avatarAlt ?? `Portrait placeholder for ${author.name}`}
                initials={author.initials}
                size={40}
                className="relative ring-2 ring-white"
              />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-[11px] font-bold text-gold-300"
            >
              SCS
            </span>
          )}

          <div className="min-w-0">
            {author ? (
              <Link
                to={ROUTES.profile(author.username)}
                className="truncate text-sm font-semibold text-navy-900 transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                {author.name}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold text-navy-900">
                {post.authorName}
              </p>
            )}
            <p className="text-xs leading-snug text-muted">
              {author ? author.batch : "Society account"}
              <span aria-hidden="true"> · </span>
              <time dateTime={post.publishedAt}>{formatCardDate(post.publishedAt)}</time>
            </p>
          </div>
        </div>

        <Badge variant={typeBadge} className="shrink-0">
          <TypeIcon size={11} aria-hidden="true" className="mr-1" />
          {typeLabel}
        </Badge>
      </header>

      {/* ---------- Copy ---------- */}
      <h3
        className={cn(
          "mt-4 font-display font-bold leading-snug text-navy-900",
          compact ? "text-base" : "text-lg",
        )}
      >
        {post.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        {compact ? post.excerpt : <span className="line-clamp-3">{post.excerpt}</span>}
      </p>

      {/* ---------- Artwork ---------- */}
      {!compact && post.image && (
        <img
          src={post.image}
          alt={post.imageAlt ?? ""}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="mt-4 aspect-[16/9] w-full rounded-lg border border-line object-cover"
        />
      )}

      {/* ---------- Cross-reference links ---------- */}
      {(project || event || blog) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {project && (
            <Link to={ROUTES.projectDetail(project.slug)} className={chipClasses}>
              <FolderGit2 size={13} aria-hidden="true" className="text-gold-600" />
              Project: {project.title}
            </Link>
          )}
          {event && (
            <Link to={ROUTES.eventDetail(event.slug)} className={chipClasses}>
              <CalendarDays size={13} aria-hidden="true" className="text-gold-600" />
              Event: {event.title}
            </Link>
          )}
          {blog && (
            <Link to={ROUTES.blogDetail(blog.slug)} className={chipClasses}>
              <Newspaper size={13} aria-hidden="true" className="text-gold-600" />
              Article: {blog.title}
            </Link>
          )}
        </div>
      )}

      {/* ---------- Tags ---------- */}
      {!compact && post.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Post tags">
          {post.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md border border-dashed border-line px-2 py-0.5 text-[11px] font-medium text-muted"
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Engagement + related link ---------- */}
      <footer className="mt-auto flex flex-col gap-3 border-t border-line pt-4 text-xs text-muted">
        <div className="flex items-center gap-4">
          {/* Like — persisted toggle for signed-in viewers, login link otherwise */}
          {compact ? (
            <span
              className="inline-flex items-center gap-1.5"
              aria-label={`${likeCount} likes`}
            >
              <Heart size={14} aria-hidden="true" className="text-gold-600" />
              {likeCount}
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={() => void handleToggleLike()}
              disabled={likeMutation.isPending}
              aria-pressed={liked}
              aria-label={liked ? `Unlike this post (${likeCount} likes)` : `Like this post (${likeCount} likes)`}
              className={cn(
                engagementControl,
                liked
                  ? "text-gold-700 hover:text-gold-600"
                  : "text-muted hover:text-gold-700",
                likeMutation.isPending && "cursor-wait opacity-70",
              )}
            >
              <Heart
                size={14}
                aria-hidden="true"
                className={cn(liked && "fill-gold-500 text-gold-500")}
              />
              {likeCount}
            </button>
          ) : (
            <Link
              to={loginHref}
              aria-label={`${likeCount} likes — log in to like this post`}
              title="Log in to like this post"
              className={cn(engagementControl, "text-muted hover:text-gold-700")}
            >
              <Heart size={14} aria-hidden="true" className="text-gold-600" />
              {likeCount}
            </Link>
          )}

          {/* Comments — thread readable by everyone, composer gated */}
          {!compact && (
            <button
              type="button"
              onClick={toggleComments}
              aria-expanded={showComments}
              aria-controls={`comments-${post.id}`}
              className={cn(
                engagementControl,
                "text-muted hover:text-gold-700",
                showComments && "text-gold-700",
              )}
            >
              <MessageCircle size={14} aria-hidden="true" className="text-gold-600" />
              {commentCount}
              <span className="sr-only">comments — {showComments ? "hide" : "show"} the thread</span>
            </button>
          )}
          {compact && (
            <span className="inline-flex items-center gap-1.5" aria-label={`${commentCount} comments`}>
              <MessageCircle size={14} aria-hidden="true" className="text-gold-600" />
              {commentCount}
            </span>
          )}

          {/* Compact (Home preview) only: the /feed card's navigation needs are
              already covered by the cross-reference chips above. */}
          {compact && (
            <Link
              to={ROUTES.feed}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Open the feed
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )}
        </div>

        {actionError && !compact && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {actionError}
          </p>
        )}

        {/* ---------- Comment thread ---------- */}
        {showComments && !compact && (
          <div
            id={`comments-${post.id}`}
            className="rounded-lg border border-line bg-surface/60 p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-900">
              Comments
            </p>

            <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-1">
              {commentsQuery.isPending && (
                <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
                  <Loader2 size={13} aria-hidden="true" className="animate-spin" />
                  Loading comments…
                </p>
              )}
              {commentsQuery.isError && (
                <p className="text-xs text-muted" aria-live="polite">
                  Comments couldn't load right now.{" "}
                  <button
                    type="button"
                    onClick={() => void commentsQuery.refetch()}
                    className="font-semibold text-navy-900 underline hover:text-gold-700"
                  >
                    Retry
                  </button>
                </p>
              )}
              {!commentsQuery.isPending && !commentsQuery.isError && comments.length === 0 && (
                <p className="text-xs text-muted">No comments yet — start the conversation.</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[10px] font-bold text-gold-300"
                  >
                    {comment.authorName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-900">
                      {comment.authorName}
                      <span aria-hidden="true"> · </span>
                      <time
                        dateTime={comment.createdAt}
                        className="font-normal text-muted"
                      >
                        {formatDateTime(comment.createdAt)}
                      </time>
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink/85">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer / login nudge */}
            {user ? (
              <form
                className="mt-3 flex items-end gap-2 border-t border-line pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddComment();
                }}
              >
                <label htmlFor={`comment-${post.id}`} className="sr-only">
                  Write a comment
                </label>
                <textarea
                  id={`comment-${post.id}`}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Add a comment…"
                  className="min-h-0 flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-gold-500 focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="navy"
                  size="sm"
                  disabled={addCommentMutation.isPending || commentDraft.trim().length === 0}
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send size={14} aria-hidden="true" />
                  )}
                  <span className="sr-only">Post comment</span>
                </Button>
              </form>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                <Link
                  to={loginHref}
                  className="font-semibold text-navy-900 underline decoration-gold-400 underline-offset-2 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Log in
                </Link>{" "}
                to join the conversation.
              </p>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}

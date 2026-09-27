import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  FolderGit2,
  Heart,
  MessageCircle,
  Megaphone,
  Newspaper,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { formatCardDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FeedPost, FeedPostType } from "@/types";

interface FeedPostCardProps {
  post: FeedPost;
  /** "compact" trims the artwork/tags for the Home preview grid. */
  variant?: "default" | "compact";
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
 * Author, type, copy, optional artwork, cross-reference links, tags, and
 * demo engagement counts. Like/Comment are read-only metadata — rendered as
 * text, never buttons — because no persistence exists in this phase; the
 * same contract the future API must provide before they become interactive.
 *
 * Phase 8: cross-references arrive PRE-RESOLVED on the post (`post.refs`) —
 * the API batches author/project/event/blog lookups per page (no per-card
 * requests), and unknown/archived entities simply omit their ref so the
 * card can never render a dead link.
 */
export function FeedPostCard({ post, variant = "default", className }: FeedPostCardProps) {
  const compact = variant === "compact";
  const author = post.refs?.author;
  const project = post.refs?.project;
  const event = post.refs?.event;
  const blog = post.refs?.blog;
  const { icon: TypeIcon, label: typeLabel, badge: typeBadge } = TYPE_META[post.type];

  const chipClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5",
    "text-xs font-semibold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
  );

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
      <footer className="mt-auto flex items-center gap-5 border-t border-line pt-4 text-xs text-muted">
        <span
          className="inline-flex items-center gap-5"
        >
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={`${post.likes} likes (demo count)`}
          >
            <Heart size={14} aria-hidden="true" className="text-gold-600" />
            {post.likes}
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={`${post.comments} comments (demo count)`}
          >
            <MessageCircle size={14} aria-hidden="true" className="text-gold-600" />
            {post.comments}
          </span>
        </span>

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
      </footer>
    </article>
  );
}

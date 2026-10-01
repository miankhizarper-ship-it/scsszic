import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, MessageCircle, MessagesSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/routes/paths";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { useAddBlogComment, useBlogComments } from "@/hooks/content";

interface BlogCommentsProps {
  /** The article's URL slug — the thread is keyed by it. */
  slug: string;
  className?: string;
}

/**
 * BlogComments — the conversation on a published article (Task 30).
 *
 * Readable by everyone (anonymous visitors included); posting requires any
 * signed-in account — plain "user" accounts are first-class participants
 * here, mirroring the user's engagement rights on the feed. Threads render
 * oldest-first; new comments append via the mutation's cache update. Server
 * errors surface inline; nothing else on the page depends on this section.
 */
export function BlogComments({ slug, className }: BlogCommentsProps) {
  const { user } = useAuth();
  const location = useLocation();
  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`;

  const commentsQuery = useBlogComments(slug);
  const comments = commentsQuery.data ?? [];
  const addCommentMutation = useAddBlogComment(slug);

  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddComment = async () => {
    const body = draft.trim();
    if (!body || addCommentMutation.isPending) return;
    try {
      await addCommentMutation.mutateAsync(body);
      setDraft("");
      setActionError(null);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "Your comment couldn't be posted. Please try again.",
      );
    }
  };

  return (
    <section aria-labelledby="blog-comments-heading" className={cn("border-t border-line bg-white py-12 lg:py-16", className)}>
      <Container className="max-w-4xl">
        <div className="mx-auto max-w-[780px]">
          <header className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-navy-900 text-gold-300"
            >
              <MessagesSquare size={17} aria-hidden="true" />
            </span>
            <h2
              id="blog-comments-heading"
              className="font-display text-xl font-bold tracking-tight text-navy-900 sm:text-2xl"
            >
              Conversation
              {commentsQuery.isSuccess && (
                <span className="ml-2 align-middle text-sm font-semibold text-muted">
                  ({comments.length})
                </span>
              )}
            </h2>
          </header>

          {/* ---------- Thread ---------- */}
          {commentsQuery.isPending && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted" aria-live="polite">
              <Loader2 size={15} aria-hidden="true" className="animate-spin" />
              Loading the conversation…
            </p>
          )}

          {commentsQuery.isError && (
            <div className="mt-6 rounded-lg border border-line bg-surface/60 p-4 text-sm text-muted" aria-live="polite">
              Comments couldn't load right now.{" "}
              <button
                type="button"
                onClick={() => void commentsQuery.refetch()}
                className="font-semibold text-navy-900 underline hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                Retry
              </button>
            </div>
          )}

          {commentsQuery.isSuccess && comments.length === 0 && (
            <p className="mt-6 rounded-lg border border-dashed border-line bg-surface/60 p-4 text-sm text-muted">
              No comments yet — be the first to share what you took away from
              this article.
            </p>
          )}

          {comments.length > 0 && (
            <ul className="mt-6 space-y-5" aria-label="Article comments">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-300"
                  >
                    {comment.authorName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface/60 px-4 py-3">
                    <p className="text-sm font-semibold text-navy-900">
                      {comment.authorName}
                      <span aria-hidden="true"> · </span>
                      <time
                        dateTime={comment.createdAt}
                        className="text-xs font-normal text-muted"
                      >
                        {formatDateTime(comment.createdAt)}
                      </time>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/85">
                      {comment.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {actionError && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-700">
              {actionError}
            </p>
          )}

          {/* ---------- Composer / login nudge ---------- */}
          {user ? (
            <form
              className="mt-8 rounded-xl border border-line bg-surface/60 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddComment();
              }}
            >
              <label htmlFor="blog-comment-body" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-900">
                <MessageCircle size={13} aria-hidden="true" className="text-gold-600" />
                Join the conversation
              </label>
              <textarea
                id="blog-comment-body"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Share your thoughts on this article…"
                className="mt-2.5 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-gold-500 focus:outline-none"
              />
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-muted" aria-live="polite">
                  {draft.trim().length}/1000
                </p>
                <Button
                  type="submit"
                  variant="navy"
                  size="sm"
                  disabled={addCommentMutation.isPending || draft.trim().length === 0}
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send size={14} aria-hidden="true" />
                  )}
                  Post comment
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-8 rounded-xl border border-dashed border-line bg-surface/60 p-4 text-sm text-muted">
              <Link
                to={loginHref}
                className="font-semibold text-navy-900 underline decoration-gold-400 underline-offset-2 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                Log in
              </Link>{" "}
              or{" "}
              <Link
                to={`${ROUTES.signup}?redirect=${encodeURIComponent(location.pathname)}`}
                className="font-semibold text-navy-900 underline decoration-gold-400 underline-offset-2 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                create an account
              </Link>{" "}
              to join the conversation.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

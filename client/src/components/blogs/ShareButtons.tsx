import { useEffect, useState } from "react";
import { Check, Link2, Linkedin, MessageCircle, Twitter } from "lucide-react";

import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  /** Article title used as share text where the platform supports it. */
  title: string;
  className?: string;
}

/**
 * ShareButtons — accessible share row for article pages (spec §18).
 *
 * - Share URLs are constructed client-side from the current location; no
 *   backend involved, and each button is a real, labeled control.
 * - "Copy Link" uses the async clipboard API with a graceful fallback for
 *   older browsers and a visible "Copied" confirmation (never color alone).
 * - External share intents open in a new window with `rel="noopener"`.
 */
export function ShareButtons({ title, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  /* Read the URL after mount so SSR/prerender never diverges from the client. */
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pageUrl);
      } else {
        /* Fallback for environments without the async clipboard API. */
        const textarea = document.createElement("textarea");
        textarea.value = pageUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
    } catch {
      /* Clipboard permission denied — surface the URL so the user can copy manually. */
      window.prompt("Copy this article link:", pageUrl);
    }
  };

  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareTargets = [
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
    },
    {
      label: "Share on X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: MessageCircle,
    },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Share
      </span>

      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Link copied to clipboard" : "Copy link to this article"}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium",
          "transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
          copied
            ? "border-success/40 bg-success/10 text-success"
            : "border-line bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50",
        )}
      >
        {copied ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Link2 size={15} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy Link"}
      </button>

      {shareTargets.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-white text-navy-700 transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <Icon size={16} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { useSiteSettings } from "@/hooks/content";
import {
  FOOTER_COMMUNITY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_QUICK_LINKS,
  SOCIAL_LINKS,
} from "@/data/navigation";
import { Link } from "react-router-dom";
import type { SocialLink } from "@/types";

interface FooterColumnProps {
  heading: string;
  links: { label: string; to: string }[];
}

function FooterColumn({ heading, links }: FooterColumnProps) {
  return (
    <nav aria-label={heading}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {heading}
      </h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-sm text-slate-400 transition-colors hover:text-gold-300"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Footer — premium multi-column footer.
 * Brand + society identity, link columns, social links, legal links.
 *
 * Social links are ADMIN-MANAGED (Task 15): GET /api/settings feeds the
 * row, and until the society saves its first link set the curated
 * placeholder SOCIAL_LINKS render (unchanged pre-settings behavior).
 * The API never takes the footer down — a failed/missing settings query
 * just keeps the placeholders.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const settingsQuery = useSiteSettings();
  const configuredLinks = settingsQuery.data?.socials ?? [];
  const socialLinks: SocialLink[] =
    configuredLinks.length > 0 ? configuredLinks : SOCIAL_LINKS;

  return (
    <footer className="border-t border-white/10 bg-navy-950">
      <Container className="py-14 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-8">
          {/* Brand */}
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              A student-driven community at SZIC connecting aspiring developers,
              innovators, researchers, and technology enthusiasts through
              learning, collaboration, and real-world experiences.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-gold-500/50 hover:text-gold-300"
                >
                  <Icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn heading="Quick Links" links={FOOTER_QUICK_LINKS} />
          <FooterColumn heading="Community" links={FOOTER_COMMUNITY_LINKS} />
          <FooterColumn heading="Resources" links={FOOTER_LEGAL_LINKS} />
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            © {year} Society of Computer Science — Shaikh Zayed Islamic Centre,
            University of Peshawar.
          </p>
          <p>For students, by students.</p>
        </Container>
      </div>
    </footer>
  );
}

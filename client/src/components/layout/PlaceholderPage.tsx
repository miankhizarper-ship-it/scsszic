import { ArrowRight, Construction, Home } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";

interface PlaceholderPageProps {
  /** H1 of the placeholder page. */
  title: string;
  /** One-liner explaining what will live here. */
  description: string;
  /** Optional identifier shown as a chip (e.g. an event slug). */
  identifier?: string;
  /** Wraps the content in a centered card (auth-style pages). */
  card?: boolean;
  icon?: React.ElementType;
}

/**
 * PlaceholderPage — clean, consistent stub for routes whose full
 * implementation arrives in Phase 2. Keeps routing, SEO and layout
 * intact while making clear the section is being prepared.
 */
export function PlaceholderPage({
  title,
  description,
  identifier,
  card = false,
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  const body = (
    <>
      <span className="mx-auto grid size-14 place-items-center rounded-xl border border-gold-500/40 bg-navy-900 text-gold-300 shadow-sm">
        <Icon size={24} aria-hidden="true" />
      </span>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
        Coming soon
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">{description}</p>

      {identifier && (
        <p className="mt-5">
          <span className="inline-block max-w-full truncate rounded-md border border-navy-100 bg-navy-50 px-2.5 py-1 font-mono text-xs text-navy-700">
            {identifier}
          </span>
        </p>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button to={ROUTES.home} variant="navy">
          <Home size={16} aria-hidden="true" />
          Back to Home
        </Button>
        <Button to={ROUTES.events} variant="outline">
          Explore Events
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-1 items-center bg-surface">
      <Container className="py-20 lg:py-28">
        <Reveal
          className={cn(
            "mx-auto max-w-xl text-center",
            card &&
              "rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-10",
          )}
        >
          {body}
        </Reveal>
      </Container>
    </div>
  );
}

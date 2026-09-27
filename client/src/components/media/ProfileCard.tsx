import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";
import type { Alumnus } from "@/types";

interface ProfileCardProps {
  person: Alumnus;
  className?: string;
}

/**
 * ProfileCard — reusable alumni/member profile card.
 * The data shape mirrors the future /api/alumni response.
 */
export function ProfileCard({ person, className }: ProfileCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col items-center rounded-xl border border-line bg-white p-6 text-center shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {person.image ? (
        <img
          src={person.image}
          alt={person.imageAlt ?? `Portrait placeholder for ${person.name}`}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="size-16 rounded-full object-cover ring-2 ring-gold-500/30 ring-offset-2"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full bg-navy-900 font-display text-lg font-bold text-gold-300 ring-2 ring-gold-500/30 ring-offset-2"
        >
          {person.initials}
        </span>
      )}

      <h3 className="mt-4 font-display text-base font-semibold text-navy-900">
        <Link
          to={ROUTES.alumniDetail(person.username)}
          className="rounded-sm transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          {person.name}
        </Link>
      </h3>

      <Badge variant="navySoft" className="mt-2">
        {person.batch}
      </Badge>

      <p className="mt-3 text-sm font-medium text-gold-700">
        {person.role} · {person.company}
      </p>

      <p className="mt-2.5 text-sm leading-relaxed text-muted">{person.achievement}</p>
    </article>
  );
}

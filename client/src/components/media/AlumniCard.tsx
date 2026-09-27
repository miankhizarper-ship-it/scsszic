import { Link } from "react-router-dom";
import { ArrowRight, Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";
import type { Alumnus } from "@/types";

interface AlumniCardProps {
  person: Alumnus;
  className?: string;
}

/**
 * AlumniCard — directory card for the alumni network.
 * Portrait + identity + current role, linking to the full /alumni/:slug
 * profile. Data shape mirrors the future /api/alumni response.
 */
export function AlumniCard({ person, className }: AlumniCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md",
        className,
      )}
    >
      {/* Header band with portrait */}
      <div className="relative flex items-center gap-4 bg-navy-50/70 p-5">
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-xl bg-gradient-to-br from-gold-500/25 to-navy-300/20"
          />
          {person.image ? (
            <img
              src={person.image}
              alt={person.imageAlt ?? `Portrait placeholder for ${person.name}`}
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="relative size-[72px] rounded-xl object-cover shadow-sm"
            />
          ) : (
            <span className="relative grid size-[72px] place-items-center rounded-xl bg-navy-900 font-display text-lg font-bold text-gold-300 shadow-sm">
              {person.initials}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-navy-900">
            <Link
              to={ROUTES.alumniDetail(person.username)}
              className="rounded-sm transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              {person.name}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gold-700">
            <Briefcase size={13} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {person.role} · {person.company}
            </span>
          </p>
          <Badge variant="navySoft" className="mt-2">
            {person.batch}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        <p className="flex-1 text-sm leading-relaxed text-muted">{person.achievement}</p>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {person.field}
          </span>

          <Link
            to={ROUTES.alumniDetail(person.username)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900",
              "rounded-md transition-colors hover:text-gold-600",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
            )}
          >
            View Profile
            <ArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

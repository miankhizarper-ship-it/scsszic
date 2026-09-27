import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/routes/paths";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";

interface MemberCardProps {
  member: Member;
  className?: string;
}

/**
 * MemberCard — directory card for /members (and related rails).
 * Portrait or monogram, name, batch, role + domain, and top skills.
 */
export function MemberCard({ member, className }: MemberCardProps) {
  return (
    <Link
      to={ROUTES.profile(member.username)}
      className={cn(
        "group flex h-full flex-col items-center rounded-xl border border-line bg-white p-6 text-center shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
        className,
      )}
    >
      <span className="relative">
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold-500/25 to-navy-300/20"
        />
        <Avatar
          src={member.avatar}
          alt={member.avatarAlt ?? `Portrait placeholder for ${member.name}`}
          initials={member.initials}
          size={64}
          className="relative ring-2 ring-gold-500/30 ring-offset-2"
        />
      </span>

      <h3 className="mt-4 font-display text-base font-semibold text-navy-900">
        {member.name}
      </h3>

      <Badge variant="navySoft" className="mt-2">
        <GraduationCap size={11} aria-hidden="true" className="mr-1" />
        {member.batch}
      </Badge>

      <p className="mt-3 text-sm font-medium text-gold-700">
        {member.role}
        {member.company ? ` · ${member.company}` : ""}
      </p>
      <p className="mt-1 text-xs font-medium text-muted">{member.domain}</p>

      {member.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Top skills">
          {member.skills.slice(0, 3).map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-navy-100 bg-surface px-2 py-0.5 text-[11px] font-semibold text-navy-800"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-navy-900 transition-colors group-hover:text-gold-600">
        View profile
        <ArrowRight
          size={13}
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

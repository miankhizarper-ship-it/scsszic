import { Container } from "@/components/ui/Container";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import type { Alumnus } from "@/types";

interface ProfileShellProps {
  person: Alumnus;
  /** Primary content column (bio, highlights, …). */
  children: React.ReactNode;
  /** Optional sidebar column (skills, facts, …). */
  sidebar?: React.ReactNode;
  /** Rendered above the main grid, e.g. a breadcrumb row. */
  breadcrumb?: React.ReactNode;
}

/**
 * ProfileShell — reusable two-column profile layout.
 *
 * Shared identity band (ProfileHeader) + a main/aside content grid.
 * Used by alumni profiles now and member profiles (/profile/:username)
 * later, so every profile page in the product reads as one pattern.
 */
export function ProfileShell({ person, children, sidebar, breadcrumb }: ProfileShellProps) {
  return (
    <div className="bg-surface">
      <ProfileHeader person={person} />

      <Container className="py-10 lg:py-14">
        {breadcrumb}

        <div
          className={
            sidebar
              ? "grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10"
              : undefined
          }
        >
          <div className="min-w-0">{children}</div>

          {sidebar && <aside className="min-w-0">{sidebar}</aside>}
        </div>
      </Container>
    </div>
  );
}

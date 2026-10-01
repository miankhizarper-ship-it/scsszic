import { Code2 } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DeveloperCard } from "@/components/media/DeveloperCard";
import { useTeamGroup } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";
import type { TeamMember } from "@/types";

/**
 * DevelopersSection — the people who build and maintain the SCS platform
 * (Phase 12). The dark navy DeveloperCards pop against a LIGHT band so the
 * section reads as a distinct, technical beat — and the closing JoinCTA
 * navy-950 band stays the page's single dark finale (two adjacent navy
 * bands used to bleed together). Cards come from the admin-managed Team
 * CMS (group = "developers") — up to eight, with the responsive grid
 * wrapping into extra rows as the crew grows — and the section hides
 * itself while loading, on error, or when no published cards exist.
 */
export function DevelopersSection() {
  const teamQuery = useTeamGroup("developers", 8);
  const developers = teamQuery.data;

  if (teamQuery.isPending || teamQuery.isError || !developers || developers.length === 0) {
    return null;
  }

  const members: TeamMember[] = developers.map((card) => ({
    id: card.id,
    name: card.name,
    position: card.position,
    description: card.description,
    initials: card.initials,
    image: card.image,
    imageAlt: card.imageAlt,
    /* The service layer already resolved icon keys to components. */
    socials: card.socials,
  }));

  return (
    <section
      aria-labelledby="developers-heading"
      className="relative overflow-hidden bg-white py-20 lg:py-24"
    >
      {/* Decorative layers — the light-surface treatment: faint navy grid
          plus two soft navy/gold glows so the band never reads flat. */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-light mask-fade-radial" />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 left-[-10%] h-[380px] w-[380px] rounded-full bg-navy-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -top-24 right-[-10%] h-[320px] w-[320px] rounded-full bg-gold-300/20 blur-3xl"
      />

      <Container className="relative">
        <SectionHeading
          id="developers-heading"
          label="Developers"
          title="Built by members, for members"
          description="This platform is designed, engineered, and maintained by the society's own development team — real projects, shipped to real users."
          action={{ label: "See member projects", to: ROUTES.projects }}
        />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member, index) => (
            <Reveal key={member.id} delay={(index % 4) * 0.08} className="h-full">
              <li className="h-full">
                <DeveloperCard member={member} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.24}>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-muted">
            <Code2 size={14} aria-hidden="true" className="text-gold-600" />
            Want to build with us? Join the society and pick a project team.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

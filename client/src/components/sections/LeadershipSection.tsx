import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamMemberCard } from "@/components/media/TeamMemberCard";
import { useTeamGroup } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";
import type { TeamMember } from "@/types";

/**
 * LeadershipSection — the society's leadership on the home page (Phase 12).
 *
 * Cards come from the admin-managed Team CMS (group = "leaders") — the
 * same records the About page's leadership strip renders. The section
 * hides itself entirely while loading, on error, or when no published
 * cards exist: an empty CMS means "nothing to show", never an error box
 * or a bare heading on the home page.
 */
export function LeadershipSection() {
  const teamQuery = useTeamGroup("leaders", 4);
  const leaders = teamQuery.data;

  if (teamQuery.isPending || teamQuery.isError || !leaders || leaders.length === 0) {
    return null;
  }

  const members: TeamMember[] = leaders.map((card) => ({
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
    <section aria-labelledby="leadership-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="leadership-heading"
          label="Leadership"
          title="The team behind SCS"
          description="The students who plan the sessions, run the events, and keep the society moving — elected every year, working all year."
          action={{ label: "Learn about the society", to: ROUTES.about }}
        />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member, index) => (
            <Reveal key={member.id} delay={(index % 4) * 0.08} className="h-full">
              <li className="h-full">
                <TeamMemberCard member={member} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

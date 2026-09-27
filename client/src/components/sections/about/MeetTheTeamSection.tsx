import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TeamMemberCard } from "@/components/media/TeamMemberCard";
import { TEAM_MEMBERS } from "@/data/teamMembers";

/**
 * MeetTheTeamSection — current leadership of the society.
 * Placeholder roles/portraits now; swap TEAM_MEMBERS for API data later
 * without touching this section.
 */
export function MeetTheTeamSection() {
  return (
    <section aria-labelledby="team-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="team-heading"
          label="Leadership"
          title="Meet the team"
          description="The students who keep SCS running — planning sessions, coordinating events, and building the society's technical backbone. Roles refresh annually."
        />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM_MEMBERS.map((member, index) => (
            <Reveal key={member.id} delay={(index % 3) * 0.08} className="h-full">
              <li className="h-full">
                <TeamMemberCard member={member} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2}>
          <p className="mt-8 text-center text-sm text-muted">
            Portraits shown are placeholder tiles — official team photos will replace
            them once collected.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

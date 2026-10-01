import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MemberCard } from "@/components/members/MemberCard";
import { useMemberSpotlights } from "@/hooks/content";
import { ROUTES } from "@/routes/paths";

/**
 * MembersSection — a spotlight of society members on the home page
 * (Phase 12). Reads the canonical member-directory order (featured
 * members first, newest batch, then name) capped to eight cards, and the
 * responsive grid wraps into extra rows as the directory grows, so a
 * bigger spotlight stays a tidy grid instead of one long strip.
 * Flagging a member as "featured" in the Members CMS surfaces them here
 * automatically. The section hides itself when the directory is empty.
 */
export function MembersSection() {
  const membersQuery = useMemberSpotlights(8);
  const members = membersQuery.data;

  if (membersQuery.isPending || membersQuery.isError || !members || members.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="members-spotlight-heading" className="bg-surface py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="members-spotlight-heading"
          label="Our Members"
          title="Powered by its people"
          description="Builders, learners, and organizers — the members are the society. Meet a few of them, or browse the full directory."
          action={{ label: "Browse all members", to: ROUTES.members }}
        />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member, index) => (
            <Reveal key={member.id} delay={(index % 4) * 0.06} className="h-full">
              <li className="h-full">
                <MemberCard member={member} className="h-full" />
              </li>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

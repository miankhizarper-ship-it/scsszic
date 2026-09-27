import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProfileCard } from "@/components/media/ProfileCard";
import { ALUMNI } from "@/data/alumni";
import { ROUTES } from "@/routes/paths";

/**
 * AlumniHighlight — a few graduates making an impact.
 * Structure is ready for real MongoDB-backed profiles in Phase 2.
 */
export function AlumniHighlight() {
  return (
    <section aria-labelledby="alumni-heading" className="bg-white py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="alumni-heading"
          label="Our Alumni"
          title="SCS graduates, out in the world"
          description="Our alumni work across software engineering, research, and startups — and they stay connected to the society."
          action={{ label: "Meet our alumni", to: ROUTES.alumni }}
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Highlight only the first few profiles; the full directory lives at /alumni */}
          {ALUMNI.slice(0, 3).map((person, index) => (
            <Reveal key={person.id} delay={index * 0.08} className="h-full">
              <ProfileCard person={person} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

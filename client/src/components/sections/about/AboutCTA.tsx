import { CTASection } from "@/components/sections/CTASection";
import { ROUTES } from "@/routes/paths";

/**
 * AboutCTA — closing call-to-action for the About page.
 * Reuses the shared CTASection band for consistency with Home.
 */
export function AboutCTA() {
  return (
    <CTASection
      id="about-cta"
      eyebrow="About SCS"
      title="Be Part of SCS"
      description="The society is only as strong as the students inside it. Bring your curiosity — we'll provide the community, the projects, and the people who will push you further."
      primary={{ label: "Join the Community", to: ROUTES.signup }}
      secondary={{ label: "Explore Events", to: ROUTES.events }}
      note="Membership is open to all students of Shaikh Zayed Islamic Centre, University of Peshawar."
    />
  );
}

import { CTASection } from "@/components/sections/CTASection";
import { ROUTES } from "@/routes/paths";

/**
 * JoinCTA — closing call-to-action for the Home page.
 * Reuses the shared CTASection band.
 */
export function JoinCTA() {
  return (
    <CTASection
      id="join-cta"
      eyebrow="Join SCS"
      title="Be Part of the Community"
      description="Grow your skills, expand your network, and build things that matter — alongside the students of SZIC who share your passion for technology and collaboration."
      primary={{ label: "Join the Community", to: ROUTES.signup }}
      secondary={{ label: "Explore Events", to: ROUTES.events }}
      note="Membership is open to all students of Shaikh Zayed Islamic Centre, University of Peshawar."
    />
  );
}

import { PageHero } from "@/components/ui/PageHero";
import { AboutIntro } from "@/components/sections/about/AboutIntro";
import { MissionSection } from "@/components/sections/about/MissionSection";
import { VisionSection } from "@/components/sections/about/VisionSection";
import { WhatWeDoSection } from "@/components/sections/about/WhatWeDoSection";
import { CommunityAreasSection } from "@/components/sections/about/CommunityAreasSection";
import { SocietyValuesSection } from "@/components/sections/about/SocietyValuesSection";
import { MeetTheTeamSection } from "@/components/sections/about/MeetTheTeamSection";
import { AboutCTA } from "@/components/sections/about/AboutCTA";
import { usePageMetadata } from "@/lib/seo";

/**
 * AboutPage — the story of SCS.
 * Order: Hero → Society introduction → Mission → Vision → What we do →
 * Community areas → Values → Team → CTA.
 */
export default function AboutPage() {
  usePageMetadata({
    title: "About SCS | Society of Computer Science",
    description:
      "Learn about the Society of Computer Science at SZIC — our mission, vision, values, community areas, and the student team behind the community.",
  });

  return (
    <>
      <PageHero
        id="about-heading"
        eyebrow="About SCS"
        title={
          <>
            Empowering the Next Generation of{" "}
            <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              Computer Scientists
            </span>
          </>
        }
        description="SCS is the student-centered Computer Science community of Shaikh Zayed Islamic Centre, University of Peshawar — a place where students learn from each other, build together, and grow into engineers, researchers, and founders."
      />

      <AboutIntro />
      <MissionSection />
      <VisionSection />
      <WhatWeDoSection />
      <CommunityAreasSection />
      <SocietyValuesSection />
      <MeetTheTeamSection />
      <AboutCTA />
    </>
  );
}

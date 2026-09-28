import { Hero } from "@/components/sections/Hero";
import { SocietyIntro } from "@/components/sections/SocietyIntro";
import { Stats } from "@/components/sections/Stats";
import { UpcomingEvents } from "@/components/sections/UpcomingEvents";
import { CommunityPreview } from "@/components/sections/CommunityPreview";
import { FeaturedBlog } from "@/components/sections/FeaturedBlog";
import { LeadershipSection } from "@/components/sections/LeadershipSection";
import { Highlights } from "@/components/sections/Highlights";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { MembersSection } from "@/components/sections/MembersSection";
import { DevelopersSection } from "@/components/sections/DevelopersSection";
import { JoinCTA } from "@/components/sections/JoinCTA";
import { usePageMetadata } from "@/lib/seo";

/**
 * HomePage — Phase 12 layout.
 * Order: Hero → Society intro → Stats → Events → Community feed →
 * Featured blog (full-size cards) → Leadership → Highlights → Gallery →
 * Members spotlight → Developers → Join CTA.
 *
 * The three people sections (Leadership / Members / Developers) are
 * admin-managed and hide themselves when their data is empty, so the page
 * always shows only real, curated content.
 */
export default function HomePage() {
  usePageMetadata({
    // Canonical home metadata (spec): no suffix, exact brand title.
    title: "Society of Computer Science | SZIC",
    description:
      "Society of Computer Science at SZIC — a student-driven community focused on technology, learning, innovation, collaboration, and real-world computing experiences.",
  });

  return (
    <>
      <Hero />
      <SocietyIntro />
      <Stats />
      <UpcomingEvents />
      <CommunityPreview />
      <FeaturedBlog />
      <LeadershipSection />
      <Highlights />
      <GalleryPreview />
      <MembersSection />
      <DevelopersSection />
      <JoinCTA />
    </>
  );
}

import { Hero } from "@/components/sections/Hero";
import { SocietyIntro } from "@/components/sections/SocietyIntro";
import { Stats } from "@/components/sections/Stats";
import { UpcomingEvents } from "@/components/sections/UpcomingEvents";
import { CommunityPreview } from "@/components/sections/CommunityPreview";
import { FeaturedBlog } from "@/components/sections/FeaturedBlog";
import { Highlights } from "@/components/sections/Highlights";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { AlumniHighlight } from "@/components/sections/AlumniHighlight";
import { JoinCTA } from "@/components/sections/JoinCTA";
import { usePageMetadata } from "@/lib/seo";

/**
 * HomePage — Phase 1 showpiece.
 * Order: Hero → Society intro → Stats → Events → Community feed →
 * Featured blog → Highlights → Gallery → Alumni → Join CTA.
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
      <Highlights />
      <GalleryPreview />
      <AlumniHighlight />
      <JoinCTA />
    </>
  );
}

import { ShieldCheck } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { usePageMetadata, buildPageTitle } from "@/lib/seo";

export default function PrivacyPage() {
  usePageMetadata({
    title: buildPageTitle("Privacy Policy"),
    description: "How the Society of Computer Science collects, uses, and protects your data.",
  });

  return (
    <PlaceholderPage
      title="Privacy Policy"
      description="Our full privacy policy — covering data collection, storage, and your rights — will be published here before accounts go live."
      icon={ShieldCheck}
    />
  );
}

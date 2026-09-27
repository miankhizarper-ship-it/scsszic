import { Mail } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { usePageMetadata, buildPageTitle } from "@/lib/seo";

export default function ContactPage() {
  usePageMetadata({
    title: buildPageTitle("Contact"),
    description:
      "Get in touch with the Society of Computer Science at SZIC, University of Peshawar.",
  });

  return (
    <PlaceholderPage
      title="Contact Us"
      description="The contact form and society email address will be available here. In the meantime, reach out through the community or at an event."
      icon={Mail}
    />
  );
}

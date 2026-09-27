import { FileText } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { usePageMetadata, buildPageTitle } from "@/lib/seo";

export default function TermsPage() {
  usePageMetadata({
    title: buildPageTitle("Terms of Service"),
    description: "Terms governing the use of the Society of Computer Science platform.",
  });

  return (
    <PlaceholderPage
      title="Terms of Service"
      description="The complete terms governing use of the SCS platform will be published here before accounts go live."
      icon={FileText}
    />
  );
}

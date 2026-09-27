import { SearchX } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { usePageMetadata } from "@/lib/seo";

export default function NotFoundPage() {
  usePageMetadata({
    title: "Page Not Found",
    description:
      "The page you are looking for could not be found on the Society of Computer Science platform.",
  });

  return (
    <PlaceholderPage
      title="Page Not Found"
      description="The page you're looking for doesn't exist or may have moved. Head back home to find what you need."
      icon={SearchX}
    />
  );
}

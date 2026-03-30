import type { Metadata } from "next";
import DocsPageContent from "./DocsPageContent";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Docs — Revenue Operator",
  description:
    "Read Revenue Operator docs for onboarding, workflow setup, campaigns, integrations, and troubleshooting. Get your revenue operations live quickly and confidently.",
  alternates: { canonical: `${BASE}/docs` },
  openGraph: {
    title: "Docs — Revenue Operator",
    description:
      "Read Revenue Operator docs for onboarding, workflow setup, campaigns, integrations, and troubleshooting. Get your revenue operations live quickly and confidently.",
    url: `${BASE}/docs`,
    siteName: "Revenue Operator",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs — Revenue Operator",
    description:
      "Read Revenue Operator docs for onboarding, workflow setup, campaigns, integrations, and troubleshooting. Get your revenue operations live quickly and confidently.",
    images: ["/opengraph-image"],
  },
};

export default function DocsPage() {
  return <DocsPageContent />;
}

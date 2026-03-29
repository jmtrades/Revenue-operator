import type { Metadata } from "next";
import IndustriesPageContent from "./IndustriesPageContent";

export const metadata: Metadata = {
  title: "Industries — AI Revenue Operations for Every Business",
  description:
    "Industry-specific AI revenue agents for HVAC, dental, legal, real estate, healthcare, and 30+ more. Inbound calls, outbound campaigns, follow-ups, booking, and revenue recovery.",
  openGraph: {
    title: "Industries — Revenue Operator",
    description:
      "AI revenue operations platform built for HVAC, dental, legal, real estate, healthcare, and every service business.",
    url: "https://www.revenueoperator.ai/industries",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Industries — Revenue Operator",
    description:
      "AI revenue operations for HVAC, dental, legal, real estate, healthcare, and 30+ industries.",
  },
};

export default function IndustriesPage() {
  return <IndustriesPageContent />;
}

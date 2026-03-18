import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent, ANNUAL_NOTE, pricingCopyForTests } from "@/components/PricingContent";

export { ANNUAL_NOTE, pricingCopyForTests };

const BASE = "https://www.recall-touch.com";

// NOTE: Metadata is static and cannot use next-intl translations.
// To support localized metadata, use generateMetadata() with getLocale() and getTranslations().
// For now, metadata uses English strings. Each locale can override by providing locale-specific
// metadata in separate layout files or using middleware to set metadata per locale.

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pricing for the AI Revenue Execution System. Land on Solo, grow into Business, and scale into multi-location and teams with transparent ROI-first plans.",
  alternates: { canonical: `${BASE}/pricing` },
  openGraph: {
    title: "Pricing",
    description: "Pricing for the AI Revenue Execution System. Transparent, ROI-first plans that scale with your call volume and outcomes.",
    url: `${BASE}/pricing`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Recall Touch Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: "ROI-first pricing for the AI Revenue Execution System.",
  },
};

export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <PricingContent />
      <Footer />
    </div>
  );
}

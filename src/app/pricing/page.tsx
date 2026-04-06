import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent } from "@/components/PricingContent";

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
    siteName: "Revenue Operator",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Revenue Operator Pricing" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: "ROI-first pricing for the AI Revenue Execution System.",
    creator: "@revenueoperator",
  },
};

export default function PricingPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Pricing", item: `${BASE}/pricing` },
    ],
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MarketingNavbar />
      <PricingContent />
      <Footer />
    </div>
  );
}

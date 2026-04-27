import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent } from "@/components/PricingContent";
import { PRICING_TIERS } from "@/lib/constants";

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

  // Phase 91 — Schema.org Product + Offer markup so Google can render
  // pricing rich-result snippets in search. Each tier becomes an Offer
  // with a numeric price extracted from the constant string ("$297" →
  // 297). priceCurrency hard-coded to USD to match constants today;
  // when multi-currency ships this should pull from workspace billing.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Revenue Operator",
    description:
      "AI revenue operations platform. An AI operator that answers your phone, books your meetings, and calls every lead back — 24/7, in your voice. Compliance-first (TCPA, two-party recording, DNC), CRM + calendar integrations, hallucination-guarded.",
    brand: { "@type": "Brand", name: "Revenue Operator" },
    url: `${BASE}/pricing`,
    image: `${BASE}/opengraph-image`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: extractDollars(PRICING_TIERS[0]?.priceMonthly ?? "$0"),
      highPrice: extractDollars(
        PRICING_TIERS[PRICING_TIERS.length - 1]?.priceMonthly ?? "$0"
      ),
      offerCount: PRICING_TIERS.length,
      offers: PRICING_TIERS.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        price: extractDollars(tier.priceMonthly),
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: extractDollars(tier.priceMonthly),
          priceCurrency: "USD",
          unitCode: "MON",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        url: `${BASE}/pricing`,
        availability: "https://schema.org/InStock",
        itemOffered: {
          "@type": "Service",
          name: `Revenue Operator — ${tier.name}`,
          description: tier.description,
        },
      })),
    },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <MarketingNavbar />
      <PricingContent />
      <Footer />
    </div>
  );
}

/** Extract a numeric dollar amount from a tier price string ("$297" → 297). */
function extractDollars(priceString: string): number {
  const m = priceString.match(/[\d,]+/);
  if (!m) return 0;
  return Number(m[0].replace(/,/g, "")) || 0;
}

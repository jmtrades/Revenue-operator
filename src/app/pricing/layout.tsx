import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for commercial call governance. Start free. Scale as you grow.",
};

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Recall Touch",
  description: "Commercial call governance infrastructure",
  offers: [
    { "@type": "Offer", name: "Solo", price: "49", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Growth", price: "149", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Team", price: "0", priceCurrency: "USD", description: "Custom pricing" },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {children}
    </>
  );
}

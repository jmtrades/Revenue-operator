import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "ROI-first pricing for the AI Revenue Execution System. Start on Solo, upgrade into Business, and scale into multi-location and teams.",
};

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Recall Touch",
  description: "AI Revenue Execution System for service businesses and teams",
  offers: [
    { "@type": "Offer", name: "Solo", price: "49", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Business", price: "297", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Scale", price: "997", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Enterprise", price: "0", priceCurrency: "USD", description: "Custom pricing" },
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

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "ROI-first pricing for AI that makes and takes your phone calls. Start on Starter, grow into Growth, and scale into Business or Agency.",
};

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Recall Touch",
  description: "AI that makes and takes your phone calls",
  offers: [
    { "@type": "Offer", name: "Starter", price: "97", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Growth", price: "297", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Business", price: "597", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
    { "@type": "Offer", name: "Agency", price: "997", priceCurrency: "USD", priceValidUntil: "2026-12-31" },
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

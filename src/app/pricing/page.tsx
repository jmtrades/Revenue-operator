import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent, ANNUAL_NOTE, pricingCopyForTests } from "@/components/PricingContent";

export { ANNUAL_NOTE, pricingCopyForTests };

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for AI phone communication. From $297/month. Answer calls, send texts, book appointments, and follow up automatically.",
  alternates: { canonical: `${BASE}/pricing` },
  openGraph: {
    title: "Pricing",
    description: "Simple pricing for AI phone communication. From $297/month. Answer calls, send texts, book appointments, and follow up automatically.",
    url: `${BASE}/pricing`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Recall Touch Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: "Simple pricing for AI phone communication. From $297/month.",
  },
};

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Recall Touch",
  description: "AI phone system for business. Answer every call 24/7, book appointments, qualify leads.",
  brand: { "@type": "Brand", name: "Recall Touch" },
  offers: [
    { "@type": "Offer", name: "Starter", price: "297", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" } },
    { "@type": "Offer", name: "Growth", price: "497", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" } },
    { "@type": "Offer", name: "Scale", price: "2400", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" } },
  ],
};

export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />
      <Navbar />
      <PricingContent />
      <Footer />
    </div>
  );
}

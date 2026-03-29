import type { Metadata } from "next";

const BASE = "https://www.revenueoperator.ai";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides, API reference, and compliance framework documentation for Revenue Operator.",
  alternates: { canonical: `${BASE}/docs` },
  openGraph: {
    title: "Documentation — Revenue Operator",
    description: "Guides, API reference, and compliance framework documentation for Revenue Operator.",
    url: `${BASE}/docs`,
    siteName: "Revenue Operator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — Revenue Operator",
    description: "Guides, API reference, and compliance framework documentation for Revenue Operator.",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE },
    { "@type": "ListItem", position: 2, name: "Documentation", item: `${BASE}/docs` },
  ],
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}

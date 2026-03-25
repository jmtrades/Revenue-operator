import type { Metadata } from "next";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides, API reference, and compliance framework documentation for Recall Touch.",
  alternates: { canonical: `${BASE}/docs` },
  openGraph: {
    title: "Documentation — Recall Touch",
    description: "Guides, API reference, and compliance framework documentation for Recall Touch.",
    url: `${BASE}/docs`,
    siteName: "Recall Touch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — Recall Touch",
    description: "Guides, API reference, and compliance framework documentation for Recall Touch.",
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

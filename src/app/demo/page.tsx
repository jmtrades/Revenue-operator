import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { DemoPageContent } from "./DemoPageContent";
import { DemoSampleSection } from "./DemoSampleSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demoPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DemoPage() {
  const BASE = "https://www.recall-touch.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Demo", item: `${BASE}/demo` },
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
      <main className="pt-28 pb-24">
        <DemoPageContent />
        <DemoSampleSection />
      </main>
      <Footer />
    </div>
  );
}


import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { DemoPageContent } from "./DemoPageContent";
import { DemoSampleSection } from "./DemoSampleSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demoPage");
  return {
    title: `${t("metaTitle")} — Recall Touch`,
    description: t("metaDescription"),
  };
}

export default async function DemoPage() {
  const cookieStore = await cookies();
  const initialAuthenticated =
    cookieStore.has("revenue_session") ||
    cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  const BASE = "https://www.recall-touch.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
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
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main className="pt-28 pb-24">
        <DemoPageContent />
        <DemoSampleSection />
      </main>
      <Footer />
    </div>
  );
}


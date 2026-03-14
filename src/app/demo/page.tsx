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
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DemoPage() {
  const cookieStore = await cookies();
  const initialAuthenticated =
    cookieStore.has("revenue_session") ||
    cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main className="pt-28 pb-24">
        <DemoPageContent />
        <DemoSampleSection />
      </main>
      <Footer />
    </div>
  );
}


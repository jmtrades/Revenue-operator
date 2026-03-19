import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { ActivateWizard } from "./ActivateWizard";
import { TranslatedErrorBoundary } from "@/components/ErrorBoundary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activate");
  return {
    title: t("activatePage.title"),
    description: t("activatePage.description"),
  };
}

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar />
      <main className="pt-24 pb-20">
        <TranslatedErrorBoundary>
          <ActivateWizard />
        </TranslatedErrorBoundary>
      </main>
    </div>
  );
}


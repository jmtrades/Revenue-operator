"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DemoSimulatorSection } from "@/components/demo/DemoSimulatorSection";
import { ROUTES } from "@/lib/constants";

export function DemoSampleSection() {
  const t = useTranslations("demoPage");

  return (
    <div className="max-w-3xl mx-auto px-4 mt-16">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{t("watchSampleCall")}</h2>
          <p className="text-sm text-zinc-400 mt-1">{t("watchSampleCallDesc")}</p>
        </div>
        <Link
          href={ROUTES.START}
          className="btn-marketing-primary no-underline inline-flex items-center justify-center"
        >
          {t("startFreeSetup")}
        </Link>
      </div>
      <DemoSimulatorSection />
    </div>
  );
}

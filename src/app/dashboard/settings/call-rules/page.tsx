"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function SettingsCallRulesPage() {
  const t = useTranslations("dashboard");
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.callRulesSettings.title")} subtitle={t("pages.callRulesSettings.subtitle")} />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("settingsSubpages.callRulesHint")}
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.openFullSettingsCallRules")}
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function SettingsBusinessPage() {
  const t = useTranslations("dashboard");
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.businessSettings.title")} subtitle={t("pages.businessSettings.subtitle")} />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("settingsSubpages.businessUpdateHint")}
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.openFullSettingsBusiness")}
      </Link>
    </div>
  );
}

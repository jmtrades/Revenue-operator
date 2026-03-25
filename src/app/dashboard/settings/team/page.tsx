"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function SettingsTeamPage() {
  const t = useTranslations("dashboard");
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.teamSettings.title")} subtitle={t("pages.teamSettings.subtitle")} />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("settingsSubpages.teamManageHint")}
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.openFullSettingsTeam")}
      </Link>
      <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
      <Link href="/dashboard/settings/operators" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.operators")}
      </Link>
    </div>
  );
}

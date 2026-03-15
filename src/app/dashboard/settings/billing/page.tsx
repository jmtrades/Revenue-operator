"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function SettingsBillingPage() {
  const t = useTranslations("dashboard");
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.billingSettings.title")} subtitle={t("pages.billingSettings.subtitle")} />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("settingsSubpages.billingViewHint")}
      </p>
      <Link href="/dashboard/billing" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.openBilling")}
      </Link>
      <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        {t("settingsSubpages.fullSettings")}
      </Link>
    </div>
  );
}

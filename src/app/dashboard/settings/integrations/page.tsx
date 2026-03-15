"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function IntegrationsPage() {
  const t = useTranslations("dashboard");
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.integrationsSettings.title")} subtitle={t("pages.integrationsSettings.subtitle")} />
      <div className="mt-6 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("settingsSubpages.integrationSettingsHint")}</p>
      </div>
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/settings${q}`} style={{ color: "var(--text-muted)" }}>{t("settingsSubpages.backToSettings")}</Link>
      </p>
    </div>
  );
}

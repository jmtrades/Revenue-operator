"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function IntegrationsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.integrations.title")} subtitle={t("pages.integrations.subtitleShort")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.integrationsAppearHere")} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.integrations.title")} subtitle={t("pages.integrations.subtitle")} />
      <div className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("integrationsPage.googleCalendar")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t("integrationsPage.googleCalendarDesc")}</p>
          </div>
          <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>{t("integrationsPage.connect")}</button>
        </div>
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("integrationsPage.crm")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t("integrationsPage.crmDesc")}</p>
          </div>
          <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>{t("integrationsPage.connect")}</button>
        </div>
        <Link href="/dashboard/settings" className="inline-block text-sm mt-4" style={{ color: "var(--accent)" }}>{t("integrationsPage.settingsLink")}</Link>
      </div>
    </div>
  );
}

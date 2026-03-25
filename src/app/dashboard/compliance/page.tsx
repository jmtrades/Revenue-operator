"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function CompliancePage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.compliance.title")} subtitle={t("pages.compliance.subtitle")} />
      {!workspaceId ? (
        <EmptyState icon="pulse" title={t("empty.selectContext")} subtitle={t("empty.complianceAppearHere")} />
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>{t("compliancePage.overviewTitle")}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {t("compliancePage.overviewBody")}
            </p>
            <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>{t("compliancePage.exportPdf")}</button>
          </div>
          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>{t("compliancePage.auditTrailTitle")}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{t("compliancePage.auditTrailBody")}</p>
          </div>
          <p className="text-sm">
            <Link href={`/dashboard/policies${q}`} style={{ color: "var(--text-muted)" }}>{t("compliancePage.policiesLink")}</Link>
          </p>
        </div>
      )}
    </div>
  );
}

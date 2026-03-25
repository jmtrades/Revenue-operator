"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function EscalationsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.escalations.title")} subtitle={t("pages.escalations.subtitle")} />
      {!workspaceId ? (
        <EmptyState icon="pulse" title={t("empty.selectContext")} subtitle={t("empty.escalationsAppearHere")} />
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("escalationsPage.record")}</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("escalationsPage.level")}</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("escalationsPage.reason")}</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("escalationsPage.since")}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td colSpan={4} className="py-12 px-4 text-center" style={{ color: "var(--text-muted)" }}>
                  {t("escalationsPage.noActiveEscalations")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/approvals${q}`} style={{ color: "var(--text-muted)" }}>{t("escalationsPage.approvalsLink")}</Link>
      </p>
    </div>
  );
}

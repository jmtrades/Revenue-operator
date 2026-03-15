"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function FollowUpsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.followUps.title")} subtitle={t("pages.followUps.subtitle")} />
      {!workspaceId ? (
        <EmptyState icon="pulse" title={t("empty.selectContext")} subtitle={t("empty.followUpQueueAppearHere")} />
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("followUpsPage.contact")}</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("followUpsPage.due")}</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>{t("followUpsPage.status")}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td colSpan={3} className="py-12 px-4 text-center" style={{ color: "var(--text-muted)" }}>
                  {t("followUpsPage.noPendingFollowUps")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/record${q}`} style={{ color: "var(--text-muted)" }}>{t("followUpsPage.viewRecord")}</Link>
      </p>
    </div>
  );
}

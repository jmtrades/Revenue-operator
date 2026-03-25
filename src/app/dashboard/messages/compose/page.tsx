"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function ComposePage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.compose.title")} subtitle={t("pages.compose.subtitle")} />
      {!workspaceId ? (
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.composeAppearHere")} />
      ) : (
        <div className="space-y-6 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("composeHints.hint1")}
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("composeHints.hint2")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/templates${q}`} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: "var(--btn-primary-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} aria-label={t("empty.chooseTemplate")}>{t("empty.chooseTemplate")}</Link>
            <Link href={`/dashboard/messages${q}`} className="text-sm" style={{ color: "var(--text-muted)" }}>{t("composeHints.backToMessages")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

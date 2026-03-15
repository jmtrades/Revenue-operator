"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

export default function RevenuePage() {
  const t = useTranslations("dashboard.revenue");
  const { workspaceId } = useWorkspace();
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/lifecycle-metrics?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((data) => {
        setError(!!data?.error);
      })
      .catch(() => setError(true));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>{t("followThroughInPlace")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--meaning-red)" }}>{t("normalConditionsNotPresent")}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <p style={{ color: "var(--text-primary)" }}>{t("calmMessage")}</p>
    </div>
  );
}

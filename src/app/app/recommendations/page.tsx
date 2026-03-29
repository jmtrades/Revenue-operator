"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function RecommendationsPage() {
  const t = useTranslations("common");

  useEffect(() => {
    document.title = t("recommendations.pageTitle", { defaultValue: "Recommendations — Recall Touch" });
    return () => { document.title = ""; };
  }, [t]);

  return (
    <div className="space-y-6 px-1">
      <Breadcrumbs items={[{ label: "Recommendations" }]} />

      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Recommendations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Actionable insights to improve call performance and recover revenue.
        </p>
      </div>

      <div
        className="rounded-xl border p-12 text-center"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="mx-auto max-w-md space-y-3">
          <p
            className="text-lg font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Recommendations will appear here
          </p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            As your AI agent handles more calls, the system will surface
            actionable insights on missed revenue, follow-up opportunities, and
            process improvements.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Assurance — verification, not metrics.
 * No logs, counts, or timelines. Only demonstrable correctness language.
 */
export default function AssurancePage() {
  const t = useTranslations("dashboard.assurance");
  const { workspaceId } = useWorkspace();

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-2xl">
        <p style={{ color: "var(--text-muted)" }}>{t("authorityPresent")}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-16">
      <header>
        <h1 className="text-xl font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          {t("subtitle")}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("eventsOrdered")}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          {t("eventsOrderedBody")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("outcomesVerified")}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          {t("outcomesVerifiedBody")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("responsibilityConcludes")}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          {t("responsibilityConcludesBody")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("invalidStates")}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          {t("invalidStatesBody")}
        </p>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t("relianceDefined")}
      </p>
    </div>
  );
}

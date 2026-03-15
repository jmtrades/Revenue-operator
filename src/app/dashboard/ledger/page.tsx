"use client";

import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Ledger — entries define operational state.
 * Institutional only. No metrics, no claims.
 */
export default function LedgerPage() {
  const t = useTranslations("dashboard.ledger");
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
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          {t("subtitle")}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("entryStates")}
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>{t("stateNormal")}</li>
          <li>{t("stateOutsideAuthority")}</li>
          <li>{t("stateBeyondScope")}</li>
          <li>{t("stateExposure")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("entryMeaning")}
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>{t("meaningNormal")}</li>
          <li>{t("meaningOutside")}</li>
          <li>{t("meaningBeyond")}</li>
          <li>{t("meaningExposure")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          {t("resolution")}
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>{t("resolveConcludes")}</li>
          <li>{t("resolveRestores")}</li>
        </ul>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t("boundary")}
      </p>
    </div>
  );
}

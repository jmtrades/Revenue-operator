"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type SummaryResponse = {
  revenue_recovered_cents?: number;
};

export default function PartnersPage() {
  const t = useTranslations("partners");
  const tBreadcrumbs = useTranslations("breadcrumbs");
  const { workspaceId, workspaceName } = useWorkspace();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenueCents, setRevenueCents] = useState(0);

  const shareRate = 0.15;
  const partnerShareCents = useMemo(() => Math.max(0, Math.round(revenueCents * shareRate)), [revenueCents]);

  useEffect(() => {
    if (!workspaceId) return;

    void (async () => {
      try {
        const r = await fetch(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" });
        if (!r.ok) throw new Error("Fetch failed");
        const j = (await r.json()) as SummaryResponse;
        setRevenueCents(typeof j?.revenue_recovered_cents === "number" ? j.revenue_recovered_cents : 0);
        setError(null);
      } catch {
        setError("Unable to load partner dashboard");
      } finally {
        setLoaded(true);
      }
    })();
  }, [workspaceId]);

  const fmtMoney = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tBreadcrumbs("home"), href: "/app" }, { label: tBreadcrumbs("partners") }]} />
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            {workspaceName ? `${workspaceName}` : "Workspace"} · {t("subtitle")}
          </p>
        </div>
      </div>

      {!loaded ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 skeleton-shimmer">
          <div className="h-10 w-56 bg-[var(--bg-hover)] rounded mb-4" />
          <div className="h-14 w-full bg-[var(--bg-hover)] rounded" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {error}
          </p>
        </div>
      ) : revenueCents === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No revenue recovered yet. As your AI operator books calls and generates revenue, your partner share will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              {t("revenue_recovered_label")}
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
              {fmtMoney(revenueCents)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:col-span-2">
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              {t("partner_share_label")}
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
              {fmtMoney(partnerShareCents)}
            </p>
            <p className="text-sm mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {t("reporting_consistency_description")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


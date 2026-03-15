"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { MetricsSkeleton } from "@/components/ui/MetricsSkeleton";
import Link from "next/link";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Summary {
  calls_last_7_days: number;
  appointments_total: number;
  appointments_upcoming: number;
}

interface Usage {
  calls: number;
  messages: number;
  calls_limit: number;
  messages_limit: number;
  calls_pct: number;
  messages_pct: number;
}

export default function AnalyticsPage() {
  const t = useTranslations("dashboard");
  const ta = useTranslations("dashboard.analyticsPage");
  const { workspaceId } = useWorkspace();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setSummary(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback<Summary>(`/api/analytics/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<Usage>(`/api/usage?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ]).then(([r1, r2]) => {
      if (r1.data) setSummary(r1.data);
      if (r2.data) setUsage(r2.data);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.analytics.title")} subtitle={t("pages.analytics.subtitleShort")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.analyticsAppearHere")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.analytics.title")} subtitle={t("pages.analytics.subtitle")} />
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <MetricsSkeleton cards={3} />
        </div>
      </div>
    );
  }

  const usageAlert = usage && (usage.calls_pct >= 100 || usage.messages_pct >= 100);
  const usageWarn = usage && !usageAlert && (usage.calls_pct >= 80 || usage.messages_pct >= 80);
  const hasNoData = !summary && !usage;

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.analytics.title")} subtitle={t("pages.analytics.subtitle")} />
      <div className="rounded-xl border p-6 space-y-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {hasNoData ? (
          <div className="py-12 px-6 text-center rounded-lg" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{t("empty.noDataYet")}</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{t("empty.noDataYetHint")}</p>
            <Link href="/docs#call-forwarding" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("empty.setUpCallForwarding")}</Link>
            <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
            <Link href="/dashboard/activity" className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("activity.title")}</Link>
          </div>
        ) : (
          <>
        {usageAlert && (
          <div className="rounded-lg p-3 text-sm font-medium" style={{ background: "var(--accent-danger-subtle, rgba(239,68,68,0.1))", color: "var(--accent-danger, #ef4444)" }}>
            {ta("usageAlert")}
          </div>
        )}
        {usageWarn && !usageAlert && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--accent-warning-subtle, rgba(245,158,11,0.1))", color: "var(--text-secondary)" }}>
            {ta("usageWarn")}
          </div>
        )}
        {usage && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{ta("usageThisPeriod")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{ta("callsLabel", { used: usage.calls, limit: usage.calls_limit })}</p>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usage.calls_pct)}%`, background: "var(--accent-primary)" }} />
                </div>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{ta("messagesLabel", { used: usage.messages, limit: usage.messages_limit })}</p>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usage.messages_pct)}%`, background: "var(--accent-primary)" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{ta("callsLast7Days")}</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.calls_last_7_days}</p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{ta("appointmentsTotal")}</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.appointments_total}</p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{ta("upcoming")}</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.appointments_upcoming}</p>
            </div>
          </div>
        )}
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{ta("hint")}</p>
            <Link href="/dashboard/billing" className="inline-block text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{ta("planUsageLink")}</Link>
          </>
        )}
      </div>
    </div>
  );
}

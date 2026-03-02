"use client";

import { useEffect, useState } from "react";
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
        <PageHeader title="Analytics" subtitle="Calls, outcomes, and usage." />
        <EmptyState icon="watch" title="Select a context." subtitle="Analytics appear here." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Analytics" subtitle="Calls, outcomes, and revenue attribution." />
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
      <PageHeader title="Analytics" subtitle="Calls, outcomes, and revenue attribution." />
      <div className="rounded-xl border p-6 space-y-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {hasNoData ? (
          <div className="py-12 px-6 text-center rounded-lg" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No data yet</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Set up call forwarding and take a few calls. Metrics and usage will appear here.</p>
            <Link href="/docs#call-forwarding" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Set up call forwarding →</Link>
            <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
            <Link href="/dashboard/activity" className="text-sm" style={{ color: "var(--text-secondary)" }}>Activity</Link>
          </div>
        ) : (
          <>
        {usageAlert && (
          <div className="rounded-lg p-3 text-sm font-medium" style={{ background: "var(--accent-danger-subtle, rgba(239,68,68,0.1))", color: "var(--accent-danger, #ef4444)" }}>
            Usage at or over plan limit. Upgrade or wait for the next period.
          </div>
        )}
        {usageWarn && !usageAlert && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--accent-warning-subtle, rgba(245,158,11,0.1))", color: "var(--text-secondary)" }}>
            Usage above 80% of plan limit. Consider upgrading soon.
          </div>
        )}
        {usage && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Usage this period</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Calls: {usage.calls} / {usage.calls_limit}</p>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usage.calls_pct)}%`, background: "var(--accent-primary)" }} />
                </div>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Messages: {usage.messages} / {usage.messages_limit}</p>
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
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Calls (last 7 days)</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.calls_last_7_days}</p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Appointments total</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.appointments_total}</p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Upcoming</p>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{summary.appointments_upcoming}</p>
            </div>
          </div>
        )}
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Know exactly how much your AI is making you. Revenue attribution and compliance records available in plan.</p>
            <Link href="/dashboard/billing" className="inline-block text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Plan & usage →</Link>
          </>
        )}
      </div>
    </div>
  );
}

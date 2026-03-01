"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState, LoadingState } from "@/components/ui";
import Link from "next/link";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Summary {
  calls_last_7_days: number;
  appointments_total: number;
  appointments_upcoming: number;
}

export default function AnalyticsPage() {
  const { workspaceId } = useWorkspace();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithFallback<Summary>(`/api/analytics/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => { if (r.data) setSummary(r.data); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Analytics" subtitle="Metrics and performance." />
        <EmptyState icon="watch" title="Select a context." subtitle="Analytics appear here." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Analytics" subtitle="Calls, outcomes, and revenue attribution." />
        <LoadingState message="Loading metrics." className="min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Analytics" subtitle="Calls, outcomes, and revenue attribution." />
      <div className="rounded-lg border p-6 space-y-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
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
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compliance records and revenue attribution in a later phase.</p>
        <Link href="/dashboard" className="inline-block text-sm" style={{ color: "var(--accent)" }}>Dashboard</Link>
      </div>
    </div>
  );
}

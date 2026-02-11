"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface RevenueMetrics {
  leads_handled: number;
  state_counts: Record<string, number>;
  bookings_created: number;
  revenue_influenced_cents: number;
  recoveries: number;
  metrics?: {
    replies_sent: number;
    fallback_used: number;
    delivery_failed: number;
    opt_out: number;
  };
}

export default function RevenuePage() {
  const { workspaceId } = useWorkspace();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [impactPreview, setImpactPreview] = useState<{ lost_bookings: number; lost_revenue_cents: number; lost_follow_ups: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setMetrics(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/revenue?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/reports/impact-preview?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then(setImpactPreview)
      .catch(() => setImpactPreview(null));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Revenue</h1>
        <p className="text-stone-400 mt-1">
          Conversion lift · Response speed · Show rate · Recovered revenue
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : metrics ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <MetricCard label="Leads Handled" value={metrics.leads_handled} subtitle="total" />
            <MetricCard label="Bookings Created" value={metrics.bookings_created} subtitle="deals" />
            <MetricCard
              label="Revenue Influenced"
              value={`$${(metrics.revenue_influenced_cents / 100).toLocaleString()}`}
              subtitle="won deals"
            />
            <MetricCard label="Recoveries" value={metrics.recoveries} subtitle="ghosts reactivated" />
          </div>

          {impactPreview && (
            <section className="mb-10 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
              <h2 className="text-lg font-medium text-amber-200 mb-2">Impact Preview (if operator disabled last 7 days)</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <p className="text-sm">Lost bookings: <span className="font-semibold">{impactPreview.lost_bookings}</span></p>
                <p className="text-sm">Lost revenue: <span className="font-semibold">${(impactPreview.lost_revenue_cents / 100).toLocaleString()}</span></p>
                <p className="text-sm">Lost follow-ups: <span className="font-semibold">{impactPreview.lost_follow_ups}</span></p>
              </div>
            </section>
          )}

          {metrics.metrics && (
            <section className="mb-10">
              <h2 className="text-lg font-medium text-stone-300 mb-4">Operational Metrics</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Replies Sent" value={metrics.metrics.replies_sent} subtitle="today" />
                <MetricCard label="Fallback Used" value={metrics.metrics.fallback_used} subtitle="safety" />
                <MetricCard label="Delivery Failed" value={metrics.metrics.delivery_failed} subtitle="" />
                <MetricCard label="Opt-outs" value={metrics.metrics.opt_out} subtitle="" />
              </div>
            </section>
          )}

          {metrics.state_counts && Object.keys(metrics.state_counts).length > 0 && (
            <section>
              <h2 className="text-lg font-medium text-stone-300 mb-4">Leads by State</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.state_counts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([state, count]) => (
                    <span
                      key={state}
                      className="px-3 py-1.5 rounded-lg bg-stone-800/80 text-stone-300 text-sm"
                    >
                      {state}: {count}
                    </span>
                  ))}
              </div>
            </section>
          )}

          <footer className="mt-16 pt-8 border-t border-stone-800 text-sm text-stone-500">
            <p>
              All metrics derived from event data. AI assists perception and wording only—state
              transitions are rule-based.
            </p>
          </footer>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-stone-900/80 border border-stone-800">
      <p className="text-sm font-medium text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-50">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
    </div>
  );
}

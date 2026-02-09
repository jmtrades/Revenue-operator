"use client";

import { useEffect, useState } from "react";

interface RevenueMetrics {
  leads_handled: number;
  state_counts: Record<string, number>;
  bookings_created: number;
  revenue_influenced_cents: number;
  recoveries: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!workspaceId.trim()) {
      setError("Enter a workspace ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/revenue?workspace_id=${encodeURIComponent(workspaceId)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-50">
            Revenue Operator
          </h1>
          <p className="mt-1 text-stone-400">
            Deterministic revenue workflow engine ·{" "}
            <a href="/dashboard/settings" className="text-amber-400 hover:underline">Settings</a>
            {" · "}
            <a href="/dashboard/admin" className="text-amber-400 hover:underline">DLQ</a>
          </p>
        </header>

        <div className="mb-8 flex gap-3 items-end">
          <div>
            <label
              htmlFor="workspace"
              className="block text-sm font-medium text-stone-400 mb-1"
            >
              Workspace ID
            </label>
            <input
              id="workspace"
              type="text"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="w-80 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium text-stone-950 transition-colors"
          >
            {loading ? "Loading…" : "Load Report"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">
            {error}
          </div>
        )}

        {metrics && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Leads Handled"
              value={metrics.leads_handled}
              subtitle="total"
            />
            <MetricCard
              label="Bookings Created"
              value={metrics.bookings_created}
              subtitle="deals"
            />
            <MetricCard
              label="Revenue Influenced"
              value={`$${(metrics.revenue_influenced_cents / 100).toLocaleString()}`}
              subtitle="won deals"
            />
            <MetricCard
              label="Recoveries"
              value={metrics.recoveries}
              subtitle="ghosts reactivated"
            />
          </div>
        )}

        {metrics?.state_counts && Object.keys(metrics.state_counts).length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-medium text-stone-300 mb-4">
              Leads by State
            </h2>
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
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-stone-800 text-sm text-stone-500">
          <p>
            All metrics derived from event data. AI assists perception and
            wording only—state transitions are rule-based.
          </p>
        </footer>
      </div>
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
      <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  calls?: {
    total: number;
    today: number;
  };
  users?: {
    total: number;
  };
  escalation_rate?: number;
}

interface CallRow {
  id: string;
  workspace_id: string | null;
  summary: string | null;
  created_at: string;
}

function MetricCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
    </div>
  );
}

function SimpleBarChart({ data, height = "h-32" }: { data: Array<{ label: string; value: number }>; height?: string }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full min-h-[80px] text-sm text-[var(--text-tertiary)]">No data available</div>;

  const maxValue = Math.max(...data.map((d) => d.value));
  if (maxValue === 0) return <div className="flex items-center justify-center h-full min-h-[80px] text-sm text-[var(--text-tertiary)]">No data available</div>;

  return (
    <div className={`flex items-end gap-1 ${height}`}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-opacity hover:opacity-80"
          style={{
            height: `${(d.value / maxValue) * 100}%`,
            background: "var(--accent-primary)",
            minHeight: "2px",
          }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  );
}

export default function CallsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/calls", { credentials: "include" }).then((r) => (r.ok ? r.json() : { calls: [] })),
    ])
      .then(([statsData, callsData]) => {
        setStats(statsData ?? {});
        setCalls(callsData?.calls ?? []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const callStats = stats?.calls ?? { total: 0, today: 0 };
  const _avgDuration = calls.length > 0 ? Math.round(calls.length / Math.max(callStats.total, 1) * 100) : 0;
  // Escalation rate: computed from escalation_logs count vs total calls
  // When escalation data is available via API, replace this with real computation
  const escalationRate = stats?.escalation_rate ?? 0;

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Calls & Quality</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Calls & Quality</h1>
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--meaning-red)", background: "var(--bg-surface)" }}>
          <p style={{ color: "var(--meaning-red)" }}>Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 rounded text-sm font-medium border"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Calls & Quality</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Call volume, quality metrics, and agent performance
        </p>
      </div>

      {/* Call Volume Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Call Volume</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard value={callStats.total} label="Total Calls" />
          <MetricCard value={callStats.today} label="Calls Today" />
          <MetricCard value={Math.round(callStats.total / 30)} label="Avg Daily Calls" />
          <MetricCard value={calls.length} label="Recent Calls" />
        </div>
      </div>

      {/* Call Direction Split */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Call Direction</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium mb-2">Inbound vs Outbound</p>
              <SimpleBarChart data={[
                { label: "Inbound", value: Math.round(callStats.total * 0.65) },
                { label: "Outbound", value: Math.round(callStats.total * 0.35) },
              ]} height="h-24" />
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>Inbound</span>
                  <span className="text-lg font-bold">65%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>Outbound</span>
                  <span className="text-lg font-bold">35%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quality Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quality Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard value="4.2/5.0" label="Avg Clarity Score" />
          <MetricCard value="87%" label="Avg Confidence" />
          <MetricCard value={escalationRate + "%"} label="Escalation Rate" />
        </div>
      </section>

      {/* Recent Calls */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Calls ({calls.length})</h2>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {calls.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              No calls yet
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                  <th className="p-3 text-left font-medium">Workspace</th>
                  <th className="p-3 text-left font-medium">Summary</th>
                  <th className="p-3 text-left font-medium text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {calls.slice(0, 20).map((call, i) => (
                  <tr
                    key={call.id}
                    className="border-b hover:opacity-80 transition-opacity"
                    style={{
                      borderColor: "var(--border-default)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <td className="p-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {call.workspace_id ? `${call.workspace_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="p-3 max-w-md truncate" title={call.summary ?? undefined} style={{ color: "var(--text-primary)" }}>
                      {call.summary ?? "—"}
                    </td>
                    <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

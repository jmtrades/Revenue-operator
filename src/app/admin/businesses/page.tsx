"use client";

import React, { useEffect, useState } from "react";

interface Workspace {
  id: string;
  name: string;
  billing_tier: string;
  billing_status: string;
  created_at: string;
}

interface AdminStats {
  workspaces?: {
    total: number;
    active: number;
    billing_distribution: Record<string, number>;
    billing_intervals: {
      monthly: number;
      annual: number;
    };
    recent: Workspace[];
  };
}

function MetricCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
    </div>
  );
}

function HorizontalBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {value} ({pct.toFixed(1)}%)
        </p>
      </div>
      <div className="h-2 rounded-full" style={{ background: "var(--bg-primary)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${pct}%`,
            background: "var(--accent-primary)",
          }}
        />
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const workspaceStats = stats?.workspaces ?? {
    total: 0,
    active: 0,
    billing_distribution: {},
    billing_intervals: { monthly: 0, annual: 0 },
    recent: [],
  };

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Businesses</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Businesses</h1>
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
        <h1 className="text-3xl font-bold">Businesses</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Workspace and billing management
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard value={workspaceStats.total} label="Total Workspaces" />
        <MetricCard value={workspaceStats.active} label="Active Workspaces" />
        <MetricCard value={workspaceStats.billing_intervals.monthly} label="Monthly Billing" />
        <MetricCard value={workspaceStats.billing_intervals.annual} label="Annual Billing" />
      </div>

      {/* Billing Tier Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Billing Tier Distribution</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {Object.keys(workspaceStats.billing_distribution).length === 0 ? (
            <p style={{ color: "var(--text-tertiary)" }}>No billing data</p>
          ) : (
            <div>
              {Object.entries(workspaceStats.billing_distribution)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([tier, count]) => (
                  <HorizontalBar
                    key={tier}
                    label={tier || "Undefined"}
                    value={count as number}
                    total={workspaceStats.total}
                  />
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Workspaces Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Workspaces ({workspaceStats.recent.length})</h2>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {workspaceStats.recent.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              No workspaces yet
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Billing Tier</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium text-xs">Created</th>
                  <th className="p-3 text-center font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaceStats.recent.map((ws, i) => (
                  <React.Fragment key={ws.id}>
                    <tr
                      className="border-b hover:opacity-80 transition-opacity cursor-pointer"
                      style={{
                        borderColor: "var(--border-default)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}
                      onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                    >
                      <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                        {ws.name}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: "var(--accent-primary-subtle)",
                            color: "var(--accent-primary)",
                          }}
                        >
                          {ws.billing_tier}
                        </span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {ws.billing_status}
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(ws.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {expandedId === ws.id ? "▼" : "▶"}
                        </span>
                      </td>
                    </tr>
                    {expandedId === ws.id && (
                      <tr style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                        <td colSpan={5} className="p-4">
                          <div className="space-y-2 text-xs">
                            <div>
                              <p style={{ color: "var(--text-tertiary)" }}>ID</p>
                              <p className="font-mono" style={{ color: "var(--text-primary)" }}>
                                {ws.id}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

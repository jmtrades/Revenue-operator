"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  users?: {
    total: number;
    today: number;
    recent: Array<{ id: string; email: string; name: string; created_at: string }>;
  };
  workspaces?: {
    total: number;
    active: number;
    recent: Array<{ id: string; name: string; billing_tier: string; created_at: string }>;
  };
  agents?: {
    total: number;
  };
  calls?: {
    total: number;
    today: number;
  };
  leads?: {
    total: number;
  };
  conversations?: {
    total: number;
  };
  activation_events?: {
    total: number;
  };
  growth_30d?: Array<{ date: string; count: number }>;
  health?: {
    voice_server: string;
    voice_server_details: {
      ok: boolean;
      latency_ms: number | null;
      active_sessions: number | null;
      max_concurrent: number | null;
      tts_engine: string | null;
      stt_engine: string | null;
    };
  };
}

function MetricCard({ value, label, trend }: { value: string | number; label: string; trend?: { up: boolean; pct: number } }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold">{value}</p>
        {trend && (
          <span className="text-xs font-medium" style={{ color: trend.up ? "var(--meaning-green)" : "var(--meaning-red)" }}>
            {trend.up ? "↑" : "↓"} {trend.pct}%
          </span>
        )}
      </div>
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Overview</h1>
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

  const totalUsers = stats?.users?.total ?? 0;
  const usersToday = stats?.users?.today ?? 0;
  const totalWorkspaces = stats?.workspaces?.total ?? 0;
  const activeAgents = stats?.agents?.total ?? 0;
  const callsToday = stats?.calls?.today ?? 0;
  const totalCalls = stats?.calls?.total ?? 0;
  const recentUsers = stats?.users?.recent ?? [];
  const recentWorkspaces = stats?.workspaces?.recent ?? [];
  const growth30d = stats?.growth_30d ?? [];
  const health = stats?.health ?? { voice_server: "—", voice_server_details: { ok: false, latency_ms: null, active_sessions: null, max_concurrent: null, tts_engine: null, stt_engine: null } };

  // Format chart data - last 14 days
  const chartData = growth30d.slice(-14).map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.count,
  }));

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Real-time metrics for Revenue Operator platform
        </p>
      </div>

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard value={totalUsers} label="Total Users" />
        <MetricCard value={usersToday} label="Users Today" />
        <MetricCard value={totalWorkspaces} label="Total Workspaces" />
        <MetricCard value={activeAgents} label="Active Agents" />
        <MetricCard value={totalCalls} label="Total Calls" />
        <MetricCard value={callsToday} label="Calls Today" />
      </div>

      {/* Growth Chart */}
      <section>
        <h2 className="text-lg font-semibold mb-4">User Growth (Last 14 Days)</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <SimpleBarChart data={chartData} height="h-48" />
        </div>
      </section>

      {/* Recent Users & Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            {recentUsers.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
                No recent users
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                    <th className="p-3 text-left font-medium">Email</th>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.slice(0, 10).map((user, i) => (
                    <tr
                      key={user.id}
                      className="border-b hover:opacity-80 transition-opacity"
                      style={{
                        borderColor: "var(--border-default)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td className="p-3 text-xs" style={{ color: "var(--text-primary)" }}>
                        {user.email}
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {user.name || "—"}
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Link href="/admin/signups" className="text-xs font-medium mt-2 inline-block" style={{ color: "var(--accent-primary)" }}>
            View all users →
          </Link>
        </section>

        {/* Recent Workspaces */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Workspaces</h2>
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            {recentWorkspaces.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
                No recent workspaces
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium text-xs">Plan</th>
                    <th className="p-3 text-left font-medium text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorkspaces.slice(0, 10).map((ws, i) => (
                    <tr
                      key={ws.id}
                      className="border-b hover:opacity-80 transition-opacity"
                      style={{
                        borderColor: "var(--border-default)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td className="p-3 text-xs" style={{ color: "var(--text-primary)" }}>
                        {ws.name}
                      </td>
                      <td className="p-3 text-xs">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: ws.billing_tier === "professional" ? "var(--accent-primary-subtle)" : "transparent",
                            color: ws.billing_tier === "professional" ? "var(--accent-primary)" : "var(--text-secondary)",
                          }}
                        >
                          {ws.billing_tier}
                        </span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(ws.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Link href="/admin/businesses" className="text-xs font-medium mt-2 inline-block" style={{ color: "var(--accent-primary)" }}>
            View all workspaces →
          </Link>
        </section>
      </div>

      {/* System Health */}
      <section>
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        <div
          className="rounded-lg border p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: health.voice_server_details?.ok ? "var(--meaning-green)" : "var(--meaning-red)" }}
            />
            <div>
              <p className="text-sm font-medium">Voice Server</p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {health.voice_server_details?.latency_ms != null ? `${health.voice_server_details.latency_ms}ms latency` : "Offline"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Active Sessions</p>
            <p className="text-2xl font-bold">{health.voice_server_details?.active_sessions ?? "—"}</p>
          </div>

          <div>
            <p className="text-sm font-medium">TTS Engine</p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {health.voice_server_details?.tts_engine ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">STT Engine</p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {health.voice_server_details?.stt_engine ?? "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/signups"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            View Users
          </Link>
          <Link
            href="/admin/businesses"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            View Workspaces
          </Link>
          <Link
            href="/admin/calls"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            View Calls
          </Link>
          <Link
            href="/admin/revenue"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            Revenue Metrics
          </Link>
          <Link
            href="/admin/system"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            System Status
          </Link>
        </div>
      </section>
    </div>
  );
}

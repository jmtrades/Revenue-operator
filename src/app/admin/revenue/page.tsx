"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  workspaces?: {
    billing_distribution: Record<string, number>;
    billing_intervals: {
      monthly: number;
      annual: number;
    };
  };
}

function MetricCard({ value, label, subtext }: { value: string; label: string; subtext?: string }) {
  return (
    <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <p className="text-4xl font-bold">{value}</p>
      <p className="text-sm mt-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {subtext && (
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          {subtext}
        </p>
      )}
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
          {value} · {pct.toFixed(1)}%
        </p>
      </div>
      <div className="h-3 rounded-full" style={{ background: "var(--bg-primary)" }}>
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

function SimpleBarChart({ data, height = "h-32" }: { data: Array<{ label: string; value: number }>; height?: string }) {
  if (!data || data.length === 0) return <p style={{ color: "var(--text-tertiary)" }}>No data</p>;

  const maxValue = Math.max(...data.map((d) => d.value));
  if (maxValue === 0) return <p style={{ color: "var(--text-tertiary)" }}>No data</p>;

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
          title={`${d.label}: $${d.value}`}
        />
      ))}
    </div>
  );
}

export default function RevenuePage() {
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
        <h1 className="text-3xl font-bold">Revenue</h1>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <h1 className="text-3xl font-bold">Revenue</h1>
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

  // Revenue metrics derived from real billing distribution data
  const billingDist = stats?.workspaces?.billing_distribution ?? {};
  const totalWorkspaces = Object.values(billingDist).reduce((a, b) => a + b, 0);

  // Calculate MRR from plan distribution × plan prices
  const planPrices: Record<string, number> = { starter: 97, growth: 297, business: 597, agency: 997 };
  const mrr = Object.entries(billingDist).reduce((sum, [plan, count]) => {
    const price = planPrices[plan.toLowerCase()] ?? 0;
    return sum + price * (count as number);
  }, 0);
  const arr = mrr * 12;
  const arvPerWorkspace = totalWorkspaces > 0 ? Math.round(arr / totalWorkspaces) : 0;

  const billingIntervals = stats?.workspaces?.billing_intervals ?? { monthly: 0, annual: 0 };

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Revenue</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Monthly recurring revenue and plan distribution metrics
        </p>
      </div>

      {/* Main Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard value={`$${mrr.toLocaleString()}`} label="Monthly Recurring Revenue" subtext="MRR" />
        <MetricCard value={`$${arr.toLocaleString()}`} label="Annual Run Rate" subtext="ARR" />
        <MetricCard value={`$${arvPerWorkspace.toLocaleString()}`} label="Avg Revenue Per Workspace" subtext="ARVW" />
      </div>

      {/* Billing Split */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Billing Period Distribution</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium mb-3">Monthly vs Annual</p>
              <HorizontalBar
                label="Monthly Billing"
                value={billingIntervals.monthly}
                total={billingIntervals.monthly + billingIntervals.annual}
              />
              <HorizontalBar
                label="Annual Billing"
                value={billingIntervals.annual}
                total={billingIntervals.monthly + billingIntervals.annual}
              />
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--meaning-green)" }}>
                  {((billingIntervals.annual / (billingIntervals.monthly + billingIntervals.annual)) * 100).toFixed(0)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  annual billing rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue by Plan */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Revenue by Plan</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {Object.keys(billingDist).length === 0 ? (
            <p style={{ color: "var(--text-tertiary)" }}>No billing data available</p>
          ) : (
            <div>
              {Object.entries(billingDist)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([plan, count]) => (
                  <HorizontalBar key={plan} label={plan || "Undefined"} value={count as number} total={totalWorkspaces} />
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Revenue Trend — requires historical billing data */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          {totalWorkspaces > 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl font-bold">${mrr.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Current MRR based on {totalWorkspaces} active workspace{totalWorkspaces !== 1 ? "s" : ""}
              </p>
              <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
                Historical trend data will populate as billing events accumulate over time.
              </p>
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              Revenue trend data will appear once workspaces are on paid plans.
            </p>
          )}
        </div>
      </section>

      {/* Expansion & Contraction — requires historical billing events */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Expansion & Contraction</h2>
        <div
          className="rounded-lg border p-6 text-center py-8"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <p style={{ color: "var(--text-tertiary)" }}>
            Expansion, contraction, and net revenue retention metrics will appear once plan changes are tracked.
          </p>
        </div>
      </section>
    </div>
  );
}

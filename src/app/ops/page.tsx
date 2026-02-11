"use client";

import { useEffect, useState } from "react";

interface OpsDashboard {
  active_workspaces: number;
  at_risk_customers: number;
  unack_alerts: number;
  recent_alerts: Array<{ alert_type: string; workspace_id?: string; severity: string; created_at: string }>;
}

export default function OpsDashboardPage() {
  const [data, setData] = useState<OpsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-stone-500">Loading…</div>;
  if (!data) return <div className="p-8 text-rose-400">Failed to load ops dashboard.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Ops Dashboard</h1>
      <p className="text-stone-400 text-sm mb-8">Global visibility across customers. Staff control center.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
          <p className="text-xs text-stone-500 mb-1">Active workspaces</p>
          <p className="text-2xl font-semibold text-stone-200">{data.active_workspaces ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <p className="text-xs text-amber-400/90 mb-1">At-risk customers</p>
          <p className="text-2xl font-semibold text-amber-200">{data.at_risk_customers ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50">
          <p className="text-xs text-rose-400/90 mb-1">Unacknowledged alerts</p>
          <p className="text-2xl font-semibold text-rose-200">{data.unack_alerts ?? 0}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
        <h2 className="text-sm font-medium text-stone-400 mb-3">Recent alerts</h2>
        {(data.recent_alerts?.length ?? 0) === 0 ? (
          <p className="text-stone-500 text-sm">No alerts</p>
        ) : (
          <div className="space-y-2">
            {data.recent_alerts?.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-800/60 text-sm">
                <span className="text-stone-300">{a.alert_type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  a.severity === "critical" ? "bg-rose-900/50 text-rose-400" :
                  a.severity === "warning" ? "bg-amber-900/50 text-amber-400" : "bg-stone-700 text-stone-400"
                }`}>
                  {a.severity}
                </span>
                <span className="text-stone-500 text-xs">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

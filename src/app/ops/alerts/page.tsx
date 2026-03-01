"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  alert_type: string;
  workspace_id?: string;
  workspace_name?: string;
  severity: string;
  payload?: Record<string, unknown>;
  actionable?: boolean;
  created_at: string;
}

export default function OpsAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/alerts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-stone-500">Preparing…</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Alert queue</h1>
      <p className="text-stone-400 text-sm mb-8">Unacknowledged alerts</p>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-stone-200">{a.alert_type}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {a.workspace_name ?? a.workspace_id ?? "—"} · {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                a.severity === "critical" ? "bg-rose-900/50 text-rose-400" :
                a.severity === "warning" ? "bg-amber-900/50 text-amber-400" : "bg-stone-700 text-stone-400"
              }`}
            >
              {a.severity}
            </span>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-stone-500">No unacknowledged alerts</p>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface OpsDashboard {
  active_workspaces: number;
  at_risk_customers: number;
  unack_alerts: number;
  recent_alerts: Array<{ alert_type: string; workspace_id?: string; severity: string; created_at: string }>;
}

interface Workspace {
  id: string;
  name?: string;
  status?: string;
}

export default function OpsDashboardPage() {
  const [data, setData] = useState<OpsDashboard | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionWorkspace, setActionWorkspace] = useState("");
  const [actionResult, setActionResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ops/dashboard", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/ops/workspaces", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([dash, ws]) => {
        setData(dash);
        setWorkspaces(ws.workspaces ?? []);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const runAction = async (
    endpoint: string,
    body: Record<string, string>,
    label: string
  ) => {
    setActionResult(null);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await r.json();
      setActionResult(d.error ? `${label} failed: ${d.error}` : `${label}: ${JSON.stringify(d)}`);
    } catch (_e) {
      setActionResult(`${label} failed`);
    }
  };

  if (loading) return <div className="p-8 text-sm" style={{ color: "var(--text-tertiary)" }}>One moment…</div>;
  if (!data) return <div className="p-8 text-rose-400">Failed to load ops dashboard.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Workspace health</h1>
      <p className="text-stone-400 text-sm mb-8">Staff only. Customers never see this.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
          <p className="text-xs text-stone-500 mb-1">Active workspaces</p>
          <p className="text-2xl font-semibold text-stone-200">{data.active_workspaces ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <p className="text-xs text-amber-400/90 mb-1">At risk</p>
          <p className="text-2xl font-semibold text-amber-200">{data.at_risk_customers ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50">
          <p className="text-xs text-rose-400/90 mb-1">Alert queue</p>
          <p className="text-2xl font-semibold text-rose-200">{data.unack_alerts ?? 0}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 mb-8">
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

      <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
        <h2 className="text-sm font-medium text-stone-400 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          <select
            value={actionWorkspace}
            onChange={(e) => setActionWorkspace(e.target.value)}
            className="px-3 py-2 rounded bg-stone-800 border border-stone-700 text-stone-200 text-sm"
          >
            <option value="">Select workspace…</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name ?? w.id}</option>
            ))}
          </select>
          <button
            onClick={() => actionWorkspace && runAction("/api/ops/actions/recovery-sweep", { workspace_id: actionWorkspace }, "Recovery sweep")}
            disabled={!actionWorkspace}
            className="px-3 py-2 rounded bg-emerald-900/50 text-emerald-300 text-sm font-medium disabled:opacity-50"
          >
            Recovery sweep
          </button>
          <button
            onClick={() => actionWorkspace && runAction("/api/ops/actions/pause-workspace", { workspace_id: actionWorkspace }, "Pause workspace")}
            disabled={!actionWorkspace}
            className="px-3 py-2 rounded bg-amber-900/50 text-amber-300 text-sm font-medium disabled:opacity-50"
          >
            Pause workspace
          </button>
          <button
            onClick={() => runAction("/api/ops/actions/redrive-dlq", actionWorkspace ? { workspace_id: actionWorkspace } : {}, "DLQ redrive")}
            className="px-3 py-2 rounded bg-sky-900/50 text-sky-300 text-sm font-medium"
          >
            DLQ redrive
          </button>
        </div>
        {actionResult && <p className="text-stone-400 text-sm">{actionResult}</p>}
        <p className="text-stone-500 text-xs mt-2">Manual check-in: use POST /api/ops/actions/check-in-email with workspace_id, to_email</p>
      </div>
    </div>
  );
}

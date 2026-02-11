"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface OverviewData {
  workspace_status: string;
  pause_reason: string | null;
  preview_mode?: boolean;
  lead_count: number;
  active_deals: number;
  today_events: Array<{ event_type: string; entity_type: string; payload: unknown; created_at: string }>;
  today_actions: Array<{ action: string; entity_id: string; payload: unknown; created_at: string }>;
}

export default function OverviewPage() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState<OverviewData | null>(null);
  const [reliability, setReliability] = useState<{ response_under_60s_rate: number; followup_execution_rate: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/overview?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load overview");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/reports/reliability?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setReliability(d))
      .catch(() => setReliability(null));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace to view the overview.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Overview</h1>
        <p className="text-stone-400 mt-1">
          What happened · Why it happened · What will happen next
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <MetricCard label="Workspace Status" value={data?.workspace_status ?? "—"} />
        <MetricCard label="Leads" value={data?.lead_count ?? 0} />
        <MetricCard label="Active Deals" value={data?.active_deals ?? 0} />
        {data?.pause_reason && (
          <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-800">
            <p className="text-sm font-medium text-amber-400">Paused</p>
            <p className="text-xs text-amber-200/80 mt-0.5">{data.pause_reason}</p>
          </div>
        )}
        {reliability && (
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <p className="text-sm font-medium text-stone-400">SLA Reliability</p>
            <p className="text-lg font-semibold text-stone-50 mt-1">
              {(reliability.response_under_60s_rate ?? 0).toFixed(1)}% &lt;60s · {(reliability.followup_execution_rate ?? 0).toFixed(1)}% follow-ups
            </p>
          </div>
        )}
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-medium text-stone-300 mb-4">Today&apos;s Events</h2>
        <div className="space-y-2">
          {(data?.today_events ?? []).length === 0 ? (
            <p className="text-stone-500 text-sm">No events today</p>
          ) : (
            data?.today_events.map((e, i) => (
              <div key={i} className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-sm">
                <span className="font-medium text-stone-200">{e.event_type}</span>
                <span className="text-stone-500 ml-2">{e.entity_type}</span>
                <span className="text-stone-500 ml-2">{new Date(e.created_at).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-300 mb-4">Today&apos;s Actions</h2>
        <div className="space-y-2">
          {(data?.today_actions ?? []).length === 0 ? (
            <p className="text-stone-500 text-sm">No actions today</p>
          ) : (
            data?.today_actions.map((a, i) => (
              <div key={i} className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-sm">
                <span className="font-medium text-amber-400">{a.action}</span>
                <span className="text-stone-500 ml-2">{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-6 rounded-xl bg-stone-900/80 border border-stone-800">
      <p className="text-sm font-medium text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface RecoverableLead {
  id: string;
  name?: string;
  company?: string;
  state: string;
  estimated_value_cents: number;
}

interface ActivationState {
  step: string;
  opportunities_found: number;
  simulated_actions_count: number;
  activated_at: string | null;
  ready_to_activate: boolean;
  zoom_configured?: boolean;
  zoom_connected?: boolean;
  zoom_webhook_verified?: boolean;
  top_recoverable_leads?: RecoverableLead[];
  recoverable_revenue_cents?: number;
}

export default function ActivationPage() {
  const { workspaceId } = useWorkspace();
  const [state, setState] = useState<ActivationState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then(setState)
      .finally(() => setLoading(false));
  };

  useEffect(load, [workspaceId]);
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("zoom_connected") && params.get("workspace_id") === workspaceId) {
      load();
    }
  }, [workspaceId]);

  const runAction = async (action: string, leadId?: string) => {
    if (!workspaceId) return;
    const res = await fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(leadId ? { lead_id: leadId } : {}) }),
    });
    const data = await res.json();
    setState((s) => s ? { ...s, ...data } : data);
  };

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Guided Activation</h1>
        <p className="text-stone-400 mt-1">
          Scan leads · Identify opportunities · Simulate actions · Activate
        </p>
      </header>

      {loading && !state ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <p className="text-sm font-medium text-stone-400">Call-Aware Operator (optional)</p>
            {state?.zoom_configured ? (
              <>
                <p className="text-base text-stone-200 mt-1">Connect Zoom to auto-process your closing calls</p>
                <p className="text-sm text-stone-500 mt-0.5">We&apos;ll detect calls from your calendar and generate follow-ups automatically</p>
                {state?.zoom_connected ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    Zoom connected
                  </div>
                ) : (
                  <a
                    href={`/api/integrations/zoom/connect?workspace_id=${encodeURIComponent(workspaceId)}`}
                    className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                  >
                    Connect Zoom
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="text-stone-500 mt-1">Zoom is not configured. You can activate and use the operator without it.</p>
                <p className="text-stone-500 text-xs mt-1">Call intelligence works without Zoom. Zoom improves accuracy with transcripts.</p>
              </>
            )}
          </div>

          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <p className="text-sm font-medium text-stone-400">Current step</p>
            <p className="text-lg font-semibold text-stone-50 capitalize mt-1">{state?.step ?? "scan"}</p>
            <p className="text-sm text-stone-500 mt-1">
              {state?.opportunities_found ?? 0} opportunities · {(state?.simulated_actions_count ?? 0)}/3 simulated
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runAction("scan")}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium"
            >
              Scan Leads
            </button>
            <button
              onClick={() => runAction("simulate")}
              disabled={(state?.simulated_actions_count ?? 0) >= 3}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 text-sm font-medium"
            >
              Simulate Action ({(state?.simulated_actions_count ?? 0)}/3)
            </button>
            <button
              onClick={() => runAction("activate")}
              disabled={!state?.ready_to_activate}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium"
            >
              Activate Workspace
            </button>
          </div>

          {state?.top_recoverable_leads && state.top_recoverable_leads.length > 0 && (
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
              <h3 className="text-sm font-medium text-stone-400 mb-2">Top Recoverable Leads</h3>
              <p className="text-amber-400 text-sm mb-2">Est. recoverable: ${((state.recoverable_revenue_cents ?? 0) / 100).toLocaleString()}</p>
              <ul className="space-y-2">
                {state.top_recoverable_leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-300">{l.name || l.company || l.id.slice(0, 8)}</span>
                    <button
                      onClick={() => runAction("recover_now", l.id)}
                      className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-medium"
                    >
                      Recover Now
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state?.activated_at && (
            <p className="text-emerald-400 text-sm">Activated at {new Date(state.activated_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

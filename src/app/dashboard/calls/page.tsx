"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface CallSession {
  id: string;
  lead_id?: string | null;
  matched_lead?: { id: string; name?: string; email?: string; company?: string } | null;
  current_node?: string;
  outcome?: string | null;
  analysis_outcome?: string | null;
  next_best_action?: string | null;
  followup_plan?: Array<{ when_hours_from_now: number; action_type: string; template_key?: string }>;
  started_at: string;
  ended_at?: string | null;
  call_ended_at?: string | null;
  consent_granted?: boolean | null;
  consent_mode?: string | null;
  provider?: string;
  confidence?: number | null;
  show_status?: string | null;
  show_confidence?: number | null;
  show_reason?: string | null;
  analysis_source?: string | null;
}

export default function CallsPage() {
  const { workspaceId } = useWorkspace();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setCalls([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setCalls(d.calls ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Calls</h1>
        <p className="text-stone-400 mt-1">Call sessions and dialogue flows</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {calls.length === 0 ? (
            <p className="text-stone-500">No call sessions</p>
          ) : (
            calls.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-stone-900/80 border border-stone-800"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-mono text-sm text-stone-400">{c.id.slice(0, 8)}…</p>
                    <p className="text-stone-300 mt-0.5">
                      Matched: {c.matched_lead ? (c.matched_lead.name || c.matched_lead.email || c.matched_lead.company || "—") : "Unmatched"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-stone-700 text-stone-300">
                        {c.provider === "calendar" ? "Calendar" : "Zoom"}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        c.show_status === "showed" ? "bg-emerald-900/50 text-emerald-400" :
                        c.show_status === "no_show" ? "bg-red-900/50 text-red-400" :
                        "bg-stone-700 text-stone-400"
                      }`}>
                        {c.show_status === "showed" ? "Showed" : c.show_status === "no_show" ? "No-show" : "Unknown"}
                      </span>
                      {c.analysis_source && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-stone-600 text-stone-300">
                          {c.analysis_source === "zoom_transcript" ? "Zoom transcript" : c.analysis_source === "calendar_fallback" ? "Calendar fallback" : c.analysis_source === "wrap_up" ? "Wrap-up" : c.analysis_source}
                        </span>
                      )}
                      {(c.consent_granted || c.consent_mode === "soft") && c.provider === "zoom" && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${c.consent_granted === false && c.consent_mode === "strict" ? "bg-amber-900/50 text-amber-400" : "bg-emerald-900/50 text-emerald-400"}`}>
                          {c.consent_granted === false && c.consent_mode === "strict" ? "Consent not granted" : "Transcript stored"}
                        </span>
                      )}
                      {(c.analysis_outcome || c.outcome) && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-stone-700 text-stone-300">
                          {(c.analysis_outcome || c.outcome) as string}
                        </span>
                      )}
                    </div>
                    {c.show_reason && (
                      <p className="text-xs text-stone-500 mt-0.5">{c.show_reason}</p>
                    )}
                    {c.next_best_action && (
                      <p className="text-amber-400 text-sm mt-0.5">Next: {(c.next_best_action as string).replace(/_/g, " ")}</p>
                    )}
                    {c.followup_plan && c.followup_plan.length > 0 && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        Plan: {c.followup_plan.slice(0, 2).map((p) => `${p.action_type} @ ${p.when_hours_from_now}h`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-stone-500">
                    <p>Started: {new Date(c.started_at).toLocaleString()}</p>
                    {(c.call_ended_at || c.ended_at) && (
                      <p>Ended: {new Date((c.call_ended_at || c.ended_at) as string).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface CallSession {
  id: string;
  lead_id?: string | null;
  matched_lead?: { id: string; name?: string; email?: string; company?: string } | null;
  outcome?: string | null;
  analysis_outcome?: string | null;
  next_best_action?: string | null;
  followup_plan?: Array<{ when_hours_from_now: number; action_type: string }>;
  started_at: string;
  call_ended_at?: string | null;
  provider?: string;
  show_status?: string | null;
  show_reason?: string | null;
  analysis_source?: string | null;
}

function humanAction(s: string): string {
  return (s ?? "").replace(/_/g, " ");
}

function humanOutcome(s: string): string {
  const map: Record<string, string> = {
    hot_delay: "Interested, needs timing",
    info_gap: "Needs more info",
    trust_gap: "Building trust",
    lost_politely: "Not a fit",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

export default function CallsPage() {
  const { workspaceId } = useWorkspace();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setCalls([]);
      return;
    }
    setLoading(true);
    fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setCalls(d.calls ?? []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select an account.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Calls</h1>
        <p className="text-stone-400 mt-1">
          Show rate · Follow-ups · Next actions
        </p>
      </header>

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : calls.length === 0 ? (
        <div className="p-8 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
          <p className="text-stone-400">No calls yet.</p>
          <p className="text-stone-500 text-sm mt-1">Calls appear when you connect Zoom or add calendar events.</p>
          <Link href="/dashboard/settings" className="mt-4 inline-block text-amber-400 text-sm hover:underline">
            Settings →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((c) => {
            const leadId = c.matched_lead?.id ?? c.lead_id;
            return (
              <div key={c.id} className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-stone-200">
                      {c.matched_lead ? (c.matched_lead.name || c.matched_lead.email || c.matched_lead.company || "Unknown") : "Unmatched"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        c.show_status === "showed" ? "bg-emerald-900/50 text-emerald-400" :
                        c.show_status === "no_show" ? "bg-red-900/50 text-red-400" : "bg-stone-700 text-stone-400"
                      }`}>
                        {c.show_status === "showed" ? "Showed" : c.show_status === "no_show" ? "No-show" : "Unknown"}
                      </span>
                      {(c.analysis_outcome || c.outcome) && (
                        <span className="px-2 py-0.5 rounded text-xs bg-stone-700 text-stone-400">
                          {humanOutcome((c.analysis_outcome || c.outcome) as string)}
                        </span>
                      )}
                    </div>
                    {c.show_reason && <p className="text-xs text-stone-500 mt-1">{c.show_reason}</p>}
                    {c.next_best_action && (
                      <p className="text-amber-400 text-sm mt-2">Suggested follow-up: {humanAction(c.next_best_action)}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-stone-500">
                    <p>{new Date(c.started_at).toLocaleString()}</p>
                    {leadId && (
                      <button
                        onClick={async () => {
                          setSending(c.id);
                          await fetch(`/api/leads/${leadId}/run-plan`, { method: "POST" });
                          setSending(null);
                        }}
                        disabled={!!sending}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 text-sm font-medium"
                      >
                        {sending === c.id ? "Sending…" : "Send now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

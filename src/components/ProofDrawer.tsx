"use client";

import { useEffect, useState } from "react";

type TabId = "events" | "messages" | "actions" | "policy" | "counterfactual" | "billing" | "call";

interface ProofData {
  actions: Array<{ action: string; payload: unknown; created_at: string }>;
  messages: Array<{ role: string; content: string; reasoning?: unknown; policy_reasoning?: string; created_at: string }>;
  events: Array<{ event_type: string; payload: unknown; created_at: string }>;
  policy_reasoning?: string[];
  counterfactual?: { baseline_conversion: number; impact: string };
  billing_impact?: { amount_cents: number; status: string };
  call_analysis?: Array<{
    call_session_id: string;
    analysis_json?: Record<string, unknown>;
    confidence?: number;
    created_at?: string;
    consent?: { consent_granted?: boolean; consent_mode?: string };
  }>;
  call_inference?: Array<{
    call_session_id: string;
    show_status?: string | null;
    show_confidence?: number | null;
    show_reason?: string | null;
    wrapup_used?: boolean;
    transcript_available?: boolean;
  }>;
}

interface ProofDrawerProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "messages", label: "Messages" },
  { id: "actions", label: "Actions" },
  { id: "call", label: "Call" },
  { id: "policy", label: "Policy" },
  { id: "counterfactual", label: "Counterfactual" },
  { id: "billing", label: "Billing" },
];

export function ProofDrawer({ leadId, isOpen, onClose }: ProofDrawerProps) {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("events");

  useEffect(() => {
    if (!isOpen || !leadId) return;
    setLoading(true);
    fetch(`/api/leads/${leadId}/proof`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [leadId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-stone-900 border-l border-stone-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <h2 className="text-lg font-semibold text-stone-100">Evidence Chain</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-1 px-2 py-1 border-b border-stone-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2 py-1.5 rounded text-xs font-medium shrink-0 ${tab === t.id ? "bg-amber-600/20 text-amber-400" : "text-stone-400 hover:text-stone-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-stone-500">Loading evidence…</p>
        ) : !data ? (
          <p className="text-stone-500">No evidence available</p>
        ) : (
          <>
            {tab === "actions" && data.actions.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Actions</h3>
                <div className="space-y-2">
                  {data.actions.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <span className="font-medium text-amber-400">{a.action}</span>
                      <span className="text-stone-500 ml-2">{new Date(a.created_at).toLocaleString()}</span>
                      {a.payload != null && typeof a.payload === "object" && Object.keys(a.payload).length > 0 ? (
                        <pre className="mt-1 text-xs text-stone-400 overflow-x-auto">{JSON.stringify(a.payload, null, 2)}</pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "messages" && data.messages.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Messages & Reasoning</h3>
                <div className="space-y-2">
                  {data.messages.map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <span className="font-medium text-stone-300">{m.role}:</span>
                      <p className="text-stone-400 mt-0.5">{m.content}</p>
                      {m.reasoning != null ? (
                        <div className="mt-2 pt-2 border-t border-stone-700">
                          <span className="text-xs text-amber-400">Reasoning:</span>
                          <pre className="text-xs text-stone-500 mt-0.5 whitespace-pre-wrap">
                            {typeof m.reasoning === "string" ? m.reasoning : JSON.stringify(m.reasoning, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      <span className="text-xs text-stone-500">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "events" && data.events.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Events</h3>
                <div className="space-y-2">
                  {data.events.map((e, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <span className="font-medium text-stone-300">{e.event_type}</span>
                      <span className="text-stone-500 ml-2">{new Date(e.created_at).toLocaleString()}</span>
                      {e.payload != null && typeof e.payload === "object" && Object.keys(e.payload).length > 0 ? (
                        <pre className="mt-1 text-xs text-stone-400 overflow-x-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "policy" && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Policy Reasoning</h3>
                <div className="space-y-2">
                  {(data.policy_reasoning?.length ?? 0) > 0
                    ? data.policy_reasoning!.map((r, i) => (
                        <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm text-stone-300">{r}</div>
                      ))
                    : <p className="text-stone-500 text-sm">No policy reasoning recorded</p>}
                </div>
              </section>
            )}
            {tab === "counterfactual" && data.counterfactual && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Counterfactual</h3>
                <div className="p-3 rounded-lg bg-stone-800/80 text-sm">
                  <p className="text-stone-300">{data.counterfactual.impact}</p>
                  <p className="text-xs text-stone-500 mt-1">Baseline: {(data.counterfactual.baseline_conversion * 100).toFixed(1)}%</p>
                </div>
              </section>
            )}
            {tab === "call" && (
              <section>
                {(data.call_inference?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Call Inference</h3>
                    <div className="space-y-2">
                      {data.call_inference!.map((inf, i) => (
                        <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                          <p className="text-stone-500 text-xs">Session {inf.call_session_id.slice(0, 8)}…</p>
                          <p className="text-amber-400 font-medium mt-1">
                            Show: {inf.show_status ?? "—"} {inf.show_confidence != null ? `(${Math.round((inf.show_confidence ?? 0) * 100)}%)` : ""}
                          </p>
                          {inf.show_reason && <p className="text-stone-400 mt-0.5">{inf.show_reason}</p>}
                          <p className="text-stone-500 text-xs mt-1">
                            Wrap-up used: {inf.wrapup_used ? "Yes" : "No"} · Transcript available: {inf.transcript_available ? "Yes" : "No"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(data.call_analysis?.length ?? 0) > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Call Analysis</h3>
                    <div className="space-y-3">
                  {data.call_analysis!.map((a, i) => {
                    const ana = a.analysis_json ?? {};
                    const consent = a.consent as { consent_granted?: boolean; consent_mode?: string } | undefined;
                    const canShowQuotes = consent?.consent_granted !== false && consent?.consent_mode !== "off";
                    return (
                      <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                        <p className="text-stone-500 text-xs">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                        {ana.outcome != null ? <p className="text-amber-400 font-medium mt-1">Outcome: {String(ana.outcome)}</p> : null}
                        {ana.summary != null ? <p className="text-stone-300 mt-1">{String(ana.summary)}</p> : null}
                        {canShowQuotes && ana.objections && Array.isArray(ana.objections) ? (
                          <div className="mt-2">
                            <span className="text-stone-500 text-xs">Key quotes (objections):</span>
                            <ul className="list-disc list-inside text-stone-400 mt-0.5">
                              {(ana.objections as Array<{ quote?: string }>).filter((o) => o.quote).map((o, j) => (
                                <li key={j}>&quot;{o.quote}&quot;</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {ana.followup_plan && Array.isArray(ana.followup_plan) ? (
                          <div className="mt-2">
                            <span className="text-stone-500 text-xs">Follow-up plan:</span>
                            <pre className="text-xs text-stone-400 mt-0.5 overflow-x-auto">
                              {JSON.stringify(ana.followup_plan, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                  </>
                )}
                {(data.call_analysis?.length ?? 0) === 0 && (data.call_inference?.length ?? 0) === 0 && (
                  <p className="text-stone-500 text-sm">No call data</p>
                )}
              </section>
            )}
            {tab === "billing" && data.billing_impact && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Billing Impact</h3>
                <div className="p-3 rounded-lg bg-stone-800/80 text-sm">
                  <p className="text-stone-300">${(data.billing_impact.amount_cents / 100).toLocaleString()}</p>
                  <p className="text-xs text-stone-500">Status: {data.billing_impact.status}</p>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

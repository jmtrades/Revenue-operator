"use client";

import { useEffect, useState } from "react";

interface ReadinessDriver {
  factor: string;
  contribution: number;
  evidence_ids: string[];
}

interface ReadinessCounterfactual {
  if: string;
  then_score: number;
  why: string;
}

interface ReadinessProof {
  conversation_readiness_score: number;
  readiness_explanation: string;
  readiness_drivers: ReadinessDriver[];
  counterfactuals: ReadinessCounterfactual[];
  evidence_chain: string[];
}

interface ReadinessProofDrawerProps {
  leadId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReadinessProofDrawer({ leadId, workspaceId, isOpen, onClose }: ReadinessProofDrawerProps) {
  const [data, setData] = useState<ReadinessProof | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !leadId || !workspaceId) return;
    setLoading(true);
    fetch(`/api/leads/${leadId}/readiness?workspace_id=${workspaceId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [leadId, workspaceId, isOpen]);

  if (!isOpen) return null;

  const drivers = data?.readiness_drivers ?? [];
  const top3 = drivers.slice(0, 3);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-stone-900 border-l border-stone-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <h2 className="text-lg font-semibold text-stone-100">Why this score</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>One moment…</p>
        ) : !data ? (
          <p className="text-stone-500">No readiness data</p>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-stone-800/80">
              <p className="text-3xl font-semibold text-amber-400">{data.conversation_readiness_score}%</p>
              <p className="text-sm text-stone-400 mt-1">{data.readiness_explanation}</p>
            </div>

            {top3.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Top 3 drivers</h3>
                <div className="space-y-2">
                  {top3.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <span className="font-medium text-amber-400">{d.factor}</span>
                      <span className={`ml-2 ${d.contribution >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {d.contribution >= 0 ? "+" : ""}{d.contribution}
                      </span>
                      {d.evidence_ids.length > 0 && (
                        <p className="text-xs text-stone-500 mt-1">
                          Evidence: {d.evidence_ids.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(data.counterfactuals?.length ?? 0) > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Counterfactuals</h3>
                <div className="space-y-2">
                  {data.counterfactuals!.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <p className="font-medium text-stone-300">{c.if}</p>
                      <p className="text-amber-400 mt-0.5">→ {c.then_score}%</p>
                      <p className="text-stone-500 text-xs mt-1">{c.why}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(data.evidence_chain?.length ?? 0) > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-2">Evidence chain</h3>
                <div className="p-3 rounded-lg bg-stone-800/80">
                  <p className="text-xs text-stone-500 font-mono break-all">
                    {data.evidence_chain!.slice(0, 10).join(" • ")}
                  </p>
                  {data.evidence_chain!.length > 10 && (
                    <p className="text-xs text-stone-600 mt-1">+{data.evidence_chain!.length - 10} more</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

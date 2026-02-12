"use client";

import { useEffect, useState } from "react";

interface ProofData {
  actions: Array<{ action: string; payload: unknown; created_at: string }>;
  messages: Array<{ role: string; content: string; created_at: string }>;
  counterfactual?: { impact: string };
  stability?: {
    plan?: { next_action_type: string; next_action_at: string };
    cooldown?: { cooldown_until?: string };
  };
}

interface ProofDrawerProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
}

function toOutcomeLabel(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("follow") || a.includes("outreach")) return "Follow-up scheduled";
  if (a.includes("confirm") || a.includes("attendance")) return "Attendance confirmed";
  if (a.includes("recover") || a.includes("re-engag")) return "Conversation recovered";
  if (a.includes("reply") || a.includes("response")) return "Response prepared";
  if (a.includes("restraint") || a.includes("hold")) return "Held back — next touch planned";
  return "Conversation kept active";
}

export function ProofDrawer({ leadId, isOpen, onClose }: ProofDrawerProps) {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !leadId) return;
    setLoading(true);
    fetch(`/api/leads/${leadId}/proof`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        return d;
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [leadId, isOpen]);

  if (!isOpen) return null;

  const outcomes = (data?.actions ?? [])
    .filter((a) => !String(a.action || "").toLowerCase().includes("internal"))
    .slice(-10)
    .map((a) => ({
      text: toOutcomeLabel(a.action),
      when: a.created_at,
    }));

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-stone-900 border-l border-stone-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <h2 className="text-lg font-semibold text-stone-100">What we&apos;re maintaining for this conversation</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <p className="text-stone-500">Preparing…</p>
        ) : !data ? (
          <p className="text-stone-500">No proof available yet.</p>
        ) : (
          <>
            {outcomes.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 mb-2">Why this mattered</h3>
                <p className="text-stone-300 text-sm mb-3">
                  This prevented the conversation from going cold.
                </p>
                <div className="space-y-2">
                  {outcomes.slice(-5).map((o, i) => (
                    <div key={i} className="p-3 rounded-lg bg-stone-800/80 text-sm">
                      <span className="text-emerald-400">{o.text}</span>
                      <span className="text-stone-500 text-xs ml-2">{new Date(o.when).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.counterfactual?.impact && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 mb-2">What would have happened</h3>
                <p className="text-stone-300 text-sm">{data.counterfactual.impact}</p>
              </section>
            )}

            {(data.stability?.plan || data.stability?.cooldown?.cooldown_until) && (
              <section>
                <h3 className="text-sm font-medium text-stone-400 mb-2">Next planned touch</h3>
                {data.stability?.plan && (
                  <p className="text-stone-300 text-sm">
                    {data.stability.plan.next_action_type} at {new Date(data.stability.plan.next_action_at).toLocaleString()}
                  </p>
                )}
                {data.stability?.cooldown?.cooldown_until && !data.stability?.plan && (
                  <p className="text-stone-300 text-sm">
                    Next touch at {new Date(data.stability.cooldown.cooldown_until).toLocaleString()}
                  </p>
                )}
              </section>
            )}

            {outcomes.length === 0 && !data.counterfactual && !data.stability?.plan && !data.stability?.cooldown?.cooldown_until && (
              <p className="text-stone-500 text-sm">We&apos;re maintaining this conversation. Activity will appear as we work.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

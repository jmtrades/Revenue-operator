"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

function toOutcomeLabelKey(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("follow") || a.includes("outreach") || a.includes("reply") || a.includes("response") || a.includes("restraint") || a.includes("hold")) return "outcome.followThrough";
  if (a.includes("confirm") || a.includes("attendance")) return "outcome.planningToAttend";
  if (a.includes("recover") || a.includes("re-engag")) return "outcome.customerReturned";
  if (a.includes("booking") || a.includes("book")) return "outcome.theyreSet";
  return "outcome.decisionProgressed";
}

export function ProofDrawer({ leadId, isOpen, onClose }: ProofDrawerProps) {
  const t = useTranslations("proofDrawer");
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
      text: t(toOutcomeLabelKey(a.action)),
      when: a.created_at,
    }));

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col"
      style={{
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("title")}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg focus-ring transition-opacity hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("closeAria")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>In progress.</p>
        ) : !data ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No proof available yet.</p>
        ) : (
          <>
            {outcomes.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Progress</h3>
                <div className="space-y-2">
                  {outcomes.slice(-5).map((o, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl text-sm"
                      style={{ background: "var(--surface)", borderRadius: "var(--radius-container)", color: "var(--text-primary)" }}
                    >
                      {o.text}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(data.stability?.plan || data.stability?.cooldown?.cooldown_until) && (
              <section>
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("nextPlannedTouch")}</h3>
                {data.stability?.plan && (
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {data.stability.plan.next_action_type} at {new Date(data.stability.plan.next_action_at).toLocaleString()}
                  </p>
                )}
                {data.stability?.cooldown?.cooldown_until && !data.stability?.plan && (
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Next touch at {new Date(data.stability.cooldown.cooldown_until).toLocaleString()}
                  </p>
                )}
              </section>
            )}

            {outcomes.length === 0 && !data.counterfactual && !data.stability?.plan && !data.stability?.cooldown?.cooldown_until && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("conversationInProgress")}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

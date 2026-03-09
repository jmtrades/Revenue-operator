"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";

type CallExample = {
  id: string;
  title: string;
  source: string;
  call_type: string | null;
  status: string;
  created_at: string;
};

type CallInsight = {
  id: string;
  call_example_id: string;
  category: string;
  insight: string;
  example_from_transcript: string | null;
  confidence: number;
  applied: boolean;
  dismissed: boolean;
  created_at: string;
};

type Agent = { id: string; name: string };

const CALL_TYPE_LABELS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  booking: "Booking",
  qualification: "Qualification",
  "follow-up": "Follow-up",
};

export default function CallIntelligencePage() {
  const [callExamples, setCallExamples] = useState<CallExample[]>([]);
  const [callInsights, setCallInsights] = useState<CallInsight[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [title, setTitle] = useState("");
  const [callType, setCallType] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [applyModal, setApplyModal] = useState<{ insightId: string; insight: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/call-intelligence", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { call_examples?: CallExample[]; call_insights?: CallInsight[] };
        setCallExamples(data.call_examples ?? []);
        setCallInsights(data.call_insights ?? []);
      } else {
        setCallExamples([]);
        setCallInsights([]);
      }
      const ws = await fetchWorkspaceMeCached();
      const wid = (ws as { id?: string | null } | null)?.id;
      if (wid) {
        const agentsRes = await fetch(`/api/agents?workspace_id=${encodeURIComponent(wid)}`, { credentials: "include" });
        if (agentsRes.ok) {
          const a = (await agentsRes.json()) as { agents?: Agent[] };
          setAgents(a.agents ?? []);
        }
      }
    } catch {
      setCallExamples([]);
      setCallInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalyze = async () => {
    const transcript = pasteText.trim();
    if (transcript.length < 100) {
      setToast("Paste at least 100 characters of transcript.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setAnalyzing(true);
    setToast(null);
    try {
      const res = await fetch("/api/call-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcript,
          title: title.trim() || undefined,
          call_type: callType.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean; insights_count?: number };
      if (res.ok && data.ok) {
        setPasteText("");
        setTitle("");
        setCallType("");
        setToast(`Analyzed. ${data.insights_count ?? 0} insights extracted.`);
        fetchData();
      } else {
        setToast(data.error ?? "Analysis failed.");
      }
    } catch {
      setToast("Something went wrong.");
    } finally {
      setAnalyzing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      const res = await fetch(`/api/call-intelligence/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dismissed: true }),
      });
      if (res.ok) fetchData();
    } catch {
      setToast("Failed to dismiss.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleApply = async (insightId: string, agentId: string) => {
    try {
      const res = await fetch(`/api/call-intelligence/insights/${insightId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agent_id: agentId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (res.ok && data.ok) {
        setApplyModal(null);
        setToast("Applied to agent.");
        fetchData();
      } else {
        setToast(data.error ?? "Apply failed.");
      }
    } catch {
      setToast("Something went wrong.");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const insightsByCategory = callInsights
    .filter((i) => !i.dismissed)
    .reduce<Record<string, CallInsight[]>>((acc, i) => {
      const cat = i.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(i);
      return acc;
    }, {});

  const categoryOrder = ["tone", "opening", "discovery", "objection_handling", "qualification", "closing", "empathy", "persistence", "pacing", "recovery", "other"];
  const appliedCount = callInsights.filter((i) => i.applied).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Call Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Analyze real conversations to make your AI agent smarter.
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
        <h2 className="text-base font-medium text-[var(--text-primary)] mb-1">Analyze a call</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Paste a transcript from a great call. We&apos;ll extract what makes it effective.
        </p>
          <input
            type="text"
            placeholder="Call title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:outline-none mb-3"
          />
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:outline-none mb-3"
          >
            <option value="">Call type (optional)</option>
            {Object.entries(CALL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <textarea
            placeholder="Paste transcript here (at least 100 characters)..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || pasteText.trim().length < 100}
            className="mt-3 px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
          >
            {analyzing ? "Analyzing…" : "Analyze transcript"}
          </button>
      </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
        <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
          Analyzed calls <span className="text-[var(--text-tertiary)] font-normal">({callExamples.length})</span>
        </h2>
        {loading && callExamples.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-8 w-48 rounded bg-[var(--bg-hover)] animate-pulse mb-3" />
            <div className="h-4 w-32 rounded bg-[var(--bg-hover)] animate-pulse" />
          </div>
        ) : callExamples.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-6">
            No calls yet. Paste a transcript above and click Analyze to see insights here.
          </p>
        ) : (
          <div className="space-y-3">
            {callExamples.map((ex) => {
              const count = callInsights.filter((i) => i.call_example_id === ex.id && !i.dismissed).length;
              const date = ex.created_at ? new Date(ex.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
              return (
                <div
                  key={ex.id}
                  className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{ex.title || "Untitled call"}</p>
                    <p className="text-[var(--text-secondary)] text-sm">
                      {ex.call_type ? CALL_TYPE_LABELS[ex.call_type] ?? ex.call_type : "Call"} · {date}
                    </p>
                    <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{count} insights</p>
                  </div>
                  <Link
                    href={`/app/call-intelligence?example=${ex.id}`}
                    className="shrink-0 text-sm font-medium text-[var(--text-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none rounded"
                  >
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
        <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
          Applied insights <span className="text-[var(--text-tertiary)] font-normal">({appliedCount})</span>
        </h2>
        {Object.keys(insightsByCategory).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4">
            Insights you apply will shape your AI agent&apos;s behavior. Analyze a call above, then apply insights to an agent.
          </p>
        ) : (
          <div className="space-y-4">
            {categoryOrder.filter((c) => insightsByCategory[c]?.length).map((cat) => (
              <div key={cat} className="border border-[var(--border-default)] rounded-xl p-4 bg-[var(--bg-input)]">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  {cat.replace(/_/g, " ")}
                </h3>
                {insightsByCategory[cat].map((i) => (
                  <div
                    key={i.id}
                    className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0"
                  >
                    <p className="text-[var(--text-primary)] text-sm flex-1 min-w-0">{i.insight}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {i.applied ? (
                        <span className="text-xs text-[var(--accent-green)]">Applied</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setApplyModal({ insightId: i.id, insight: i.insight })}
                            className="text-xs font-medium text-[var(--text-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none rounded"
                          >
                            Apply to agent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismiss(i.id)}
                            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none rounded"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm shadow-lg z-50">
          {toast}
        </div>
      )}

      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setApplyModal(null)}>
          <div
            className="bg-[var(--bg-card-elevated)] border border-[var(--border-default)] rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Apply to agent</h3>
            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{applyModal.insight}</p>
            <div className="space-y-2">
              {agents.length === 0 ? (
                <p className="text-[var(--text-secondary)] text-sm">No agents yet. Create one in Agents.</p>
              ) : (
                agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleApply(applyModal.insightId, a.id)}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                  >
                    {a.name}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setApplyModal(null)}
              className="mt-4 w-full px-4 py-2 rounded-xl text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

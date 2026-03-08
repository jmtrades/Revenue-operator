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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Call Intelligence</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Learn from your best calls to make your AI even better.
          </p>
        </div>

        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white mb-2">Upload a call</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Paste a transcript. We’ll analyze the conversation and suggest improvements for your AI agent.
          </p>
          <input
            type="text"
            placeholder="Call title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none mb-3"
          />
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none mb-3"
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
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || pasteText.trim().length < 100}
            className="mt-3 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none"
          >
            {analyzing ? "Analyzing…" : "Analyze transcript"}
          </button>
        </section>

        {callExamples.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-3">Analyzed calls ({callExamples.length})</h2>
            <div className="space-y-3">
              {callExamples.map((ex) => {
                const count = callInsights.filter((i) => i.call_example_id === ex.id && !i.dismissed).length;
                const date = ex.created_at ? new Date(ex.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
                return (
                  <div
                    key={ex.id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{ex.title || "Untitled call"}</p>
                      <p className="text-zinc-500 text-sm">
                        {ex.call_type ? CALL_TYPE_LABELS[ex.call_type] ?? ex.call_type : "Call"} · Analyzed {date}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">{count} insights extracted</p>
                    </div>
                    <Link
                      href={`/app/call-intelligence?example=${ex.id}`}
                      className="text-sm font-medium text-white hover:underline"
                    >
                      View insights
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {Object.keys(insightsByCategory).length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-3">Insights summary</h2>
            <p className="text-zinc-500 text-sm mb-4">
              From your analyzed calls. Apply an insight to add it to an agent’s learned behaviors.
            </p>
            <div className="space-y-4">
              {categoryOrder.filter((c) => insightsByCategory[c]?.length).map((cat) => (
                <div key={cat} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-2">
                    {cat.replace(/_/g, " ")}
                  </h3>
                  {insightsByCategory[cat].map((i) => (
                    <div
                      key={i.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800 last:border-0"
                    >
                      <p className="text-white text-sm flex-1">{i.insight}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {i.applied ? (
                          <span className="text-xs text-green-500">Applied</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setApplyModal({ insightId: i.id, insight: i.insight })}
                              className="text-xs font-medium text-white hover:underline"
                            >
                              Apply to agent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismiss(i.id)}
                              className="text-xs text-zinc-500 hover:text-zinc-400"
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
          </section>
        )}

        {loading && callExamples.length === 0 && !Object.keys(insightsByCategory).length && (
          <p className="text-zinc-500 text-sm">Loading…</p>
        )}
        {!loading && callExamples.length === 0 && (
          <p className="text-zinc-500 text-sm">
            No analyzed calls yet. Paste a transcript above and click Analyze.
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm shadow-lg z-50">
          {toast}
        </div>
      )}

      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setApplyModal(null)}>
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Apply to agent</h3>
            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{applyModal.insight}</p>
            <div className="space-y-2">
              {agents.length === 0 ? (
                <p className="text-zinc-500 text-sm">No agents yet. Create one in Agents.</p>
              ) : (
                agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleApply(applyModal.insightId, a.id)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800"
                  >
                    {a.name}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setApplyModal(null)}
              className="mt-4 w-full px-4 py-2 rounded-xl text-zinc-400 text-sm hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

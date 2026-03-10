"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
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

  const analyzedCount = callExamples.length;
  const insightCount = callInsights.length;
  const confidenceValues = callInsights
    .map((i) => (typeof i.confidence === "number" ? i.confidence : null))
    .filter((v): v is number => v !== null);
  const avgConfidence =
    confidenceValues.length > 0
      ? Math.round(
          (confidenceValues.reduce((sum, v) => sum + v, 0) /
            confidenceValues.length) *
            10,
        ) / 10
      : null;
  const avgScore = avgConfidence != null ? Math.round(avgConfidence * 10) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Call Intelligence</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Analyze real conversations to make your AI agent smarter.
        </p>
      </div>

      {/* Section 1: Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{analyzedCount}</p>
          <p className="text-xs text-zinc-500 mt-1">Calls analyzed</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{insightCount}</p>
          <p className="text-xs text-zinc-500 mt-1">Insights extracted</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{appliedCount}</p>
          <p className="text-xs text-zinc-500 mt-1">Applied to agent</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{avgScore != null ? `${avgScore}/10` : "—"}</p>
          <p className="text-xs text-zinc-500 mt-1">Avg quality</p>
        </div>
      </div>

      {/* Section 2: Analyze a new call — collapsible */}
      <details
        className="bg-[#161B22] border border-white/[0.08] rounded-xl"
        open={analyzedCount === 0}
      >
        <summary className="p-4 cursor-pointer text-sm font-medium text-white/70 flex items-center justify-between list-none">
          <span>Analyze a new call</span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-2 [details[open]_&]:rotate-180 transition-transform" />
        </summary>
        <div className="p-4 pt-0">
          <p className="text-sm text-zinc-400 mb-4">
            Paste a transcript from a great call. We&apos;ll extract what makes it effective.
          </p>
          <input
            type="text"
            placeholder="Call title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none mb-3"
          />
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-zinc-600 focus:outline-none mb-3"
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || pasteText.trim().length < 100}
            className="mt-3 px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            {analyzing ? "Analyzing…" : "Analyze transcript"}
          </button>
        </div>
      </details>

      {/* Section 3: Recent Insights — main content */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-medium text-white mb-4">
          Recent insights
        </h2>
        {loading && callInsights.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-8 w-48 rounded bg-zinc-800 animate-pulse mb-3" />
            <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
          </div>
        ) : Object.keys(insightsByCategory).length === 0 ? (
          <p className="text-sm text-zinc-400 py-6">
            No insights yet. Analyze a call above to extract insights, then apply them to your agent.
          </p>
        ) : (
          <div className="space-y-4">
            {categoryOrder.filter((c) => insightsByCategory[c]?.length).map((cat) => (
              <div key={cat} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/30">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
                  {cat.replace(/_/g, " ")}
                </h3>
                <div className="space-y-3">
                  {insightsByCategory[cat].map((i) => (
                    <div
                      key={i.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">{i.insight}</p>
                        {i.example_from_transcript && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">&quot;{i.example_from_transcript}&quot;</p>
                        )}
                        {typeof i.confidence === "number" && (
                          <p className="text-xs text-zinc-500 mt-0.5">Quality: {Math.round(i.confidence * 10)}/10</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {i.applied ? (
                          <span className="text-xs text-green-500">Applied</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setApplyModal({ insightId: i.id, insight: i.insight })}
                              className="text-xs font-medium text-white hover:underline focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded"
                            >
                              Apply to agent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismiss(i.id)}
                              className="text-xs text-zinc-500 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Common Questions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-medium text-white mb-4">
          Common questions
        </h2>
        <p className="text-sm text-zinc-400 mb-3">
          Frequently asked questions from analyzed transcripts. Add these to your knowledge base to improve answers.
        </p>
        {callInsights.filter((i) => i.insight.trim().endsWith("?") || i.example_from_transcript?.trim().endsWith("?")).length > 0 ? (
          <ul className="space-y-2">
            {callInsights
              .filter((i) => i.insight.trim().endsWith("?") || i.example_from_transcript?.trim().endsWith("?"))
              .slice(0, 10)
              .map((i) => (
                <li key={i.id} className="text-sm text-white flex items-start gap-2">
                  <span className="text-zinc-500">•</span>
                  <span>{i.insight.trim().endsWith("?") ? i.insight : i.example_from_transcript ?? i.insight}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Analyze more calls to see common questions from transcripts.</p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm shadow-lg z-50">
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
                <p className="text-zinc-400 text-sm">No agents yet. Create one in Agents.</p>
              ) : (
                agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleApply(applyModal.insightId, a.id)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
                  >
                    {a.name}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setApplyModal(null)}
              className="mt-4 w-full px-4 py-2 rounded-xl text-zinc-400 text-sm hover:text-white focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

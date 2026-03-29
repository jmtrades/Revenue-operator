"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Shell } from "@/components/Shell";
import { Brain, TrendingUp, AlertCircle, CheckCircle2, MessageSquareWarning } from "lucide-react";

interface KnowledgeGap {
  id: string;
  question: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
}

interface QuickStats {
  active_leads: number;
  recent_calls: number;
  pending_followups: number;
}

export default function IntelligencePage() {
  const { workspaceId } = useWorkspace();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetchWithFallback<{ gaps: KnowledgeGap[]; total: number }>(
        `/api/dashboard/knowledge-gaps?workspace_id=${encodeURIComponent(workspaceId)}`
      ),
      fetchWithFallback<QuickStats>(
        `/api/dashboard/quick-stats?workspace_id=${encodeURIComponent(workspaceId)}`
      ),
    ]).then(([gapsRes, statsRes]) => {
      if (gapsRes.data?.gaps) setGaps(gapsRes.data.gaps);
      if (statsRes.data) setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleAddAnswer(gapId: string) {
    const answer = answerText[gapId]?.trim();
    if (!answer || !workspaceId) return;
    setSubmitting(gapId);
    try {
      await fetch("/api/dashboard/knowledge-gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, gap_id: gapId, action: "add_answer", answer }),
      });
      setGaps((prev) => prev.filter((g) => g.id !== gapId));
      setAnswerText((prev) => { const next = { ...prev }; delete next[gapId]; return next; });
    } catch {
      // Silent fail
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDismiss(gapId: string) {
    if (!workspaceId) return;
    await fetch("/api/dashboard/knowledge-gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, gap_id: gapId, action: "dismiss" }),
    });
    setGaps((prev) => prev.filter((g) => g.id !== gapId));
  }

  return (
    <Shell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <h1 className="text-lg font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)" }}>AI Intelligence</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Your AI gets smarter with every call. Track learning metrics, fill knowledge gaps, and watch performance improve.
        </p>

        {/* Learning Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Calls This Week</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats?.recent_calls ?? "—"}</p>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Open Knowledge Gaps</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{gaps.length}</p>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Active Leads</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats?.active_leads ?? "—"}</p>
          </div>
        </div>

        {/* Knowledge Gaps */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Knowledge Gaps</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Questions your AI couldn&apos;t answer during calls. Add an answer once — every future call handles it automatically.
          </p>

          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : gaps.length === 0 ? (
            <div className="rounded-lg border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No knowledge gaps</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Your AI is answering all questions successfully. Nice work!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gaps.map((gap) => (
                <div key={gap.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        <AlertCircle className="w-3.5 h-3.5 inline-block mr-1.5 text-amber-500" />
                        &ldquo;{gap.question}&rdquo;
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Asked {gap.occurrences} time{gap.occurrences !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismiss(gap.id)}
                      className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type the answer here..."
                      value={answerText[gap.id] ?? ""}
                      onChange={(e) => setAnswerText((prev) => ({ ...prev, [gap.id]: e.target.value }))}
                      className="flex-1 text-sm px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--input)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(gap.id)}
                      disabled={!answerText[gap.id]?.trim() || submitting === gap.id}
                      className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
                      style={{ background: "var(--accent-primary)", color: "#fff" }}
                    >
                      {submitting === gap.id ? "Saving..." : "Add Answer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>How to make your AI smarter</h3>
          <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>1. Fill knowledge gaps above — add answers to questions your AI missed.</p>
            <p>2. Update your agent&apos;s knowledge base in <Link href="/dashboard/agents" style={{ color: "var(--accent-primary)" }}>Agent Settings</Link> with FAQs, services, and common objections.</p>
            <p>3. Refine your greeting and system prompt based on call feedback.</p>
            <p>4. After 50+ calls, we&apos;ll suggest prompt optimizations based on what works best.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

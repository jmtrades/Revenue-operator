"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Brain, ChevronDown, Flag, Music2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type CallExample = {
  id: string;
  title: string;
  source: string;
  call_type: string | null;
  status: string;
  created_at: string;
  agent_id?: string | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
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

function getCallTypeLabels(t: (k: string) => string): Record<string, string> {
  return {
    sales: t("types.sales"),
    support: t("types.support"),
    booking: t("types.booking"),
    qualification: t("types.qualification"),
    "follow-up": t("types.followUp"),
  };
}

type QualityBucket = "all" | "excellent" | "good" | "review" | "flagged";

function getScoreLabel(bucket: QualityBucket, t: (k: string) => string): string {
  if (bucket === "all") return "";
  return t(`quality.${bucket}`);
}

function calculateQualityScore(call: {
  sentiment?: string;
  outcome?: string;
  duration?: number;
  actionItems?: string[];
}): { score: number; color: string; bucket: QualityBucket } {
  // NOTE: This score is a rough composite estimate combining sentiment, outcome, and duration.
  // It's not based on validated call quality metrics. Use individual signals below instead.
  let score = 50;

  if (call.sentiment === "positive") score += 20;
  else if (call.sentiment === "negative") score -= 15;

  if (call.outcome === "booked" || call.outcome === "lead") score += 20;
  else if (call.outcome === "missed" || call.outcome === "voicemail") score -= 20;

  if (call.duration && call.duration > 30 && call.duration < 600) score += 10;
  else if (call.duration && call.duration < 10) score -= 10;

  if (call.actionItems && call.actionItems.length > 0) score += 10;

  score = Math.max(0, Math.min(100, score));

  if (score >= 80) return { score, color: "var(--accent-secondary)", bucket: "excellent" };
  if (score >= 60) return { score, color: "var(--accent-primary)", bucket: "good" };
  if (score >= 40) return { score, color: "var(--accent-warning)", bucket: "review" };
  return { score, color: "var(--accent-danger)", bucket: "flagged" };
}

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
  const [activeTab, setActiveTab] = useState<"analyzed" | "manual">("analyzed");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityBucket>("all");
  const [qualityTrendDays, setQualityTrendDays] = useState<7 | 30 | 90>(30);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const t = useTranslations("callIntelligence");
  const tCommon = useTranslations("common");
  const callTypeLabels = useMemo(() => getCallTypeLabels(t), [t]);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

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

  useEffect(() => {
    const notes: Record<string, string> = {};
    callExamples.forEach((c) => {
      const v = safeGetItem(`rt_call_note_${c.id}`);
      if (v) notes[c.id] = v;
    });
    setCallNotes((prev) => ({ ...notes, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when list length changes
  }, [callExamples.length]);

  const handleAnalyze = async () => {
    const transcript = pasteText.trim();
    if (transcript.length < 100) {
      setToast(t("toast.minTranscript"));
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
        setToast(t("toast.analysisSuccess", { count: data.insights_count ?? 0 }));
        fetchData();
      } else {
        setToast(data.error ?? t("toast.analysisFailed"));
      }
    } catch {
      setToast(tCommon("errorGeneric"));
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
      setToast(t("toast.dismissFailed"));
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
        setToast(t("toast.applied"));
        fetchData();
      } else {
        setToast(data.error ?? t("toast.applyFailed"));
      }
    } catch {
      setToast(tCommon("errorGeneric"));
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

  const qualityPerCall = useMemo(() => {
    return callExamples.map((call) => {
      const insightsForCall = callInsights.filter(
        (i) => i.call_example_id === call.id && !i.dismissed,
      );
      const primaryInsight = insightsForCall[0];
      const actionItems = insightsForCall.map((i) => i.insight);
      return {
        call,
        quality: calculateQualityScore({
          sentiment: primaryInsight?.category === "tone" ? primaryInsight.insight : undefined,
          outcome: primaryInsight?.category === "closing" ? primaryInsight.insight : undefined,
          duration: call.duration_seconds ?? undefined,
          actionItems,
        }),
      };
    });
  }, [callExamples, callInsights]);

  const trendStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - qualityTrendDays);
    return d.getTime();
  }, [qualityTrendDays]);

  const qualityTrendData = useMemo(() => {
    const filtered = qualityPerCall.filter(
      (p) => new Date(p.call.created_at).getTime() >= trendStart,
    );
    const byDay: Record<string, { total: number; sum: number }> = {};
    filtered.forEach(({ call, quality }) => {
      const day = new Date(call.created_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, sum: 0 };
      byDay[day].total += 1;
      byDay[day].sum += quality.score;
    });
    return Object.entries(byDay)
      .map(([isoDate, { total, sum }]) => ({
        sortKey: isoDate,
        date: new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        avgScore: total > 0 ? Math.round(sum / total) : 0,
        calls: total,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [qualityPerCall, trendStart]);

  const commonIssues = useMemo(() => {
    const issues: { label: string; count: number }[] = [];
    let negativeTone = 0;
    let missedOutcome = 0;
    let shortDuration = 0;
    qualityPerCall.forEach(({ call, quality }) => {
      if (quality.score < 60) {
        const insightsForCall = callInsights.filter(
          (i) => i.call_example_id === call.id && !i.dismissed,
        );
        const toneInsight = insightsForCall.find((i) => i.category === "tone");
        const closingInsight = insightsForCall.find((i) => i.category === "closing");
        // Use severity field instead of English keyword matching (locale-safe)
        const toneSev = (toneInsight as { severity?: string } | undefined)?.severity;
        if (toneInsight && (toneSev === "high" || toneSev === "critical")) negativeTone += 1;
        const closeSev = (closingInsight as { severity?: string } | undefined)?.severity;
        if (closingInsight && (closeSev === "high" || closeSev === "critical")) missedOutcome += 1;
        if (call.duration_seconds != null && call.duration_seconds < 10) shortDuration += 1;
      }
    });
    if (negativeTone > 0) issues.push({ label: t("issues.negativeTone"), count: negativeTone });
    if (missedOutcome > 0) issues.push({ label: t("issues.missedVoicemail"), count: missedOutcome });
    if (shortDuration > 0) issues.push({ label: t("issues.shortCall"), count: shortDuration });
    return issues;
  }, [qualityPerCall, callInsights, t]);

  const agentLeaderboard = useMemo(() => {
    const byAgent: Record<string, { sum: number; count: number }> = {};
    qualityPerCall.forEach(({ call, quality }) => {
      const aid = call.agent_id ?? "_unknown_";
      if (!byAgent[aid]) byAgent[aid] = { sum: 0, count: 0 };
      byAgent[aid].sum += quality.score;
      byAgent[aid].count += 1;
    });
    return Object.entries(byAgent)
      .map(([agentId, { sum, count }]) => ({
        agentId: agentId === "_unknown_" ? null : agentId,
        agentName: agentId === "_unknown_" ? t("unassigned") : (agents.find((a) => a.id === agentId)?.name ?? t("unknown")),
        avgScore: count > 0 ? Math.round(sum / count) : 0,
        calls: count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [qualityPerCall, agents, t]);

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
      <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Call intelligence" }]} />
      <div>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("heading")}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-1 mb-2">
        <button
          type="button"
          onClick={() => setActiveTab("analyzed")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,transform]",
            activeTab === "analyzed"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
          )}
        >
          {t("tabs.analyzed")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,transform]",
            activeTab === "manual"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
          )}
        >
          {t("tabs.manual")}
        </button>
      </div>

      {activeTab === "analyzed" && (
        <div className="space-y-6">
          {/* Section 1: Performance Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{analyzedCount}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t("stats.callsAnalyzed")}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{insightCount}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t("stats.insightsExtracted")}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{appliedCount}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t("stats.appliedToAgent")}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {avgScore != null ? `${avgScore}/10` : "—"}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t("stats.avgQuality")}</p>
            </div>
          </div>

          {/* Quality Trends */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-medium text-[var(--text-primary)]">{t("chart.qualityTrends")}</h2>
              <div className="flex gap-1">
                {([7, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setQualityTrendDays(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      qualityTrendDays === d
                        ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-inset)]/50",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {qualityTrendData.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center">{t("chart.noData")}</p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={undefined}>
                  <LineChart data={qualityTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} stroke="var(--text-tertiary)" />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                      labelStyle={{ color: "var(--text-primary)" }}
                      formatter={(value) => [value != null ? String(value) : "—", t("chart.avgQuality")]}
                    />
                    <Line type="monotone" dataKey="avgScore" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: "var(--accent-primary)", r: 3 }} name={t("chart.avgQuality")} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Common Issues + Agent Leaderboard row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-3">{t("commonIssues.title")}</h2>
              {commonIssues.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">{t("commonIssues.empty")}</p>
              ) : (
                <ul className="space-y-2">
                  {commonIssues.map((issue) => (
                    <li key={issue.label} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{issue.label}</span>
                      <span className="text-[var(--accent-warning,#f59e0b)] font-medium">{issue.count} {t("commonIssues.calls")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-3">Agent leaderboard (avg quality)</h2>
              {agentLeaderboard.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No calls by agent yet.</p>
              ) : (
                <ol className="space-y-2">
                  {agentLeaderboard.map((row, idx) => (
                    <li key={row.agentId ?? "_unknown_"} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        {idx + 1}. {row.agentName}
                      </span>
                      <span className="text-[var(--text-primary)] font-medium">{row.avgScore} · {row.calls} {t("commonIssues.calls")}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Analyzed calls list */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-medium text-[var(--text-primary)]">
                {t("tabs.analyzed")}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQualityFilter("flagged")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    qualityFilter === "flagged"
                      ? "bg-[var(--accent-danger,#ef4444)]/20 border-[var(--accent-danger,#ef4444)]/40 text-[var(--accent-danger,#ef4444)]"
                      : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {t("filters.flagged")}
                </button>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value as QualityBucket)}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                >
                  <option value="all">{t("filters.quality.all")}</option>
                  <option value="excellent">{t("filters.quality.excellent")}</option>
                  <option value="good">{t("filters.quality.good")}</option>
                  <option value="review">{t("filters.quality.review")}</option>
                  <option value="flagged">{t("filters.quality.flagged")}</option>
                </select>
              </div>
            </div>
            {loading && callExamples.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="h-8 w-48 rounded-xl bg-[var(--bg-inset)] skeleton-shimmer mb-3" />
                <div className="h-4 w-32 rounded-xl bg-[var(--bg-inset)] skeleton-shimmer" />
              </div>
            ) : callExamples.length === 0 ? (
              <div className="py-8 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/50 text-center">
                <Brain className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" aria-hidden />
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("empty.analyzed")}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <Link
                    href="/app/calls"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90"
                  >
                    {t("empty.cta")} →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)]"
                  >
                    {t("empty.ctaSecondary")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {qualityPerCall
                  .filter(({ quality }) => qualityFilter === "all" || quality.bucket === qualityFilter)
                  .map(({ call, quality }) => {
                  const insightsForCall = callInsights.filter(
                    (i) => i.call_example_id === call.id && !i.dismissed,
                  );
                  const primaryInsight = insightsForCall[0];
                  const callDate = new Date(call.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const badgeLabel =
                    (call.call_type && callTypeLabels[call.call_type]) || t("other");
                  const isExpanded = expandedCallId === call.id;

                  const insightsByCatForCall = insightsForCall.reduce<
                    Record<string, CallInsight[]>
                  >((acc, i) => {
                    const cat = i.category || "other";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(i);
                    return acc;
                  }, {});

                  return (
                    <div
                      key={call.id}
                      className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-3"
                    >
                      <button
                        type="button"
                        className="w-full flex items-start justify-between gap-3 text-left"
                        onClick={() =>
                          setExpandedCallId((prev) => (prev === call.id ? null : call.id))
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {call.title || t("untitledCall")}
                            </p>
                            <span className="inline-flex items-center rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                              {badgeLabel}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: `${quality.color}15`,
                                color: quality.color,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: quality.color }}
                              />
                              {quality.score} · {getScoreLabel(quality.bucket, t)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {callDate} · {insightsForCall.length} insight
                            {insightsForCall.length === 1 ? "" : "s"}
                          </p>
                          {primaryInsight && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                              {primaryInsight.insight}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-[var(--text-tertiary)] mt-1 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-default)] space-y-3">
                          {call.audio_url && (
                            <div className="rounded-xl bg-[var(--bg-surface)]/80 p-3">
                              <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                                <Music2 className="w-3.5 h-3.5" />
                                {t("recording")}
                              </p>
                              <audio
                                src={call.audio_url}
                                controls
                                className="w-full h-9 rounded-lg"
                                preload="metadata"
                              />
                              <div className="mt-2 h-8 flex items-end gap-0.5 overflow-hidden rounded" aria-hidden>
                                {Array.from({ length: 32 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 min-w-[2px] bg-[var(--accent-primary)]/40 rounded-sm"
                                    style={{ height: `${20 + Math.sin(i * 0.5) * 60}%` }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">{t("notes.label")}</p>
                            <textarea
                              value={callNotes[call.id] ?? ""}
                              onChange={(e) => setCallNotes((prev) => ({ ...prev, [call.id]: e.target.value }))}
                              placeholder={t("notePlaceholder")}
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none resize-y"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const note = callNotes[call.id] ?? "";
                                const key = `rt_call_note_${call.id}`;
                                if (note) {
                                  setToast(safeSetItem(key, note) ? t("notes.saved") : t("notes.saveFailed"));
                                } else {
                                  safeRemoveItem(key);
                                  setToast(t("notes.saved"));
                                }
                                setTimeout(() => setToast(null), 2000);
                              }}
                              className="mt-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                            >
                              {t("notes.save")}
                            </button>
                          </div>
                          {insightsForCall.length > 0 && (
                            <>
                          {categoryOrder
                            .filter((cat) => insightsByCatForCall[cat]?.length)
                            .map((cat) => (
                              <div key={cat}>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5">
                                  {cat.replace(/_/g, " ")}
                                </p>
                                <div className="space-y-2">
                                  {insightsByCatForCall[cat].map((i) => (
                                    <div
                                      key={i.id}
                                      className="flex items-start justify-between gap-3"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm text-[var(--text-primary)]">
                                          {i.insight}
                                        </p>
                                        {i.example_from_transcript && (
                                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                                            &quot;{i.example_from_transcript}&quot;
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {i.applied ? (
                                          <span className="text-xs text-[var(--accent-primary)]">
                                            Applied
                                          </span>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setApplyModal({
                                                  insightId: i.id,
                                                  insight: i.insight,
                                                })
                                              }
                                              className="text-xs font-medium text-[var(--text-primary)] hover:underline"
                                            >
                                              Apply
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDismiss(i.id)}
                                              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                            >
                                              {t("dismiss")}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent insights summary */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
            <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
              {t("insights.title")}
            </h2>
            {loading && callInsights.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="h-8 w-48 rounded bg-[var(--bg-inset)] skeleton-shimmer mb-3" />
                <div className="h-4 w-32 rounded bg-[var(--bg-inset)] skeleton-shimmer" />
              </div>
            ) : Object.keys(insightsByCategory).length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-6">
                {t("insights.empty")}
              </p>
            ) : (
              <div className="space-y-4">
                {categoryOrder
                  .filter((c) => insightsByCategory[c]?.length)
                  .map((cat) => (
                    <div
                      key={cat}
                      className="border border-[var(--border-default)] rounded-xl p-4 bg-[var(--bg-surface)]"
                    >
                      <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        {cat.replace(/_/g, " ")}
                      </h3>
                      <div className="space-y-3">
                        {insightsByCategory[cat].map((i) => (
                          <div
                            key={i.id}
                            className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[var(--text-primary)]">{i.insight}</p>
                              {i.example_from_transcript && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                                  &quot;{i.example_from_transcript}&quot;
                                </p>
                              )}
                              {typeof i.confidence === "number" && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                  Quality: {Math.round(i.confidence * 10)}/10
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {i.applied ? (
                                <span className="text-xs text-[var(--accent-primary)]">Applied</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setApplyModal({ insightId: i.id, insight: i.insight })
                                    }
                                    className="text-xs font-medium text-[var(--text-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded"
                                  >
                                    Apply to agent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDismiss(i.id)}
                                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded"
                                  >
                                    {t("dismiss")}
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

          {/* Common Questions */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6">
            <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
              {t("questions.title")}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)] mb-3">
              {t("questions.desc")}
            </p>
            {callInsights.filter(
              (i) =>
                i.insight.trim().endsWith("?") ||
                i.example_from_transcript?.trim().endsWith("?"),
            ).length > 0 ? (
              <ul className="space-y-2">
                {callInsights
                  .filter(
                    (i) =>
                      i.insight.trim().endsWith("?") ||
                      i.example_from_transcript?.trim().endsWith("?"),
                  )
                  .slice(0, 10)
                  .map((i) => (
                    <li
                      key={i.id}
                      className="text-sm text-[var(--text-primary)] flex items-start gap-2"
                    >
                      <span className="text-[var(--text-secondary)]">•</span>
                      <span>
                        {i.insight.trim().endsWith("?")
                          ? i.insight
                          : i.example_from_transcript ?? i.insight}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                {t("questions.empty")}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-medium text-[var(--text-primary)]">
              {t("analyze.title")}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t("analyze.subtitle")}
            </p>
          </div>
          <input
            type="text"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          >
            <option value="">{t("callTypeOptional")}</option>
            {Object.entries(callTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v as string}
              </option>
            ))}
          </select>
          <textarea
            placeholder={t("transcriptPlaceholder")}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || pasteText.trim().length < 100}
            className={cn(
              "mt-1 inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,transform]",
              "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            {analyzing ? t("analyzing") : t("analyzeTranscript")}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm shadow-lg z-50">
          {toast}
        </div>
      )}

      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setApplyModal(null)}>
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Apply to agent</h3>
            <p className="text-[var(--text-tertiary)] text-sm mb-4 line-clamp-2">{applyModal.insight}</p>
            <div className="space-y-2">
              {agents.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-sm">No agents yet. Create one in Agents.</p>
              ) : (
                agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleApply(applyModal.insightId, a.id)}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-inset)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
                  >
                    {a.name}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setApplyModal(null)}
              className="mt-4 w-full px-4 py-2 rounded-xl text-[var(--text-tertiary)] text-sm hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Phone,
  TrendingUp,
  Award,
  BarChart3,
  AlertTriangle,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface VoiceAnalyticsData {
  period: string;
  total_calls: number;
  completed_calls: number;
  avg_duration_seconds: number;
  avg_turns: number;
  conversion_rate: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  outcome_distribution: Record<string, number>;
  calls_by_day: Array<{ date: string; count: number }>;
  top_industries: Array<{ industry: string; count: number }>;
  lead_score_distribution: { hot: number; warm: number; cold: number };
  roi_metrics: {
    estimated_missed_calls_recovered: number;
    estimated_revenue_recovered: number;
    cost_per_call: number;
    roi_multiplier: number;
  };
  voice_performance: Array<{
    voice_id: string;
    calls: number;
    avg_duration: number;
    conversion_rate: number;
  }>;
}

interface CoachingData {
  avg_score: number;
  grade: string;
  talk_ratio_avg: number;
  question_density_avg: number;
  empathy_score_avg: number;
  filler_word_rate: number;
  total_reports: number;
  nps: {
    score: number;
    promoters: number;
    passives: number;
    detractors: number;
    total_responses: number;
  };
  escalations: {
    watch: number;
    warning: number;
    critical: number;
    escalate: number;
    total: number;
  };
  intelligence: {
    enabled: boolean;
    enhanced_calls: number;
    avg_response_ms: number;
    improvement_pct: number;
  };
}

export function VoiceAnalyticsCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [data, setData] = useState<VoiceAnalyticsData | null>(null);
  const [coachingData, setCoachingData] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(
        `/api/analytics/voice?workspace_id=${encodeURIComponent(workspaceId)}&period=7d&demo_only=true`,
        { credentials: "include" }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(
        `/api/analytics/coaching?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([voiceData, coachData]) => {
        setData(voiceData);
        setCoachingData(coachData);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-48 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="space-y-4">
          <div className="h-20 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          <div className="h-40 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Voice Analytics
          </h2>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No voice analytics data available yet.
          </p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "text-emerald-400",
      B: "text-cyan-400",
      C: "text-amber-400",
      D: "text-orange-400",
      F: "text-red-400",
    };
    return colors[grade] || "text-[var(--text-primary)]";
  };

  const totalSentiment =
    data.sentiment_distribution.positive +
    data.sentiment_distribution.neutral +
    data.sentiment_distribution.negative;
  const positivePct =
    totalSentiment > 0
      ? ((data.sentiment_distribution.positive / totalSentiment) * 100).toFixed(
          0
        )
      : 0;

  const leadScoreTotal =
    data.lead_score_distribution.hot +
    data.lead_score_distribution.warm +
    data.lead_score_distribution.cold;

  const hotPct =
    leadScoreTotal > 0
      ? (data.lead_score_distribution.hot / leadScoreTotal) * 100
      : 0;
  const warmPct =
    leadScoreTotal > 0
      ? (data.lead_score_distribution.warm / leadScoreTotal) * 100
      : 0;

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Phone className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Voice Analytics
        </h2>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
          7 days
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
        {[
          { label: "Total Calls", value: data.total_calls.toLocaleString() },
          { label: "Avg Duration", value: formatDuration(data.avg_duration_seconds) },
          { label: "Conversion", value: data.conversion_rate.toFixed(1) + "%" },
          { label: "Sentiment", value: positivePct + "%", icon: true },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <p className="text-[var(--text-tertiary)] mb-1">{m.label}</p>
            <div className="flex items-center gap-1">
              {m.icon && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              <p className="font-semibold text-[var(--text-primary)]">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calls by day chart */}
      <div className="mb-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
          Calls Over Time
        </p>
        <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={undefined}>
          <AreaChart data={data.calls_by_day}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="var(--text-tertiary)"
              style={{ fontSize: "11px" }}
            />
            <YAxis
              stroke="var(--text-tertiary)"
              style={{ fontSize: "11px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              fillOpacity={1}
              fill="url(#colorCalls)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Lead score distribution */}
      <div className="mb-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
          Lead Score Distribution
        </p>
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">Hot Leads</span>
              <span className="font-medium text-emerald-400">
                {data.lead_score_distribution.hot} (
                {hotPct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-hover)]">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${hotPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">Warm Leads</span>
              <span className="font-medium text-amber-400">
                {data.lead_score_distribution.warm} (
                {warmPct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-hover)]">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${warmPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">Cold Leads</span>
              <span className="font-medium text-red-400">
                {data.lead_score_distribution.cold} (
                {leadScoreTotal > 0 && 100 - hotPct - warmPct > 0
                  ? (100 - hotPct - warmPct).toFixed(0)
                  : 0}
                %)
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-hover)]">
              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${leadScoreTotal > 0 && 100 - hotPct - warmPct > 0 ? 100 - hotPct - warmPct : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROI metrics */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            ROI Metrics
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              Revenue Recovered
            </p>
            <p className="text-base font-semibold text-emerald-400">
              {formatCurrency(data.roi_metrics.estimated_revenue_recovered)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              ROI Multiplier
            </p>
            <p className="text-base font-semibold text-emerald-400">
              {data.roi_metrics.roi_multiplier.toFixed(1)}x
            </p>
          </div>
        </div>
      </div>

      {coachingData && (
        <>
          {/* Coaching Performance */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-violet-400" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">Coaching</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-violet-400">{coachingData.avg_score}</span>
                  <span className={`font-semibold ${getGradeColor(coachingData.grade)}`}>{coachingData.grade}</span>
                </div>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Talk Ratio</p>
                <p className="font-semibold text-violet-400">{coachingData.talk_ratio_avg}%</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Questions</p>
                <p className="font-semibold text-violet-400">{coachingData.question_density_avg.toFixed(1)}/m</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Empathy</p>
                <p className="font-semibold text-violet-400">{coachingData.empathy_score_avg.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* NPS Widget */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">NPS</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs mb-3">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{coachingData.nps.score}</p>
                <p className="text-[var(--text-tertiary)] text-[10px]">Score</p>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                <div>
                  <p className="font-semibold text-[var(--text-secondary)]">{coachingData.nps.promoters}</p>
                  <p className="text-[var(--text-tertiary)]">+</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="w-3 h-3 text-amber-400" />
                <div>
                  <p className="font-semibold text-[var(--text-secondary)]">{coachingData.nps.passives}</p>
                  <p className="text-[var(--text-tertiary)]">0</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3 text-red-400" />
                <div>
                  <p className="font-semibold text-[var(--text-secondary)]">{coachingData.nps.detractors}</p>
                  <p className="text-[var(--text-tertiary)]">-</p>
                </div>
              </div>
            </div>
            {coachingData.nps.total_responses > 0 && (
              <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden flex">
                <div className="bg-emerald-500" style={{ width: `${(coachingData.nps.promoters / coachingData.nps.total_responses) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(coachingData.nps.passives / coachingData.nps.total_responses) * 100}%` }} />
                <div className="flex-1 bg-red-500" />
              </div>
            )}
          </div>

          {/* Escalations */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">Escalations</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { count: coachingData.escalations.watch, label: "Watch", color: "bg-yellow-400" },
                { count: coachingData.escalations.warning, label: "Warning", color: "bg-orange-400" },
                { count: coachingData.escalations.critical, label: "Critical", color: "bg-red-500" },
                { count: coachingData.escalations.escalate, label: "Escalate", color: "bg-red-600" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="font-medium text-[var(--text-secondary)]">{item.count}</span>
                  </div>
                  <p className="text-[var(--text-tertiary)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Intelligence Engine */}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">Intelligence</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${coachingData.intelligence.enabled ? "bg-cyan-500/10 text-cyan-400" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)]"}`}>
                {coachingData.intelligence.enabled ? "ON" : "OFF"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Enhanced</p>
                <p className="font-semibold text-cyan-400">{coachingData.intelligence.enhanced_calls}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Resp. Time</p>
                <p className="font-semibold text-cyan-400">{coachingData.intelligence.avg_response_ms}ms</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] mb-1">Improve</p>
                <p className="font-semibold text-cyan-400">+{coachingData.intelligence.improvement_pct.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Phone,
  Clock,
  TrendingUp,
  Star,
  ThumbsUp,
  Users,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type AnalyticsData = {
  kpis: {
    callsHandled: number;
    avgDurationSec: number;
    successRate: number;
    qualityScore: number | null;
    satisfactionPct: number | null;
  };
  dailyVolume: { date: string; calls: number }[];
  successRateTrend: { week: string; successRate: number; calls: number }[];
  topOutcomes: { outcome: string; count: number }[];
  commonIntents: { intent: string; count: number }[];
  comparison: { id: string; name: string }[];
  recommendations: string[];
  periodDays: number;
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function AgentAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("agents");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    params.then((p) => {
      setAgentId(p.id);
      const id = p.id;
      Promise.all([
        fetch(`/api/agents/${id}`, { credentials: "include" }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/agents/${id}/analytics?days=30`, { credentials: "include" }).then(
          (r) => (r.ok ? r.json() : null)
        ),
      ])
        .then(([agent, analytics]) => {
          if (!mounted) return;
          if (agent) setAgentName((agent as { name?: string }).name ?? "Agent");
          setData(analytics ?? null);
        })
        .finally(() => mounted && setLoading(false));
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  if (loading || !agentId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
          <Link href="/app/agents" className="hover:text-white">{t("analytics.breadcrumbAgents")}</Link>
          <ChevronRight className="w-4 h-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
          <Link href="/app/agents" className="hover:text-white">Agents</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{agentName}</span>
        </div>
        <p className="text-zinc-400">Could not load analytics.</p>
      </div>
    );
  }

  const { kpis, dailyVolume, successRateTrend, topOutcomes, commonIntents, comparison, recommendations } = data;
  const volumeChartData = dailyVolume.map((d) => ({
    day: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    calls: d.calls,
  }));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
        <Link href="/app/agents" className="hover:text-white">{t("analytics.breadcrumbAgents")}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/app/agents?selected=${agentId}`} className="hover:text-white">{agentName}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Analytics</span>
      </div>
      <h1 className="text-xl font-semibold text-white mb-1">Performance</h1>
      <p className="text-zinc-400 text-sm mb-6">Last {data.periodDays} days</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Phone className="w-3.5 h-3.5" />
            Calls handled
          </div>
          <p className="text-xl font-semibold text-white">{kpis.callsHandled}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Avg duration
          </div>
          <p className="text-xl font-semibold text-white">{formatDuration(kpis.avgDurationSec)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Success rate
          </div>
          <p className="text-xl font-semibold text-white">{kpis.successRate}%</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Star className="w-3.5 h-3.5" />
            Quality score
          </div>
          <p className="text-xl font-semibold text-white">
            {kpis.qualityScore != null ? `${kpis.qualityScore}%` : "—"}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            Satisfaction
          </div>
          <p className="text-xl font-semibold text-white">
            {kpis.satisfactionPct != null ? `${kpis.satisfactionPct}%` : "—"}
          </p>
        </div>
      </div>

      {/* Daily volume */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-6">
        <p className="text-sm font-medium text-white mb-4">Call volume by day</p>
        <div className="h-52">
          {volumeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeChartData}>
                <defs>
                  <linearGradient id="agentVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#fff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 12 }} labelStyle={{ color: "#E4E4E7" }} />
                <Area type="monotone" dataKey="calls" stroke="#fff" strokeWidth={2} fill="url(#agentVolGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">{t("analytics.noCallData")}</div>
          )}
        </div>
      </div>

      {/* Success rate trend */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-6">
        <p className="text-sm font-medium text-white mb-4">{t("analytics.successRateOverTime")}</p>
        <div className="h-48">
          {successRateTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={successRateTrend.map((w) => ({ ...w, weekLabel: new Date(w.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }))}>
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 12 }} />
                <Bar dataKey="successRate" fill="#22c55e" radius={[4, 4, 0, 0]} name="Success %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">{t("analytics.noTrendData")}</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm font-medium text-white mb-3">{t("analytics.outcomeBreakdown")}</p>
          <ul className="space-y-2">
            {topOutcomes.length > 0 ? (
              topOutcomes.map((o) => (
                <li key={o.outcome} className="flex justify-between text-sm">
                  <span className="text-zinc-400 capitalize">{o.outcome.replace(/_/g, " ")}</span>
                  <span className="text-white font-medium">{o.count}</span>
                </li>
              ))
            ) : (
              <li className="text-zinc-500 text-sm">{t("analytics.noOutcomes")}</li>
            )}
          </ul>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm font-medium text-white mb-3">{t("analytics.commonTopics")}</p>
          <ul className="space-y-2">
            {commonIntents.length > 0 ? (
              commonIntents.map((i) => (
                <li key={i.intent} className="flex justify-between text-sm">
                  <span className="text-zinc-400">{i.intent}</span>
                  <span className="text-white font-medium">{i.count}</span>
                </li>
              ))
            ) : (
              <li className="text-zinc-500 text-sm">{t("analytics.noSummaryData")}</li>
            )}
          </ul>
        </div>
      </div>

      {comparison.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-6">
          <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("analytics.otherAgents")}
          </p>
          <ul className="space-y-2">
            {comparison.map((a) => (
              <li key={a.id}>
                <Link href={`/app/agents/${a.id}/analytics`} className="text-zinc-400 hover:text-white text-sm">
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Recommendations
          </p>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-zinc-500">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

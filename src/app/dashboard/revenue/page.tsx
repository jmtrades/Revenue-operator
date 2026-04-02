"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Phone,
  MessageSquare,
  Megaphone,
  Calendar,
  TrendingUp,
  Download,
  ChevronDown,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

type Period = "7d" | "30d" | "90d" | "all";

interface DailyRevenue {
  date: string;
  inbound: number;
  followUps: number;
  outbound: number;
  noShowRecovery: number;
}

function generateDemoData(days: number): DailyRevenue[] {
  const data: DailyRevenue[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const weekdayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 1;
    const baseInbound = Math.floor((180 + Math.random() * 280) * weekdayMultiplier);
    const baseFollowUp = Math.floor((60 + Math.random() * 140) * weekdayMultiplier);
    const baseOutbound = Math.floor((30 + Math.random() * 90) * weekdayMultiplier);
    const baseNoShow = Math.floor((20 + Math.random() * 60) * weekdayMultiplier);
    data.push({
      date: d.toISOString().split("T")[0],
      inbound: baseInbound,
      followUps: baseFollowUp,
      outbound: baseOutbound,
      noShowRecovery: baseNoShow,
    });
  }
  return data;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface DailyMetricRow {
  date: string;
  calls_answered: number;
  appointments_booked: number;
  no_shows_recovered: number;
  follow_ups_sent: number;
  leads_captured: number;
  total_revenue_cents: number;
}

export default function RevenuePage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [period, setPeriod] = useState<Period>("30d");
  const [apiData, setApiData] = useState<DailyRevenue[] | null>(null);

  useEffect(() => {
    if (!workspaceId) { setApiData(null); return; }
    const daysMap: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, all: 180 };
    const days = daysMap[period];
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = new Date().toISOString().slice(0, 10);
    fetchWithFallback<{ data: DailyMetricRow[] }>(
      `/api/analytics/metrics?workspace_id=${encodeURIComponent(workspaceId)}&start_date=${startStr}&end_date=${endStr}`,
      { credentials: "include" },
    ).then((res) => {
      if (res.data?.data?.length) {
        const mapped: DailyRevenue[] = res.data.data.map((m) => ({
          date: m.date,
          inbound: Math.round((m.total_revenue_cents || 0) / 100 * 0.5),
          followUps: Math.round((m.total_revenue_cents || 0) / 100 * 0.2),
          outbound: Math.round((m.total_revenue_cents || 0) / 100 * 0.15),
          noShowRecovery: Math.round((m.total_revenue_cents || 0) / 100 * 0.15),
        }));
        setApiData(mapped);
      } else {
        setApiData(null);
      }
    });
  }, [workspaceId, period]);

  const rawData = useMemo(() => {
    if (apiData && apiData.length > 0) return apiData;
    // No real data available — return empty array instead of fake demo data
    return [];
  }, [apiData]);

  const totals = useMemo(() => {
    let inbound = 0, followUps = 0, outbound = 0, noShowRecovery = 0;
    for (const d of rawData) {
      inbound += d.inbound;
      followUps += d.followUps;
      outbound += d.outbound;
      noShowRecovery += d.noShowRecovery;
    }
    const total = inbound + followUps + outbound + noShowRecovery;
    return { inbound, followUps, outbound, noShowRecovery, total };
  }, [rawData]);

  const topDays = useMemo(() => {
    return [...rawData]
      .map((d) => ({ ...d, total: d.inbound + d.followUps + d.outbound + d.noShowRecovery }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rawData]);

  const sourceBreakdown = useMemo(() => {
    const sources = [
      { name: "Inbound Calls", value: totals.inbound, icon: Phone, color: "text-blue-400", bg: "bg-[var(--bg-card)]/60" },
      { name: "Follow-Up Sequences", value: totals.followUps, icon: MessageSquare, color: "text-purple-400", bg: "bg-[var(--bg-card)]/60" },
      { name: "Outbound Campaigns", value: totals.outbound, icon: Megaphone, color: "text-amber-400", bg: "bg-amber-500/10" },
      { name: "No-Show Recovery", value: totals.noShowRecovery, icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    ];
    return sources.map((s) => ({
      ...s,
      pct: totals.total > 0 ? Math.round((s.value / totals.total) * 100) : 0,
    }));
  }, [totals]);

  // Simple bar chart using divs
  const maxDayTotal = useMemo(() => {
    return Math.max(...rawData.map((d) => d.inbound + d.followUps + d.outbound + d.noShowRecovery), 1);
  }, [rawData]);

  const chartData = useMemo(() => {
    // Show max 30 bars, sample if needed
    const maxBars = 30;
    if (rawData.length <= maxBars) return rawData;
    const step = Math.ceil(rawData.length / maxBars);
    return rawData.filter((_, i) => i % step === 0);
  }, [rawData]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader title="Revenue" subtitle="Revenue breakdown and analysis" />
        <EmptyState icon="pulse" title="Select a workspace" subtitle="Revenue data will appear here." />
      </div>
    );
  }

  if (apiData !== null && rawData.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader title="Revenue" subtitle="Revenue breakdown and analysis" />
        <EmptyState
          icon="pulse"
          title="No revenue tracked yet"
          subtitle="Revenue appears here as your AI operator handles calls, books appointments, and recovers missed opportunities. Import leads and connect your phone to get started."
          primaryAction={{ label: "Import Leads", href: "/app/leads?import=1" }}
          secondaryAction={{ label: "View Dashboard", href: "/app" }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Revenue</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Detailed breakdown of recovered revenue by source and time period.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!apiData && (
            <span className="px-2 py-0.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-tertiary)] text-xs">
              No revenue data yet
            </span>
          )}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 pr-8 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Hero revenue card */}
      <div
        className="rounded-2xl border p-8 mb-6 relative overflow-hidden"
        style={{ borderColor: "var(--border-default)", background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, var(--bg-surface) 60%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Total Revenue Recovered
            </span>
          </div>
          <p className="text-4xl md:text-5xl font-bold tabular-nums text-emerald-400">
            ${totals.total.toLocaleString()}
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
            {period === "7d" ? "Last 7 days" : period === "30d" ? "Last 30 days" : period === "90d" ? "Last 90 days" : "All time"}
          </p>
        </div>
      </div>

      {/* Source breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sourceBreakdown.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.name}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${source.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${source.color}`} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {source.name}
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                ${source.value.toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {source.pct}% of total
                </span>
                <div className="w-16 h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${source.color.replace("text-", "bg-")}`}
                    style={{ width: `${source.pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue chart (CSS bar chart) */}
      <div
        className="rounded-2xl border p-6 mb-8"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-medium mb-6" style={{ color: "var(--text-primary)" }}>
          Daily Revenue
        </h3>
        <div className="flex items-end gap-[3px] h-48">
          {chartData.map((d) => {
            const dayTotal = d.inbound + d.followUps + d.outbound + d.noShowRecovery;
            const heightPct = (dayTotal / maxDayTotal) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 min-w-[4px] group relative"
                style={{ height: "100%" }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-emerald-500/60 hover:bg-emerald-400/80 transition-colors cursor-pointer"
                  style={{ height: `${heightPct}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                    <p className="font-medium text-[var(--text-primary)]">{formatShortDate(d.date)}</p>
                    <p className="text-emerald-400 font-semibold">${dayTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <span>{formatShortDate(chartData[0]?.date ?? "")}</span>
          <span>{formatShortDate(chartData[chartData.length - 1]?.date ?? "")}</span>
        </div>
      </div>

      {/* Top performing days + source table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top days */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
            Top Performing Days
          </h3>
          <div className="space-y-3">
            {topDays.map((day, idx) => (
              <div key={day.date} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--bg-inset)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {formatShortDate(day.date)}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-emerald-400">
                  ${day.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by source table */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
            Revenue by Source
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 font-medium text-[var(--text-tertiary)]">Source</th>
                <th className="text-right py-2 font-medium text-[var(--text-tertiary)]">Revenue</th>
                <th className="text-right py-2 font-medium text-[var(--text-tertiary)]">% Total</th>
              </tr>
            </thead>
            <tbody>
              {sourceBreakdown.map((source) => {
                const Icon = source.icon;
                return (
                  <tr key={source.name} className="border-b border-[var(--border-default)]/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${source.color}`} />
                        <span style={{ color: "var(--text-primary)" }}>{source.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                      ${source.value.toLocaleString()}
                    </td>
                    <td className="py-3 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {source.pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-3 font-semibold" style={{ color: "var(--text-primary)" }}>Total</td>
                <td className="py-3 text-right tabular-nums font-bold text-emerald-400">
                  ${totals.total.toLocaleString()}
                </td>
                <td className="py-3 text-right tabular-nums font-medium" style={{ color: "var(--text-secondary)" }}>
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

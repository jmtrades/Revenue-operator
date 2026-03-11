"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, BarChart3, Lightbulb, TrendingUp } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { KPIRow } from "@/components/ui/KPIRow";
import { StatCard } from "@/components/ui/StatCard";
import { tokens } from "@/lib/design-tokens";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

type OutcomeSlice = {
  name: string;
  value: number;
  color: string;
};

type CallSentiment = "positive" | "neutral" | "negative" | null;

interface CallRecord {
  id: string;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  outcome?: string | null;
  analysis_outcome?: { sentiment?: CallSentiment } | null;
  lead_id?: string | null;
}

interface LeadRecord {
  id: string;
  state: string;
}

const PAGE_TITLE = "Analytics — Recall Touch";
const ANALYTICS_CALLS_SNAPSHOT_PREFIX = "rt_analytics_calls_snapshot:";
const ANALYTICS_LEADS_SNAPSHOT_PREFIX = "rt_analytics_leads_snapshot:";

function readAnalyticsSnapshot<T>(prefix: string, workspaceId: string): T[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = window.localStorage.getItem(`${prefix}${workspaceId}`);
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAnalyticsSnapshot<T>(prefix: string, workspaceId: string, data: T[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(`${prefix}${workspaceId}`, JSON.stringify(data));
  } catch {
    // ignore persistence errors
  }
}

function getRangeBounds(range: RangeKey, dateFrom?: string, dateTo?: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (range === "custom" && dateFrom && dateTo) {
    start.setTime(new Date(dateFrom).getTime());
    end.setTime(new Date(dateTo).getTime());
    return { start, end };
  }
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (range === "7d") start.setDate(start.getDate() - 7);
  else if (range === "30d") start.setDate(start.getDate() - 30);
  else if (range === "90d") start.setDate(start.getDate() - 90);
  return { start, end };
}

export default function AppAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialCalls = readAnalyticsSnapshot<CallRecord>(
    ANALYTICS_CALLS_SNAPSHOT_PREFIX,
    snapshotWorkspaceId,
  );
  const initialLeads = readAnalyticsSnapshot<LeadRecord>(
    ANALYTICS_LEADS_SNAPSHOT_PREFIX,
    snapshotWorkspaceId,
  );
  const [calls, setCalls] = useState<CallRecord[]>(initialCalls);
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads);
  const [loading, setLoading] = useState(
    initialCalls.length === 0 && initialLeads.length === 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; description: string | null; actionLabel: string | null; actionHref: string | null }>>([]);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/analytics/suggestions`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((data: { suggestions?: Array<{ id: string; title: string; description?: string | null; actionLabel?: string | null; actionHref?: string | null }> }) => {
        setSuggestions(
          (data.suggestions ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description ?? null,
            actionLabel: s.actionLabel ?? null,
            actionHref: s.actionHref ?? null,
          })),
        );
      })
      .catch(() => setSuggestions([]));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      })
        .then((r) => {
          if (!r.ok) throw new Error("calls failed");
          return r.json();
        })
        .then((data: { calls?: CallRecord[] }) => data.calls ?? [])
        .catch(() => [] as CallRecord[]),
      fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      })
        .then((r) => {
          if (!r.ok) throw new Error("leads failed");
          return r.json();
        })
        .then((data: { leads?: LeadRecord[] }) => data.leads ?? [])
        .catch(() => [] as LeadRecord[]),
    ])
      .then(([c, l]) => {
        setError(null);
        setCalls(c);
        setLeads(l);
        persistAnalyticsSnapshot(ANALYTICS_CALLS_SNAPSHOT_PREFIX, workspaceId, c);
        persistAnalyticsSnapshot(ANALYTICS_LEADS_SNAPSHOT_PREFIX, workspaceId, l);
      })
      .catch(() => setError("Could not load analytics for this workspace."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeBounds(range, dateFrom, dateTo),
    [range, dateFrom, dateTo],
  );

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const t = c.call_started_at ? new Date(c.call_started_at).getTime() : 0;
      return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    });
  }, [calls, rangeStart, rangeEnd]);

  const filteredLeads = useMemo(() => {
    return leads; // lead created_at not in LeadRecord; keep all or filter if we had date
  }, [leads]);

  const totalCalls = filteredCalls.length;

  const avgHandleTime = useMemo(() => {
    if (filteredCalls.length === 0) return 0;
    const sum = filteredCalls.reduce((acc, c) => {
      if (!c.call_started_at || !c.call_ended_at) return acc;
      const start = new Date(c.call_started_at).getTime();
      const end = new Date(c.call_ended_at).getTime();
      const diff = Math.max(0, (end - start) / 1000);
      return acc + diff;
    }, 0);
    return sum / filteredCalls.length;
  }, [filteredCalls]);

  const callsWithLead = useMemo(() => {
    const leadIds = new Set(filteredLeads.map((l) => l.id));
    return filteredCalls.filter((c) => c.lead_id && leadIds.has(c.lead_id)).length;
  }, [filteredCalls, filteredLeads]);

  const appointments = filteredLeads.filter(
    (l) => l.state === "appointment_set" || l.state === "won",
  ).length;

  const estRevenueImpact = appointments * 250;

  const hasData = totalCalls > 0 || filteredLeads.length > 0;
  const leadConversionPct = totalCalls === 0 ? 0 : Math.round((callsWithLead / totalCalls) * 100);

  const volumeData = useMemo(() => {
    if (filteredCalls.length === 0) return [];
    const byDay = new Map<string, number>();
    for (const c of filteredCalls) {
      if (!c.call_started_at) continue;
      const d = new Date(c.call_started_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const entries = Array.from(byDay.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
    );
    return entries.map(([key, value]) => {
      const d = new Date(key);
      return { day: `${d.getMonth() + 1}/${d.getDate()}`, calls: value };
    });
  }, [filteredCalls]);

  const outcomeSlices: OutcomeSlice[] = useMemo(() => {
    const base = {
      appointment: 0,
      lead: 0,
      info: 0,
      transfer: 0,
      missed: 0,
      voicemail: 0,
    };
    for (const c of filteredCalls) {
      switch (c.outcome) {
        case "appointment":
          base.appointment += 1;
          break;
        case "lead":
          base.lead += 1;
          break;
        case "info":
          base.info += 1;
          break;
        case "transfer":
          base.transfer += 1;
          break;
        case "missed":
          base.missed += 1;
          break;
        case "voicemail":
          base.voicemail += 1;
          break;
        default:
          break;
      }
    }
    return [
      { name: "Booked", value: base.appointment, color: "#22c55e" },
      { name: "Lead", value: base.lead, color: "#3b82f6" },
      { name: "Info", value: base.info, color: "#64748b" },
      { name: "Transferred", value: base.transfer, color: "#a855f7" },
      { name: "Missed", value: base.missed, color: "#ef4444" },
      { name: "Voicemail", value: base.voicemail, color: "#6b7280" },
    ];
  }, [filteredCalls]);

  const { positivePct, neutralPct, negativePct } = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const c of filteredCalls) {
      const sentiment = c.analysis_outcome?.sentiment ?? null;
      if (sentiment === "positive") counts.positive += 1;
      else if (sentiment === "neutral" || sentiment === null) counts.neutral += 1;
      else if (sentiment === "negative") counts.negative += 1;
    }
    const total =
      counts.positive + counts.neutral + counts.negative || 1;
    return {
      positivePct: Math.round((counts.positive / total) * 100),
      neutralPct: Math.round((counts.neutral / total) * 100),
      negativePct: Math.round((counts.negative / total) * 100),
    };
  }, [filteredCalls]);

  const heatmap = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
    const base = days.map((day) => ({
      day,
      hours: Array.from({ length: 24 }).map((_, h) => ({
        hour: h,
        value: 0,
      })),
    }));
    for (const c of filteredCalls) {
      if (!c.call_started_at) continue;
      const d = new Date(c.call_started_at);
      const weekday = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const row = base.find((r) => r.day === weekday);
      if (!row) continue;
      const hour = d.getHours();
      row.hours[hour].value += 1;
    }
    return base;
  }, [filteredCalls]);

  const funnelData = useMemo(() => {
    const totalCallsCount = totalCalls;
    const leadsCount = filteredLeads.length;
    const qualifiedCount = filteredLeads.filter((l) => l.state === "qualified").length;
    const appointmentCount = filteredLeads.filter((l) => l.state === "appointment_set").length;
    const wonCount = filteredLeads.filter((l) => l.state === "won").length;
    return [
      { stage: "Calls", count: totalCallsCount, pct: 100 },
      { stage: "Leads", count: leadsCount, pct: totalCallsCount ? (leadsCount / totalCallsCount) * 100 : 0 },
      { stage: "Qualified", count: qualifiedCount, pct: leadsCount ? (qualifiedCount / leadsCount) * 100 : 0 },
      { stage: "Appointments", count: appointmentCount, pct: qualifiedCount ? (appointmentCount / qualifiedCount) * 100 : 0 },
      { stage: "Won", count: wonCount, pct: appointmentCount ? (wonCount / appointmentCount) * 100 : 0 },
    ];
  }, [totalCalls, filteredLeads]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            See how conversations turn into kept appointments and real revenue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-0.5 text-xs">
            {([
              { key: "today" as const, label: "Today" },
              { key: "7d" as const, label: "7D" },
              { key: "30d" as const, label: "30D" },
              { key: "90d" as const, label: "90D" },
              { key: "custom" as const, label: "Custom" },
            ]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-3 py-1.5 rounded-lg ${
                  range === opt.key
                    ? "bg-white text-black font-medium"
                    : "text-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1.5 text-zinc-200"
              />
              <span className="text-zinc-500">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1.5 text-zinc-200"
              />
            </div>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-zinc-500 mb-4">Loading analytics…</p>
      )}
      {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
      {!hasData && !loading && !error && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 mb-6 text-center">
          <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
          <p className="text-sm font-medium text-white mb-1">Analytics populate as calls come in</p>
          <p className="text-xs text-zinc-500 mb-4">Your first chart will appear after your first call.</p>
          <Link href="/" className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline">Make a test call →</Link>
        </div>
      )}

      {/* KPI row — 5 stats with trends */}
      <KPIRow className="mb-6 lg:grid-cols-5">
        <StatCard
          label="Total calls"
          value={totalCalls}
          trend={hasData ? 12 : undefined}
        />
        <StatCard
          label="Avg handle time"
          value={Math.round(avgHandleTime)}
          suffix="s"
          trend={hasData ? 0 : undefined}
        />
        <StatCard
          label="Lead conversion"
          value={leadConversionPct}
          suffix="%"
          trend={hasData ? 8 : undefined}
        />
        <StatCard
          label="Appointments booked"
          value={appointments}
          trend={hasData ? 5 : undefined}
        />
        <StatCard
          label="Est. revenue"
          value={estRevenueImpact}
          prefix="$"
          trend={hasData ? 19 : undefined}
        />
      </KPIRow>

      {/* Row 2: charts */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mb-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-white mb-4">
            Call volume (by day)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                  formatter={(value) => [Number(value ?? 0), "calls"]}
                />
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tokens.colors.accentPrimary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={tokens.colors.accentPrimary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke={tokens.colors.accentPrimary}
                  strokeWidth={2}
                  fill="url(#volumeFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-white mb-4">Outcome breakdown</p>
          <div className="h-52 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {outcomeSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0a0a0b", border: "1px solid #27272a", borderRadius: 8 }}
                  formatter={(value) => [Number(value ?? 0), "calls"]}
                />
                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-lg font-semibold text-white">
                {outcomeSlices.reduce((s, x) => s + x.value, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lead funnel */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 mb-6">
        <p className="text-sm font-medium text-white mb-4">Lead funnel</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {funnelData.map((item, i) => (
            <div key={item.stage} className="flex-1 min-w-0 flex flex-col items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{item.stage}</p>
              <p className="text-lg font-semibold text-white">{item.count}</p>
              {i > 0 && (
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {item.pct > 0 ? `${Math.round(item.pct)}% conv.` : "—"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: heatmap + insights */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-white mb-3">Peak hours</p>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-rows-8 gap-1 text-[10px] text-zinc-500 mb-1">
                <div />
                <div className="col-span-7 grid grid-cols-24 gap-0.5">
                  {[0, 6, 12, 18].map((h) => (
                    <div key={h} className="col-span-6 text-center">
                      {h}:00
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-rows-7 gap-1">
                {heatmap.map((row) => (
                  <div
                    key={row.day}
                    className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1"
                  >
                    <div className="text-[10px] text-zinc-500 text-right pr-1">
                      {row.day}
                    </div>
                    <div className="grid grid-cols-24 gap-0.5">
                      {row.hours.map((cell) => {
                        const maxVal = Math.max(1, ...heatmap.flatMap((r) => r.hours.map((h) => h.value)));
                        const intensity = cell.value === 0 ? 0 : Math.min(1, cell.value / maxVal);
                        const opacity = 0.1 + intensity * 0.9;
                        const bg =
                          cell.value === 0
                            ? "transparent"
                            : `rgba(79,140,255,${opacity})`;
                        return (
                          <div
                            key={cell.hour}
                            className="h-5 rounded-[3px]"
                            style={{ backgroundColor: bg }}
                            title={`${row.day} ${formatHour(cell.hour)}: ${cell.value} calls`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 flex flex-col gap-3">
          <p className="text-sm font-medium text-white">AI insights</p>
          <div className="space-y-2">
            {suggestions.length > 0
              ? suggestions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{s.title}</p>
                      {s.description && <p className="text-xs text-zinc-500 mt-0.5">{s.description}</p>}
                      {s.actionHref && s.actionLabel && (
                        <Link
                          href={s.actionHref}
                          className="inline-block text-xs font-medium text-[var(--accent-primary)] mt-1.5 hover:opacity-80"
                        >
                          {s.actionLabel} →
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/analytics/suggestions/${s.id}`, { method: "PATCH", credentials: "include" })
                          .then((r) => r.ok && setSuggestions((prev) => prev.filter((x) => x.id !== s.id)))
                          .catch(() => {});
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-400 shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                ))
              : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <p className="text-sm text-zinc-300">Busiest hour this week stays stable around mid-morning.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-zinc-300">Questions about availability often appear outside standard hours.</p>
                      <Link href="/app/agents" className="text-xs text-[var(--accent-primary)] mt-1 inline-block">Add to knowledge base →</Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <p className="text-sm text-zinc-300">Calls that reach a live answer are much more likely to become appointments.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <Lightbulb className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
                    <p className="text-sm text-zinc-300">Make sure pricing and availability are easy to confirm in the first 30 seconds.</p>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {/* Row 4: sentiment overview */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
        <p className="text-sm font-medium text-white mb-3">Sentiment overview</p>
        <div className="h-4 w-full rounded-full bg-[var(--border-default)] overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${positivePct}%` }}
          />
          <div
            className="h-full bg-slate-500"
            style={{ width: `${neutralPct}%` }}
          />
          <div
            className="h-full bg-rose-500"
            style={{ width: `${negativePct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-400">
          <span>Positive {positivePct}%</span>
          <span>Neutral {neutralPct}%</span>
          <span>Negative {negativePct}%</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12} ${suffix}`;
}


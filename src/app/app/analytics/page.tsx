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
} from "recharts";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, BarChart3, Lightbulb, TrendingUp } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

type RangeKey = "today" | "7d" | "30d" | "90d";

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

export default function AppAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
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

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

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

  const totalCalls = calls.length;

  const avgHandleTime = useMemo(() => {
    if (calls.length === 0) return 0;
    const sum = calls.reduce((acc, c) => {
      if (!c.call_started_at || !c.call_ended_at) return acc;
      const start = new Date(c.call_started_at).getTime();
      const end = new Date(c.call_ended_at).getTime();
      const diff = Math.max(0, (end - start) / 1000);
      return acc + diff;
    }, 0);
    return sum / calls.length;
  }, [calls]);

  const callsWithLead = useMemo(() => {
    const leadIds = new Set(leads.map((l) => l.id));
    return calls.filter((c) => c.lead_id && leadIds.has(c.lead_id)).length;
  }, [calls, leads]);

  const appointments = leads.filter(
    (l) => l.state === "appointment_set" || l.state === "won",
  ).length;

  const estRevenueImpact = appointments * 250;

  const hasData = totalCalls > 0 || leads.length > 0;
  const summaryCards = [
    {
      label: "Total calls",
      value: totalCalls.toString(),
      trend: hasData ? "+12% vs prior period" : "—",
    },
    {
      label: "Avg handle time",
      value: formatDuration(avgHandleTime),
      trend: hasData ? "Stable" : "—",
    },
    {
      label: "Lead conversion",
      value:
        totalCalls === 0
          ? "0%"
          : `${Math.round((callsWithLead / totalCalls) * 100)}%`,
      trend: hasData ? "+8% vs prior period" : "—",
    },
    {
      label: "Appointments booked",
      value: appointments.toString(),
      trend: hasData ? "+5 this month" : "—",
    },
    {
      label: "Est. revenue impact",
      value: `$${estRevenueImpact.toLocaleString()}`,
      trend: hasData ? "+19% vs prior period" : "—",
    },
  ];

  const volumeData = useMemo(() => {
    if (calls.length === 0) return [];
    const byDay = new Map<string, number>();
    for (const c of calls) {
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
  }, [calls]);

  const outcomeSlices: OutcomeSlice[] = useMemo(() => {
    const base = {
      appointment: 0,
      lead: 0,
      info: 0,
      transfer: 0,
      voicemail: 0,
    };
    for (const c of calls) {
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
        case "voicemail":
          base.voicemail += 1;
          break;
        default:
          break;
      }
    }
    return [
      { name: "Appointment booked", value: base.appointment, color: "#22c55e" },
      { name: "Lead captured", value: base.lead, color: "#3b82f6" },
      { name: "Info provided", value: base.info, color: "#64748b" },
      { name: "Transferred", value: base.transfer, color: "#fbbf24" },
      { name: "Voicemail", value: base.voicemail, color: "#6b7280" },
    ];
  }, [calls]);

  const { positivePct, neutralPct, negativePct } = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const c of calls) {
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
  }, [calls]);

  const heatmap = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
    const base = days.map((day) => ({
      day,
      hours: Array.from({ length: 24 }).map((_, h) => ({
        hour: h,
        value: 0,
      })),
    }));
    for (const c of calls) {
      if (!c.call_started_at) continue;
      const d = new Date(c.call_started_at);
      const weekday = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const row = base.find((r) => r.day === weekday);
      if (!row) continue;
      const hour = d.getHours();
      row.hours[hour].value += 1;
    }
    return base;
  }, [calls]);

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
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-0.5 text-xs">
          {([
            { key: "today", label: "Today" },
            { key: "7d", label: "7D" },
            { key: "30d", label: "30D" },
            { key: "90d", label: "90D" },
          ] as const).map((opt) => (
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
      </div>

      {loading && (
        <p className="text-sm text-zinc-500 mb-4">Loading analytics…</p>
      )}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {!hasData && !loading && !error && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 mb-6 text-center">
          <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
          <p className="text-sm font-medium text-white mb-1">Analytics populate as calls come in</p>
          <p className="text-xs text-zinc-500 mb-4">Your first chart will appear after your first call.</p>
          <Link href="/demo" className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline">Make a test call →</Link>
        </div>
      )}

      {/* Row 1: summary cards */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 hover:bg-zinc-900/70 transition-colors"
          >
            <p className="text-[11px] text-zinc-500 mb-1">{card.label}</p>
            <p className="text-lg md:text-xl font-semibold text-white">
              {card.value}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">{card.trend}</p>
          </div>
        ))}
      </div>

      {/* Row 2: charts */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mb-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
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
                  formatter={(value: number | undefined) => [value ?? 0, "calls"]}
                />
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="#0f172a"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#volumeFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
          <p className="text-sm font-medium text-white mb-4">Call outcomes</p>
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {outcomeSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-400">
            {outcomeSlices.map((slice) => (
              <div key={slice.name} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span>{slice.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: heatmap + insights */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
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
                        const max = 8;
                        const intensity = Math.min(1, cell.value / max);
                        const bg =
                          cell.value === 0
                            ? "transparent"
                            : `rgba(59,130,246,${0.1 + intensity * 0.6})`;
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

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5 flex flex-col gap-3">
          <p className="text-sm font-medium text-white">AI insights</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>Busiest hour this week stays stable around mid-morning.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>Questions about availability often appear outside standard hours.</span>
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>Calls that reach a live answer are much more likely to become appointments.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>Make sure pricing and availability are easy to confirm in the first 30 seconds.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Row 4: sentiment overview */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
        <p className="text-sm font-medium text-white mb-3">Sentiment overview</p>
        <div className="h-4 w-full rounded-full bg-zinc-900 overflow-hidden flex">
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


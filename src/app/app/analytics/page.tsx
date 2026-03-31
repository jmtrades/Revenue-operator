"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Lightbulb,
  TrendingUp,
  CalendarRange,
  Sparkles,
  PhoneIncoming,
  Send,
  LayoutDashboard,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { KPIRow } from "@/components/ui/KPIRow";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { useTranslations } from "next-intl";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { PipelineFunnel } from "@/components/analytics/PipelineFunnel";
import { OperationsSummary } from "@/components/analytics/OperationsSummary";
import { RevenueForecast } from "@/components/analytics/RevenueForecast";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

type AnalyticsScope = "overview" | "inbound" | "outbound";

type OutboundMetricsPayload = {
  outbound_messages: number;
  inbound_replies: number;
  volume_by_day: { day: string; count: number }[];
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    called: number;
    answered: number;
    appointments_booked: number;
    total_contacts: number;
  }>;
  totals: {
    dialed: number;
    answered: number;
    appointments_booked: number;
    active_campaigns: number;
  };
};

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

interface RevenueRecoveredMetrics {
  total_recovered: number;
  calls_answered: number;
  no_shows_recovered: number;
  reactivations: number;
}

const ANALYTICS_CALLS_SNAPSHOT_PREFIX = "rt_analytics_calls_snapshot:";
const ANALYTICS_LEADS_SNAPSHOT_PREFIX = "rt_analytics_leads_snapshot:";

const AnalyticsCharts = dynamic(
  () => import("./AnalyticsCharts").then((mod) => mod.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-72" />
        </div>
      </div>
    ),
  },
);

const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface SnapshotEnvelope<T> {
  ts: number;
  data: T;
}

function readAnalyticsSnapshot<T>(prefix: string, workspaceId: string): T[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  const key = `${prefix}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    if (!raw) return [];
    const envelope = JSON.parse(raw) as SnapshotEnvelope<T[]> | T[];
    // Handle legacy format (plain array) — treat as expired
    if (Array.isArray(envelope)) {
      safeRemoveItem(key);
      return [];
    }
    if (Date.now() - envelope.ts > SNAPSHOT_MAX_AGE_MS) {
      safeRemoveItem(key);
      return [];
    }
    return Array.isArray(envelope.data) ? envelope.data : [];
  } catch {
    safeRemoveItem(key);
    return [];
  }
}

function persistAnalyticsSnapshot<T>(prefix: string, workspaceId: string, data: T[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  const envelope: SnapshotEnvelope<T[]> = { ts: Date.now(), data };
  safeSetItem(`${prefix}${workspaceId}`, JSON.stringify(envelope));
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

function generatePeriodSummary(
  stats: {
    totalCalls: number;
    answerRate: number;
    avgHandleTime: string;
    conversionRate: number;
    appointmentsBooked: number;
    estimatedRevenue: number;
  },
  rangeLabel: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (stats.totalCalls === 0) {
    return t("analytics.periodSummary.emptyState");
  }

  const parts: string[] = [];

  parts.push(
    t("analytics.periodSummary.handled", {
      calls: stats.totalCalls.toString(),
      answerRate: stats.answerRate.toString(),
    }),
  );

  if (stats.appointmentsBooked > 0) {
    parts.push(
      t("analytics.periodSummary.booked", {
        appointments: stats.appointmentsBooked.toString(),
        conversionRate: stats.conversionRate.toString(),
      }),
    );
  }

  if (stats.estimatedRevenue > 0) {
    parts.push(
      t("analytics.periodSummary.revenue", {
        revenue: stats.estimatedRevenue.toLocaleString(),
      }),
    );
  }

  if (stats.avgHandleTime) {
    parts.push(
      t("analytics.periodSummary.duration", {
        duration: stats.avgHandleTime,
      }),
    );
  }

  return parts.join(" ");
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-8 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
             
            <Skeleton
              key={i}
              variant="rectangular"
              className="h-9 w-16 rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (

          <div key={i} style={{ animationDelay: `${i * 100}ms` }}><Skeleton variant="card" className="h-24" /></div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-72" />
        <Skeleton variant="card" className="h-72" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-48" />
        <Skeleton variant="card" className="h-48" />
      </div>
    </div>
  );
}

export default function AppAnalyticsPage() {
  const t = useTranslations();
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
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      actionLabel: string | null;
      actionHref: string | null;
    }>
  >([]);
  const [revenue, setRevenue] = useState<RevenueRecoveredMetrics | null>(null);
  const [scope, setScope] = useState<AnalyticsScope>("overview");
  const [outboundMetrics, setOutboundMetrics] = useState<OutboundMetricsPayload | null>(null);
  const [outboundLoading, setOutboundLoading] = useState(false);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeBounds(range, dateFrom, dateTo),
    [range, dateFrom, dateTo],
  );

  useEffect(() => {
    document.title = t("analytics.pageTitle", { defaultValue: "Analytics — Revenue Operator" });
    return () => {
      document.title = "";
    };
  }, [t]);

  useEffect(() => {
    if (!workspaceId) return;
    apiFetch<{ suggestions?: Array<{ id: string; title: string; description?: string | null; actionLabel?: string | null; actionHref?: string | null }> }>(
      "/api/analytics/suggestions",
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
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
    apiFetch<RevenueRecoveredMetrics>(
      `/api/analytics/revenue-recovered?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
        setRevenue({
          total_recovered: data.total_recovered ?? 0,
          calls_answered: data.calls_answered ?? 0,
          no_shows_recovered: data.no_shows_recovered ?? 0,
          reactivations: data.reactivations ?? 0,
        });
      })
      .catch(() => {
        setRevenue(null);
      });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      apiFetch<{ calls?: CallRecord[] }>(
        `/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include", timeout: 8000, retries: 1 },
      )
        .then((data) => data.calls ?? [])
        .catch(() => [] as CallRecord[]),
      apiFetch<{ leads?: LeadRecord[] }>(
        `/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include", timeout: 8000, retries: 1 },
      )
        .then((data) => data.leads ?? [])
        .catch(() => [] as LeadRecord[]),
    ])
      .then(([c, l]) => {
        setError(null);
        setCalls(c);
        setLeads(l);
        persistAnalyticsSnapshot(ANALYTICS_CALLS_SNAPSHOT_PREFIX, workspaceId, c);
        persistAnalyticsSnapshot(ANALYTICS_LEADS_SNAPSHOT_PREFIX, workspaceId, l);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError && err.status === 408
            ? t("analytics.errors.timeout")
            : t("analytics.errors.loadFailed");
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, t]);

  useEffect(() => {
    if (!workspaceId) return;
    if (scope !== "overview" && scope !== "outbound") return;
    const start = rangeStart.toISOString().slice(0, 10);
    const end = rangeEnd.toISOString().slice(0, 10);
    let active = true;
    queueMicrotask(() => {
      if (active) setOutboundLoading(true);
    });
    apiFetch<OutboundMetricsPayload>(
      `/api/analytics/outbound-metrics?workspace_id=${encodeURIComponent(workspaceId)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { credentials: "include", timeout: 10000, retries: 0 },
    )
      .then((d) => {
        if (active) setOutboundMetrics(d);
      })
      .catch(() => {
        if (active) setOutboundMetrics(null);
      })
      .finally(() => {
        if (active) setOutboundLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, scope, rangeStart, rangeEnd]);

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

  // Compute average deal value from leads with value_cents, fallback to 0
  const avgDealValue = useMemo(() => {
    const leadsWithValue = filteredLeads.filter((l) => (l as any).value_cents && (l as any).value_cents > 0);
    if (leadsWithValue.length === 0) return 0;
    const sum = leadsWithValue.reduce((acc, l) => acc + ((l as any).value_cents ?? 0), 0);
    return Math.round(sum / leadsWithValue.length);
  }, [filteredLeads]);

  const estRevenueImpact = revenue?.total_recovered ?? (appointments * avgDealValue);

  const hasData = totalCalls > 0 || filteredLeads.length > 0;
  const leadConversionPct = totalCalls === 0 ? 0 : Math.round((callsWithLead / totalCalls) * 100);

  // Compute answer rate from actual call data (calls with duration > 0 / total calls)
  const answerRate = useMemo(() => {
    if (filteredCalls.length === 0) return 0;
    const answered = filteredCalls.filter((c) => {
      if (!c.call_started_at || !c.call_ended_at) return false;
      const dur = new Date(c.call_ended_at).getTime() - new Date(c.call_started_at).getTime();
      return dur > 0;
    }).length;
    return Math.round((answered / filteredCalls.length) * 100);
  }, [filteredCalls]);

  // Compute real period-over-period trends by comparing current range to previous equal-length range
  const trends = useMemo(() => {
    const rangeDuration = rangeEnd.getTime() - rangeStart.getTime();
    const prevStart = new Date(rangeStart.getTime() - rangeDuration);
    const prevEnd = new Date(rangeStart.getTime());
    const prevCalls = calls.filter((c) => {
      const t = c.call_started_at ? new Date(c.call_started_at).getTime() : 0;
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });
    const prevLeads = leads; // leads don't have date filtering currently
    const prevTotalCalls = prevCalls.length;
    const prevCallsWithLead = (() => {
      const leadIds = new Set(prevLeads.map((l) => l.id));
      return prevCalls.filter((c) => c.lead_id && leadIds.has(c.lead_id)).length;
    })();
    const prevAppointments = prevLeads.filter(
      (l) => l.state === "appointment_set" || l.state === "won",
    ).length;
    const prevConversion = prevTotalCalls === 0 ? 0 : Math.round((prevCallsWithLead / prevTotalCalls) * 100);
    const prevAvgHandle = (() => {
      if (prevCalls.length === 0) return 0;
      const sum = prevCalls.reduce((acc, c) => {
        if (!c.call_started_at || !c.call_ended_at) return acc;
        const s = new Date(c.call_started_at).getTime();
        const e = new Date(c.call_ended_at).getTime();
        return acc + Math.max(0, (e - s) / 1000);
      }, 0);
      return sum / prevCalls.length;
    })();
    const prevRevenue = prevAppointments * avgDealValue;

    const pctChange = (curr: number, prev: number): number | undefined => {
      if (curr === 0 && prev === 0) return undefined;
      if (prev === 0) return curr > 0 ? 100 : undefined;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      totalCalls: pctChange(totalCalls, prevTotalCalls),
      avgHandleTime: pctChange(Math.round(avgHandleTime), Math.round(prevAvgHandle)),
      leadConversion: pctChange(leadConversionPct, prevConversion),
      appointments: pctChange(appointments, prevAppointments),
      estRevenue: pctChange(estRevenueImpact, prevRevenue),
    };
  }, [calls, leads, filteredCalls, rangeStart, rangeEnd, totalCalls, avgHandleTime, leadConversionPct, appointments, estRevenueImpact]);

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
      { name: t("analytics.outcomes.booked"), value: base.appointment, color: "#22c55e" },
      { name: t("analytics.outcomes.lead"), value: base.lead, color: "#3b82f6" },
      { name: t("analytics.outcomes.info"), value: base.info, color: "#64748b" },
      { name: t("analytics.outcomes.transferred"), value: base.transfer, color: "#a855f7" },
      { name: t("analytics.outcomes.missed"), value: base.missed, color: "#ef4444" },
      { name: t("analytics.outcomes.voicemail"), value: base.voicemail, color: "#6b7280" },
    ];
  }, [filteredCalls, t]);

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
    const days = [
      t("analytics.days.mon"),
      t("analytics.days.tue"),
      t("analytics.days.wed"),
      t("analytics.days.thu"),
      t("analytics.days.fri"),
      t("analytics.days.sat"),
      t("analytics.days.sun"),
    ] as const;
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
  }, [filteredCalls, t]);

  const funnelData = useMemo(() => {
    const totalCallsCount = totalCalls;
    const leadsCount = filteredLeads.length;
    const qualifiedCount = filteredLeads.filter((l) => l.state === "qualified").length;
    const appointmentCount = filteredLeads.filter((l) => l.state === "appointment_set").length;
    const wonCount = filteredLeads.filter((l) => l.state === "won").length;
    return [
      { stage: t("analytics.funnelStages.calls"), count: totalCallsCount, pct: 100 },
      { stage: t("analytics.funnelStages.leads"), count: leadsCount, pct: totalCallsCount ? (leadsCount / totalCallsCount) * 100 : 0 },
      { stage: t("analytics.funnelStages.qualified"), count: qualifiedCount, pct: leadsCount ? (qualifiedCount / leadsCount) * 100 : 0 },
      { stage: t("analytics.funnelStages.appointments"), count: appointmentCount, pct: qualifiedCount ? (appointmentCount / qualifiedCount) * 100 : 0 },
      { stage: t("analytics.funnelStages.won"), count: wonCount, pct: appointmentCount ? (wonCount / appointmentCount) * 100 : 0 },
    ];
  }, [totalCalls, filteredLeads, t]);

  const summaryLabel = useMemo(() => {
    if (range === "today") return t("analytics.rangeLabels.today");
    if (range === "7d") return t("analytics.rangeLabels.last7");
    if (range === "30d") return t("analytics.rangeLabels.last30");
    if (range === "90d") return t("analytics.rangeLabels.last90");
    return t("analytics.rangeLabels.customRange");
  }, [range, t]);

  const handleExportCsv = () => {
    if (!hasData) return;
    const rows: string[] = [];
    rows.push("type,id,started_at,ended_at,outcome,lead_id,lead_state");
    for (const c of filteredCalls) {
      rows.push(
        [
          "call",
          `"${c.id}"`,
          c.call_started_at ?? "",
          c.call_ended_at ?? "",
          c.outcome ?? "",
          c.lead_id ?? "",
          "",
        ].join(","),
      );
    }
    for (const l of filteredLeads) {
      rows.push(
        [
          "lead",
          `"${l.id}"`,
          "",
          "",
          "",
          l.id,
          l.state,
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue-operator-analytics.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!workspaceId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          title="No workspace"
          description="Select or create a workspace to view analytics."
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <Breadcrumbs items={[{ label: t("common.home"), href: "/app" }, { label: t("analytics.heading", { defaultValue: "Analytics" }) }]} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--text-tertiary)]" />
            {t("analytics.heading", { defaultValue: "Analytics" })}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Revenue intelligence for your autonomous pipeline
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-0.5 text-xs">
            {([
              { key: "today" as const, label: t("analytics.ranges.today", { defaultValue: "Today" }) },
              { key: "7d" as const, label: t("analytics.ranges.sevenDay", { defaultValue: "7D" }) },
              { key: "30d" as const, label: t("analytics.ranges.thirtyDay", { defaultValue: "30D" }) },
              { key: "90d" as const, label: t("analytics.ranges.ninetyDay", { defaultValue: "90D" }) },
              { key: "custom" as const, label: t("analytics.ranges.custom", { defaultValue: "Custom" }) },
            ]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-3 py-1.5 rounded-lg ${
                  range === opt.key
                    ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium"
                    : "text-[var(--text-tertiary)]"
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
                className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1.5 text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-secondary)]">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!hasData || scope === "outbound"}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {t("analytics.exportCsv", { defaultValue: "Export CSV" })}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label={t("analytics.heading", { defaultValue: "Analytics" })}>
        {(
          [
            { key: "overview" as const, label: t("analytics.tabs.overview", { defaultValue: "Overview" }), Icon: LayoutDashboard },
            { key: "inbound" as const, label: t("analytics.tabs.inbound", { defaultValue: "Inbound" }), Icon: PhoneIncoming },
            { key: "outbound" as const, label: t("analytics.tabs.outbound", { defaultValue: "Outbound" }), Icon: Send },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={scope === key}
            onClick={() => setScope(key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              scope === key
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {(scope === "inbound" || scope === "outbound") && (
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {scope === "inbound" ? t("analytics.inboundTab.hint") : t("analytics.outboundTab.hint")}
        </p>
      )}

      {scope === "outbound" && (
        <div className="mb-8 space-y-6" role="tabpanel">
          {outboundLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="card" className="h-24" />
              ))}
            </div>
          )}
          {!outboundLoading && outboundMetrics && (
            <>
              {(() => {
                const om = outboundMetrics;
                const hasOb =
                  om.outbound_messages > 0 ||
                  om.totals.dialed > 0 ||
                  (om.campaigns?.length ?? 0) > 0;
                if (!hasOb) {
                  return (
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center">
                      <Send className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" aria-hidden />
                      <p className="text-sm text-[var(--text-secondary)] mb-4">{t("analytics.outboundTab.empty")}</p>
                      <Link
                        href="/app/campaigns"
                        className="inline-flex rounded-xl bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90"
                      >
                        {t("analytics.outboundTab.goCampaigns")} →
                      </Link>
                    </div>
                  );
                }
                const maxSms = Math.max(1, ...om.volume_by_day.map((x) => x.count));
                return (
                  <>
                    <KPIRow className="lg:grid-cols-4">
                      <StatCard label={t("analytics.outboundTab.smsSent", { defaultValue: "Outbound SMS" })} value={om.outbound_messages} />
                      <StatCard label={t("analytics.outboundTab.replies", { defaultValue: "Inbound replies" })} value={om.inbound_replies} />
                      <StatCard label={t("analytics.outboundTab.activeCampaigns", { defaultValue: "Active campaigns" })} value={om.totals.active_campaigns} />
                      <StatCard label={t("analytics.outboundTab.totalDialed", { defaultValue: "Campaign dials" })} value={om.totals.dialed} />
                    </KPIRow>
                    <KPIRow className="lg:grid-cols-3">
                      <StatCard label={t("analytics.outboundTab.connected", { defaultValue: "Connected" })} value={om.totals.answered} />
                      <StatCard label={t("analytics.outboundTab.apptsBooked", { defaultValue: "Appts (campaigns)" })} value={om.totals.appointments_booked} />
                    </KPIRow>
                    {om.volume_by_day.length > 0 && (
                      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("analytics.outboundTab.smsVolume", { defaultValue: "Outbound SMS by day" })}</p>
                        <div className="flex items-end gap-1 h-28">
                          {om.volume_by_day.map((row) => (
                            <div key={row.day} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                              <div
                                className="w-full max-w-[20px] rounded-t bg-[var(--accent-primary)]/80 mx-auto"
                                style={{ height: `${Math.max(8, (row.count / maxSms) * 100)}%` }}
                                title={`${row.day}: ${row.count}`}
                              />
                              <span className="text-[9px] text-[var(--text-secondary)] truncate w-full text-center">{row.day.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {om.campaigns.length > 0 && (
                      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 overflow-x-auto">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("analytics.outboundTab.campaignsHeading", { defaultValue: "Campaigns" })}</p>
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                              <th className="pb-2 pr-3 font-medium">{t("analytics.outboundTab.campaignName", { defaultValue: "Campaign" })}</th>
                              <th className="pb-2 pr-3 font-medium">{t("analytics.outboundTab.status", { defaultValue: "Status" })}</th>
                              <th className="pb-2 pr-3 font-medium text-right">{t("analytics.outboundTab.totalDialed", { defaultValue: "Campaign dials" })}</th>
                              <th className="pb-2 pr-3 font-medium text-right">{t("analytics.outboundTab.connected", { defaultValue: "Connected" })}</th>
                              <th className="pb-2 font-medium text-right">{t("analytics.outboundTab.apptsBooked", { defaultValue: "Appts (campaigns)" })}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {om.campaigns.map((c) => (
                              <tr key={c.id} className="border-b border-[var(--border-default)]/50 text-[var(--text-secondary)]">
                                <td className="py-2 pr-3 text-[var(--text-primary)]">{c.name}</td>
                                <td className="py-2 pr-3 capitalize">{c.status}</td>
                                <td className="py-2 pr-3 text-right">{c.called}</td>
                                <td className="py-2 pr-3 text-right">{c.answered}</td>
                                <td className="py-2 text-right">{c.appointments_booked}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Link
                          href="/app/campaigns"
                          className="inline-block mt-4 text-xs font-medium text-[var(--accent-primary)] hover:opacity-80"
                        >
                          {t("analytics.outboundTab.goCampaigns")} →
                        </Link>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}

      {scope !== "outbound" && !loading && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("analytics.periodSummary.title")}</h3>
            <span className="text-xs text-[var(--text-secondary)] ml-auto">{summaryLabel}</span>
          </div>
          <p
            className="text-sm text-[var(--text-tertiary)] leading-relaxed"

            dangerouslySetInnerHTML={{
              __html: generatePeriodSummary(
                {
                  totalCalls,
                  answerRate,
                  avgHandleTime: formatDuration(avgHandleTime),
                  conversionRate: leadConversionPct,
                  appointmentsBooked: appointments,
                  estimatedRevenue: estRevenueImpact,
                },
                summaryLabel,
                t,
              ).replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="text-[var(--text-primary)]">$1</strong>',
              ),
            }}
          />
        </div>
      )}

      {scope !== "outbound" && (
        <>
      {loading && <AnalyticsSkeleton />}
      {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
      {!hasData && !loading && !error && (
        <div className="mb-6">
          <EmptyState
            icon={BarChart3}
            title={t("analytics.emptyState.title")}
            description={t("analytics.emptyState.description")}
            ariaLabel={t("analytics.emptyState.ariaLabel")}
            primaryAction={{
              label: t("analytics.emptyState.action"),
              href: "/app/calls/live",
            }}
          />
        </div>
      )}

      {/* KPI row — 5 stats with trends */}
      <KPIRow className="mb-6 lg:grid-cols-5">
        <StatCard
          label={t("analytics.kpi.totalCalls")}
          value={totalCalls}
          trend={hasData ? trends.totalCalls : undefined}
        />
        <StatCard
          label={t("analytics.kpi.avgHandleTime")}
          value={Math.round(avgHandleTime)}
          suffix="s"
          trend={hasData ? trends.avgHandleTime : undefined}
        />
        <StatCard
          label={t("analytics.kpi.leadConversion")}
          value={leadConversionPct}
          suffix="%"
          trend={hasData ? trends.leadConversion : undefined}
        />
        <StatCard
          label={t("analytics.kpi.appointmentsBooked")}
          value={appointments}
          trend={hasData ? trends.appointments : undefined}
        />
        <StatCard
          label={t("analytics.kpi.estRevenue")}
          value={estRevenueImpact}
          prefix="$"
          trend={hasData ? trends.estRevenue : undefined}
        />
      </KPIRow>

      {/* Revenue Forecast */}
      {!loading && hasData && (
        <div className="mb-6">
          <RevenueForecast workspaceId={workspaceId} />
        </div>
      )}

      <AnalyticsCharts volumeData={volumeData} outcomeSlices={outcomeSlices} />

      {/* Lead funnel */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 mb-6">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("analytics.leadFunnel")}</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {funnelData.map((item, i) => (
            <div key={item.stage} className="flex-1 min-w-0 flex flex-col items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">{item.stage}</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{item.count}</p>
              {i > 0 && (
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  {item.pct > 0 ? `${Math.round(item.pct)}% conv.` : "—"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Period summary card */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-[var(--bg-input)] p-2">
            <CalendarRange className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {t("analytics.atAGlance", { label: summaryLabel })}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {hasData
                ? t("analytics.glanceSummary", {
                    totalCalls: totalCalls.toString(),
                    leads: callsWithLead.toString(),
                    appointments: appointments.toString(),
                    revenue: estRevenueImpact.toLocaleString(),
                  })
                : t("analytics.emptyStateSummary")}
            </p>
          </div>
        </div>
        {hasData && (
          <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text-tertiary)]">
            <span>{t("analytics.leadConversionPct", { pct: leadConversionPct })}</span>
            <span>{t("analytics.positiveSentimentPct", { pct: positivePct })}</span>
          </div>
        )}
      </div>

      {/* Row 3: heatmap + insights */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("analytics.peakHours")}</p>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-rows-8 gap-1 text-[10px] text-[var(--text-secondary)] mb-1">
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
                    <div className="text-[10px] text-[var(--text-secondary)] text-right pr-1">
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
                            title={`${row.day} ${formatHour(cell.hour, t)}: ${cell.value} calls`}
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
          <p className="text-sm font-medium text-[var(--text-primary)]">{t("analytics.aiInsights")}</p>
          <div className="space-y-2">
            {suggestions.length > 0
              ? suggestions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0 text-[var(--accent-warning,#f59e0b)] mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                      {s.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.description}</p>}
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
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-tertiary)] shrink-0"
                    >
                      {t("analytics.dismiss")}
                    </button>
                  </div>
                ))
              : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <TrendingUp className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">{t("analytics.insightBusyHour")}</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-warning,#f59e0b)] mt-0.5" />
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">{t("analytics.insightAvailability")}</p>
                      <Link href="/app/knowledge" className="text-xs text-[var(--accent-primary)] mt-1 inline-block">{t("analytics.addToKnowledge")} →</Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">{t("analytics.insightLiveAnswer")}</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
                    <Lightbulb className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">{t("analytics.insightPricing")}</p>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>

      {scope === "overview" &&
        outboundMetrics &&
        !outboundLoading &&
        (outboundMetrics.outbound_messages > 0 || outboundMetrics.totals.dialed > 0) && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5 mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("analytics.outboundSnapshot.title")}</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{outboundMetrics.outbound_messages}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("analytics.outboundSnapshot.sms")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{outboundMetrics.totals.dialed}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("analytics.outboundSnapshot.dials")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{outboundMetrics.totals.appointments_booked}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("analytics.outboundSnapshot.booked")}</p>
              </div>
            </div>
            <Link href="/app/campaigns" className="inline-block mt-3 text-xs text-[var(--accent-primary)] hover:opacity-80">
              {t("analytics.outboundTab.goCampaigns")} →
            </Link>
          </div>
        )}

      {/* Pipeline & Operations Section — shown for overview & inbound scopes */}
      {(scope === "overview" || scope === "inbound") && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--text-tertiary)]" />
            {t("analytics.pipelineTitle")}
          </h2>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <PipelineFunnel workspaceId={workspaceId} />

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("analytics.operationalMetrics")}</h3>
              <OperationsSummary
                workspaceId={workspaceId}
                startDate={rangeStart.toISOString().split("T")[0]}
                endDate={rangeEnd.toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Row 4: sentiment overview */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("analytics.sentimentOverview")}</p>
        <div className="h-4 w-full rounded-full bg-[var(--border-default)] overflow-hidden flex">
          <div
            className="h-full bg-[var(--accent-primary)]"
            style={{ width: `${positivePct}%` }}
          />
          <div
            className="h-full bg-[var(--text-tertiary)]"
            style={{ width: `${neutralPct}%` }}
          />
          <div
            className="h-full bg-[var(--accent-danger,#ef4444)]"
            style={{ width: `${negativePct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--text-tertiary)]">
          <span>{t("analytics.sentimentPositive", { pct: positivePct })}</span>
          <span>{t("analytics.sentimentNeutral", { pct: neutralPct })}</span>
          <span>{t("analytics.sentimentNegative", { pct: negativePct })}</span>
        </div>
      </div>
        </>
      )}
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

function formatHour(hour: number, t: (k: string) => string): string {
  const suffix = hour < 12 ? t("analytics.am") : t("analytics.pm");
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12} ${suffix}`;
}


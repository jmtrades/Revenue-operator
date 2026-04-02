"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  Phone,
  MessageSquare,
  Megaphone,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  TrendingUp,
  MailCheck,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { track } from "@/lib/analytics/posthog";
import { safeGetItem, safeSetItem } from "@/lib/client/safe-storage";

/* ── Lazy-loaded cards (only essential ones) ── */
const SetupHealthCard = lazy(() =>
  import("@/components/dashboard/SetupHealthCard").then((m) => ({
    default: m.SetupHealthCard,
  }))
);
const LiveCallFeed = lazy(() =>
  import("@/components/dashboard/LiveCallFeed").then((m) => ({
    default: m.LiveCallFeed,
  }))
);

/* ── Skeleton components ── */
function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="h-3 w-20 rounded bg-[var(--bg-hover)] skeleton-shimmer mb-3" />
      <div className="h-8 w-16 rounded bg-[var(--bg-hover)] skeleton-shimmer mb-2" />
      <div className="h-3 w-24 rounded bg-[var(--bg-hover)] skeleton-shimmer" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="h-4 w-32 rounded bg-[var(--bg-hover)] skeleton-shimmer mb-4" />
      <div className="space-y-3">
        <div className="h-12 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-12 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-12 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    </div>
  );
}

function FullPageSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-[1120px] mx-auto space-y-6">
      <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionSkeleton />
        </div>
        <SectionSkeleton />
      </div>
    </div>
  );
}

/* ── Types ── */
type Summary = {
  revenue_recovered_cents: number;
  revenue_trend_pct: number;
  calls_answered: number;
  inbound_calls: number;
  outbound_calls: number;
  appointments_booked: number;
  follow_ups_sent: number;
  missed_calls_recovered: number;
  qualified_leads: number;
  conversion_rate: number;
  minutes_used: number;
  minutes_limit: number;
  agent_configured?: boolean;
  phone_number_configured?: boolean;
  needs_attention: {
    id: string;
    name: string;
    reason: string;
    phone?: string | null;
  }[];
  activity: { id: string; at: string; line: string }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    enrolled: number;
    booked: number;
  }[];
  missed_calls_today: number;
  no_shows_this_week: number;
  stale_leads: number;
  pending_follow_ups: number;
};

const EMPTY: Summary = {
  revenue_recovered_cents: 0,
  revenue_trend_pct: 0,
  calls_answered: 0,
  inbound_calls: 0,
  outbound_calls: 0,
  appointments_booked: 0,
  follow_ups_sent: 0,
  missed_calls_recovered: 0,
  qualified_leads: 0,
  conversion_rate: 0,
  minutes_used: 0,
  minutes_limit: 1000,
  needs_attention: [],
  activity: [],
  campaigns: [],
  missed_calls_today: 0,
  no_shows_this_week: 0,
  stale_leads: 0,
  pending_follow_ups: 0,
};

/* ── Helpers ── */
function fmtMoney(cents: number): string {
  if (cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return "";
  }
}

function fmtLastUpdated(
  date: Date | null,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!date) return t("lastUpdated.never");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins === 0) return t("lastUpdated.justNow");
  if (diffMins === 1) return t("lastUpdated.oneMinute");
  if (diffMins < 60) return t("lastUpdated.minutes", { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return t("lastUpdated.oneHour");
  return t("lastUpdated.hours", { count: diffHours });
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function UnifiedDashboard() {
  const t = useTranslations("dashboard");
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  /* ── Data fetching ── */
  const load = useCallback(
    (isRefresh = false) => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(null);
      fetch(
        `/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      )
        .then((r) => {
          if (r.status === 401) {
            window.location.href = "/sign-in";
            return;
          }
          if (!r.ok) throw new Error(`Dashboard returned ${r.status}`);
          return r.json();
        })
        .then((j: Summary | null) => {
          setData(j ?? { ...EMPTY });
          setFetchError(null);
          setLastUpdated(new Date());
        })
        .catch((err) => {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load dashboard data"
          );
          setData({ ...EMPTY });
        })
        .finally(() => {
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        });
    },
    [workspaceId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      load(true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  /* ── Analytics tracking ── */
  useEffect(() => {
    if (!workspaceId || !data) return;
    const firstCallKey = `rt_first_call_received_${workspaceId}`;
    if (data.calls_answered > 0 && !safeGetItem(firstCallKey)) {
      track("first_call_received");
      safeSetItem(firstCallKey, "1");
    }
    const firstApptKey = `rt_first_appointment_booked_${workspaceId}`;
    if (data.appointments_booked > 0 && !safeGetItem(firstApptKey)) {
      track("first_appointment_booked");
      safeSetItem(firstApptKey, "1");
    }
    const firstRevenueKey = `rt_first_revenue_attributed_${workspaceId}`;
    if (data.revenue_recovered_cents > 0 && !safeGetItem(firstRevenueKey)) {
      track("first_revenue_attributed", {
        amount_cents: data.revenue_recovered_cents,
      });
      safeSetItem(firstRevenueKey, "1");
    }
  }, [data, workspaceId]);

  /* ── Handlers ── */
  const onCall = async (leadId: string) => {
    setCallingId(leadId);
    try {
      await fetch("/api/outbound/call", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          campaign_type: "lead_followup",
        }),
      });
    } finally {
      setCallingId(null);
    }
  };

  /* ── Empty / loading states ── */
  if (!workspaceId) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("noWorkspace", { defaultValue: "No workspace" })}
          description={t("selectWorkspace", {
            defaultValue:
              "Select or create a workspace to view the dashboard.",
          })}
        />
      </div>
    );
  }

  if (loading || !data) {
    return <FullPageSkeleton />;
  }

  /* ── Computed values ── */
  const pctMin =
    data.minutes_limit > 0
      ? Math.min(100, Math.round((data.minutes_used / data.minutes_limit) * 100))
      : 0;
  const hasSignal =
    data.calls_answered > 0 ||
    data.appointments_booked > 0 ||
    data.follow_ups_sent > 0 ||
    data.revenue_recovered_cents > 0;

  const attentionCount =
    [
      data.missed_calls_today,
      data.no_shows_this_week,
      data.stale_leads,
      data.pending_follow_ups,
    ].filter((v) => v > 0).length + data.needs_attention.length;

  /* ── KPI definitions ── */
  const kpis = [
    {
      label: t("kpis.callsHandled", { defaultValue: "Calls today" }),
      value: data.calls_answered,
      formatted: data.calls_answered.toLocaleString(),
      sub: data.missed_calls_recovered > 0
        ? `${data.missed_calls_recovered} recovered`
        : undefined,
      icon: Phone,
      accent: "var(--accent-primary)",
    },
    {
      label: t("kpis.appointmentsBooked", {
        defaultValue: "Appointments booked",
      }),
      value: data.appointments_booked,
      formatted: data.appointments_booked.toLocaleString(),
      sub: data.conversion_rate > 0
        ? `${data.conversion_rate}% conversion`
        : undefined,
      icon: CalendarCheck,
      accent: "var(--accent-secondary)",
    },
    {
      label: t("kpis.recovered", { defaultValue: "Revenue recovered" }),
      value: data.revenue_recovered_cents,
      formatted: fmtMoney(data.revenue_recovered_cents),
      trend: data.revenue_trend_pct,
      icon: TrendingUp,
      accent: "#10b981",
    },
    {
      label: t("kpis.followUpsSent", { defaultValue: "Follow-ups sent" }),
      value: data.follow_ups_sent,
      formatted: data.follow_ups_sent.toLocaleString(),
      sub: data.qualified_leads > 0
        ? `${data.qualified_leads} qualified`
        : undefined,
      icon: MailCheck,
      accent: "var(--accent-indigo, #6366f1)",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1120px] mx-auto">
      {/* ── Error banner ── */}
      {fetchError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-[var(--text-primary)]">
              {t("errors.loadFailed", {
                defaultValue: "Could not load dashboard data.",
              })}{" "}
              <button
                onClick={() => load(true)}
                className="text-[var(--accent-primary)] font-medium hover:underline"
              >
                {t("actions.tryAgain", { defaultValue: "Try again" })}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Phone not connected banner ── */}
      {data?.phone_number_configured === false && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-primary)]">
            {t("phoneWarning.title", {
              defaultValue: "Phone number not connected.",
            })}{" "}
            <Link
              href="/app/settings/phone"
              className="text-[var(--accent-primary)] font-medium hover:underline"
            >
              {t("phoneWarning.cta", { defaultValue: "Connect now" })}
            </Link>
          </p>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            {t("title", { defaultValue: "Dashboard" })}
          </h1>
          {lastUpdated && (
            <p
              className="text-xs text-[var(--text-tertiary)] mt-1"
              suppressHydrationWarning
            >
              {t("actions.updatedAt", { defaultValue: "Updated" })}{" "}
              {fmtLastUpdated(lastUpdated, t)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter workspaceId={workspaceId} />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {t("actions.refresh", { defaultValue: "Refresh" })}
            </span>
          </button>
        </div>
      </div>

      {/* ── KPI metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 md:p-5 transition-colors hover:border-[var(--border-hover)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: `color-mix(in srgb, ${k.accent} 10%, transparent)`,
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: k.accent }}
                    strokeWidth={2}
                  />
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {k.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight leading-none">
                  {k.formatted}
                </p>
                {k.trend !== undefined && k.trend !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                      k.trend >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {k.trend >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(k.trend)}%
                  </span>
                )}
              </div>
              {k.sub && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                  {k.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Usage bar (only show when meaningful) ── */}
      {data.minutes_limit > 0 && (
        <div className="mb-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 md:px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {t("minutesLabel", { defaultValue: "Minutes used" })}
            </span>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {data.minutes_used.toLocaleString()}/{data.minutes_limit.toLocaleString()}
              {pctMin >= 80 && (
                <Link
                  href="/app/settings/billing"
                  className="ml-2 text-[var(--accent-primary)] font-medium hover:underline"
                >
                  {t("actions.upgrade", { defaultValue: "Upgrade" })}
                </Link>
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctMin >= 100
                  ? "bg-red-500"
                  : pctMin >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${pctMin}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Quick actions row ── */}
      {hasSignal && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/app/agents"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {t("quickActions.testCall", { defaultValue: "Test call" })}
          </Link>
          <Link
            href="/app/campaigns"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            {t("quickActions.campaign", { defaultValue: "New campaign" })}
          </Link>
          <Link
            href="/app/contacts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            {t("quickActions.addLead", { defaultValue: "Add lead" })}
          </Link>
        </div>
      )}

      {/* ── Setup checklist (auto-hides when complete) ── */}
      {!hasSignal && (
        <div className="mb-8">
          <Suspense fallback={<SectionSkeleton />}>
            <SetupHealthCard workspaceId={workspaceId} />
          </Suspense>
        </div>
      )}

      {/* ── Main content grid: 2/3 + 1/3 ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Left column: Activity feed + Needs attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue at risk (only when there are issues) */}
          {attentionCount > 0 && (
            <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("needsAttention.title", {
                    defaultValue: "Needs attention",
                  })}
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                  {attentionCount}
                </span>
              </div>

              {/* Leakage items */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {data.missed_calls_today > 0 && (
                  <Link
                    href="/app/calls"
                    className="group flex items-center gap-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] p-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {data.missed_calls_today} missed calls
                      </p>
                      <p className="text-[11px] text-amber-500 font-medium group-hover:underline">
                        Recover now
                      </p>
                    </div>
                  </Link>
                )}
                {data.no_shows_this_week > 0 && (
                  <Link
                    href="/app/contacts"
                    className="group flex items-center gap-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] p-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {data.no_shows_this_week} no-shows
                      </p>
                      <p className="text-[11px] text-amber-500 font-medium group-hover:underline">
                        Re-engage
                      </p>
                    </div>
                  </Link>
                )}
                {data.stale_leads > 0 && (
                  <Link
                    href="/app/contacts?filter=stale"
                    className="group flex items-center gap-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] p-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {data.stale_leads} stale leads
                      </p>
                      <p className="text-[11px] text-amber-500 font-medium group-hover:underline">
                        Reactivate
                      </p>
                    </div>
                  </Link>
                )}
                {data.pending_follow_ups > 0 && (
                  <Link
                    href="/app/follow-ups"
                    className="group flex items-center gap-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] p-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <MailCheck className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {data.pending_follow_ups} pending follow-ups
                      </p>
                      <p className="text-[11px] text-amber-500 font-medium group-hover:underline">
                        Send now
                      </p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Lead-level attention items */}
              {data.needs_attention.length > 0 && (
                <div className="space-y-2">
                  {data.needs_attention.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/app/leads?highlight=${encodeURIComponent(item.id)}`}
                          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors truncate block"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                          {item.reason}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={callingId === item.id}
                          onClick={() => void onCall(item.id)}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Link href="/app/inbox">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Text
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {data.needs_attention.length > 5 && (
                    <Link
                      href="/app/leads"
                      className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors pt-1"
                    >
                      View all {data.needs_attention.length} items
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Empty state for attention */}
              {data.needs_attention.length === 0 &&
                data.missed_calls_today === 0 &&
                data.no_shows_this_week === 0 &&
                data.stale_leads === 0 &&
                data.pending_follow_ups === 0 && (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                    {t("needsAttention.empty", {
                      defaultValue: "Nothing needs attention right now.",
                    })}
                  </p>
                )}
            </section>
          )}

          {/* Recent activity / Live call feed */}
          <Suspense fallback={<SectionSkeleton />}>
            <LiveCallFeed workspaceId={workspaceId} />
          </Suspense>

          {/* Active campaigns */}
          {data.campaigns.length > 0 && (
            <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {t("activeCampaigns.title", {
                      defaultValue: "Active campaigns",
                    })}
                  </h2>
                </div>
                <Link
                  href="/app/campaigns"
                  className="text-xs text-[var(--accent-primary)] font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {data.campaigns.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href="/app/campaigns"
                    className="group flex items-center justify-between rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] p-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                        {c.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          <span className="font-medium tabular-nums text-[var(--text-secondary)]">
                            {c.enrolled}
                          </span>{" "}
                          contacts
                        </span>
                        <span className="text-[var(--text-tertiary)]">
                          &middot;
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          <span className="font-medium tabular-nums text-emerald-500">
                            {c.booked}
                          </span>{" "}
                          booked
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Activity feed + setup */}
        <div className="space-y-6">
          {/* Today's activity summary */}
          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              {t("todaysActivity.title", {
                defaultValue: "Today's activity",
              })}
            </h2>
            {data.activity.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  No activity yet today.
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Activity will appear here as calls come in.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.activity.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="text-[11px] tabular-nums text-[var(--text-tertiary)] whitespace-nowrap mt-0.5 min-w-[52px]">
                      {fmtTime(item.at)}
                    </span>
                    <p className="text-[var(--text-secondary)] leading-snug">
                      {item.line}
                    </p>
                  </div>
                ))}
                {data.activity.length > 8 && (
                  <Link
                    href="/app/calls"
                    className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors pt-1"
                  >
                    View all activity
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Setup health (shows when incomplete) */}
          {hasSignal && (
            <Suspense fallback={<SectionSkeleton />}>
              <SetupHealthCard workspaceId={workspaceId} />
            </Suspense>
          )}

          {/* Quick links */}
          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Quick links
            </h2>
            <div className="space-y-1">
              {[
                {
                  href: "/app/agents",
                  icon: Bot,
                  label: "AI Agents",
                },
                {
                  href: "/app/campaigns",
                  icon: Megaphone,
                  label: "Campaigns",
                },
                {
                  href: "/app/contacts",
                  icon: Users,
                  label: "Contacts",
                },
                {
                  href: "/app/inbox",
                  icon: MessageSquare,
                  label: "Inbox",
                },
                {
                  href: "/app/settings/billing",
                  icon: TrendingUp,
                  label: "Billing & Usage",
                },
              ].map((link) => {
                const LinkIcon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {link.label}
                    <ChevronRight className="w-3 h-3 ml-auto text-[var(--text-tertiary)]" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

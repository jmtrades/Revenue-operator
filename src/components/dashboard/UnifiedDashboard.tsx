"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  Phone,
  MessageSquare,
  Megaphone,
  Bot,
  PhoneCall,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  TrendingUp,
  MailCheck,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { track } from "@/lib/analytics/posthog";
import { safeGetItem, safeSetItem } from "@/lib/client/safe-storage";
import { staggerContainer, staggerItem, staggerFast } from "@/lib/animations";

/* ── Lazy-loaded dashboard cards for code-splitting & faster initial paint ── */
const AutomationEngineCard = lazy(() => import("@/components/dashboard/AutomationEngineCard").then(m => ({ default: m.AutomationEngineCard })));
const VoiceABTestCard = lazy(() => import("@/components/dashboard/VoiceABTestCard").then(m => ({ default: m.VoiceABTestCard })));
const SequenceABTestCard = lazy(() => import("@/components/dashboard/SequenceABTestCard").then(m => ({ default: m.SequenceABTestCard })));
const IntelligenceCard = lazy(() => import("@/components/dashboard/IntelligenceCard").then(m => ({ default: m.IntelligenceCard })));
const VoiceAnalyticsCard = lazy(() => import("@/components/dashboard/VoiceAnalyticsCard").then(m => ({ default: m.VoiceAnalyticsCard })));
const WebhookManagementCard = lazy(() => import("@/components/dashboard/WebhookManagementCard").then(m => ({ default: m.WebhookManagementCard })));
const OutboundCampaignCard = lazy(() => import("@/components/dashboard/OutboundCampaignCard").then(m => ({ default: m.OutboundCampaignCard })));
const CampaignPerformanceCard = lazy(() => import("@/components/dashboard/CampaignPerformanceCard").then(m => ({ default: m.CampaignPerformanceCard })));
const CallRecordingsCard = lazy(() => import("@/components/dashboard/CallRecordingsCard").then(m => ({ default: m.CallRecordingsCard })));
const CoachingReportCard = lazy(() => import("@/components/dashboard/CoachingReportCard").then(m => ({ default: m.CoachingReportCard })));
const AppointmentManagementCard = lazy(() => import("@/components/dashboard/AppointmentManagementCard").then(m => ({ default: m.AppointmentManagementCard })));
const EscalationLogCard = lazy(() => import("@/components/dashboard/EscalationLogCard").then(m => ({ default: m.EscalationLogCard })));
const DNCManagementCard = lazy(() => import("@/components/dashboard/DNCManagementCard").then(m => ({ default: m.DNCManagementCard })));
const SMSThreadsCard = lazy(() => import("@/components/dashboard/SMSThreadsCard").then(m => ({ default: m.SMSThreadsCard })));
const CallTransferCard = lazy(() => import("@/components/dashboard/CallTransferCard").then(m => ({ default: m.CallTransferCard })));
const WorkspaceSettingsCard = lazy(() => import("@/components/dashboard/WorkspaceSettingsCard").then(m => ({ default: m.WorkspaceSettingsCard })));
const LiveCallFeed = lazy(() => import("@/components/dashboard/LiveCallFeed").then(m => ({ default: m.LiveCallFeed })));
const RecommendationsCard = lazy(() => import("@/components/dashboard/RecommendationsCard").then(m => ({ default: m.RecommendationsCard })));
const SetupHealthCard = lazy(() => import("@/components/dashboard/SetupHealthCard").then(m => ({ default: m.SetupHealthCard })));
const RecoveryScoreCard = lazy(() => import("@/components/dashboard/RecoveryScoreCard").then(m => ({ default: m.RecoveryScoreCard })));
const AutonomousBriefing = lazy(() => import("@/components/dashboard/AutonomousBriefing").then(m => ({ default: m.AutonomousBriefing })));

function CardSkeleton() {
  return (
    <div className="dash-section p-5 md:p-6">
      <div className="h-4 w-32 rounded skeleton-shimmer mb-4" />
      <div className="space-y-2">
        <div className="h-10 rounded-lg skeleton-shimmer" />
        <div className="h-10 rounded-lg skeleton-shimmer" />
        <div className="h-10 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

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
  needs_attention: { id: string; name: string; reason: string; phone?: string | null }[];
  activity: { id: string; at: string; line: string }[];
  campaigns: { id: string; name: string; status: string; enrolled: number; booked: number }[];
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
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtLastUpdated(date: Date | null, t: (key: string, params?: Record<string, string | number>) => string): string {
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

/* ──────────────────────────────────────────────────────────────────────── */

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

  const load = useCallback((isRefresh = false) => {
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
    fetch(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
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
        // Silently handled — error state shown in UI via setFetchError below
        setFetchError(err instanceof Error ? err.message : "Failed to load dashboard data");
        setData({ ...EMPTY });
        // Don't update lastUpdated on error — timestamp should reflect last successful load
      })
      .finally(() => {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      });
  }, [workspaceId]);

  useEffect(() => {
    load(false);
  }, [load]);

  // Auto-refresh dashboard every 60 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => { load(true); }, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  /* ── Analytics tracking effects ──────────────────────────────────────── */
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
      track("first_revenue_attributed", { amount_cents: data.revenue_recovered_cents });
      safeSetItem(firstRevenueKey, "1");
    }
  }, [data, workspaceId]);

  useEffect(() => {
    if (!workspaceId || !data) return;
    if (!Array.isArray(data.needs_attention) || data.needs_attention.length === 0) return;
    const items = data.needs_attention.slice(0, 3);
    void (async () => {
      await Promise.all(
        items.map(async (item) => {
          const localKey = `rt_needs_attention_notified_${workspaceId}_${item.id}`;
          if (safeGetItem(localKey)) return;
          try {
            const res = await fetch("/api/notifications/needs-attention", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                needs_attention_id: item.id,
                reason: item.reason,
                phone: item.phone ?? undefined,
              }),
            });
            if (res.ok) safeSetItem(localKey, "1");
          } catch {
            /* best-effort */
          }
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const trialDay7Key = `rt_trial_day_7_active_${workspaceId}`;
    if (safeGetItem(trialDay7Key)) return;
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((billing: { billing_status?: string; renewal_at?: string | null } | null) => {
        const billingStatus = billing?.billing_status ?? null;
        const renewalAt = billing?.renewal_at ?? null;
        if (!billingStatus || !renewalAt) return;
        if (billingStatus !== "trial") return;
        const trialEndMs = new Date(renewalAt).getTime();
        if (!Number.isFinite(trialEndMs) || Number.isNaN(trialEndMs)) return;
        const day7StartMs = trialEndMs - 7 * 24 * 60 * 60 * 1000;
        const day7EndMs = trialEndMs - 6 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        if (nowMs >= day7StartMs && nowMs < day7EndMs) {
          track("trial_day_7_active");
          safeSetItem(trialDay7Key, "1");
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const onCall = async (leadId: string) => {
    setCallingId(leadId);
    try {
      await fetch("/api/outbound/call", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, campaign_type: "lead_followup" }),
      });
    } finally {
      setCallingId(null);
    }
  };

  /* ── Empty / loading states ──────────────────────────────────────────── */
  if (!workspaceId) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("noWorkspace", { defaultValue: "No workspace" })}
          description={t("selectWorkspace", { defaultValue: "Select or create a workspace to view the dashboard." })}
        />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
        <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-44 rounded-2xl skeleton-shimmer border border-[var(--border-default)]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl skeleton-shimmer border border-[var(--border-default)]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-56 rounded-2xl skeleton-shimmer border border-[var(--border-default)]" />
          <div className="h-56 rounded-2xl skeleton-shimmer border border-[var(--border-default)]" />
        </div>
      </div>
    );
  }

  const pctMin = data.minutes_limit > 0 ? Math.min(100, Math.round((data.minutes_used / data.minutes_limit) * 100)) : 0;
  const usageRatio = data.minutes_limit > 0 ? data.minutes_used / data.minutes_limit : 0;
  const hasSignal =
    data.calls_answered > 0 || data.appointments_booked > 0 || data.follow_ups_sent > 0 || data.revenue_recovered_cents > 0;

  const kpis = [
    {
      label: t("kpis.callsHandled", { defaultValue: "Calls handled" }),
      value: data.calls_answered,
      sub: data.calls_answered === 0 && !hasSignal ? "Ready to execute" : data.missed_calls_recovered > 0 ? `${data.missed_calls_recovered} recovered` : undefined,
      icon: Phone,
      accent: "var(--accent-primary)",
    },
    {
      label: t("kpis.appointmentsBooked", { defaultValue: "Opportunities created" }),
      value: data.appointments_booked,
      sub: data.appointments_booked === 0 && !hasSignal ? "Booked automatically from calls" : data.conversion_rate > 0 ? `${data.conversion_rate}% conversion` : undefined,
      icon: CalendarCheck,
      accent: "var(--accent-secondary)",
    },
    {
      label: t("kpis.recovered", { defaultValue: "Revenue impact" }),
      value: fmtMoney(data.revenue_recovered_cents),
      sub: data.revenue_recovered_cents === 0 && !hasSignal ? "Revenue tracked automatically" : data.revenue_trend_pct !== 0 ? `${data.revenue_trend_pct > 0 ? "+" : ""}${data.revenue_trend_pct}% vs last month` : undefined,
      icon: TrendingUp,
      accent: "var(--accent-warning)",
    },
    {
      label: t("kpis.followUpsSent", { defaultValue: "Recovery actions" }),
      value: data.follow_ups_sent,
      sub: data.follow_ups_sent === 0 && !hasSignal ? "Recovery sequences active" : data.qualified_leads > 0 ? `${data.qualified_leads} qualified leads` : undefined,
      icon: MailCheck,
      accent: "var(--accent-indigo, #4F46E5)",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      {/* ── Fetch error banner ──────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-5 py-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t("errors.loadFailed", { defaultValue: "Dashboard data could not be loaded" })}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {t("errors.loadFailedDesc", { defaultValue: "Check your connection and try again." })}
            </p>
            <button
              onClick={() => load(true)}
              className="mt-3 px-3 py-1.5 text-xs font-medium bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-subtle)]/80 transition-colors"
            >
              {t("actions.tryAgain", { defaultValue: "Try Again" })}
            </button>
          </div>
        </div>
      )}

      {/* ── Phone warning ──────────────────────────────────────────────── */}
      {data?.phone_number_configured === false && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t("phoneWarning.title", { defaultValue: "Phone number not connected" })}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {t("phoneWarning.description", { defaultValue: "Your operator isn't connected yet." })}{" "}
              <Link href="/app/settings/phone" className="text-[var(--accent-primary)] font-medium hover:underline">
                {t("phoneWarning.cta", { defaultValue: "Connect a number" })}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {t("title", { defaultValue: "Revenue Command Center" })}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("subtitle", { defaultValue: "Your autonomous revenue operator, always on." })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <NotificationCenter workspaceId={workspaceId} />
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors active:scale-[0.97]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {t("actions.refresh", { defaultValue: "Refresh" })}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("actions.updatedAt", { defaultValue: "Updated" })} {fmtLastUpdated(lastUpdated, t)}
            </p>
          )}
        </div>
      </div>

      {/* ── Revenue hero card ──────────────────────────────────────────── */}
      <section className="metric-hero p-6 md:p-8" data-product-tour="revenueMetric">
        {/* Minutes warning */}
        {usageRatio >= 0.8 && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
              usageRatio >= 1
                ? "border-red-500/30 bg-red-500/[0.06]"
                : "border-amber-500/30 bg-amber-500/[0.06]"
            }`}
          >
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${usageRatio >= 1 ? "text-red-500" : "text-amber-500"}`} />
            <div>
              <p className="text-sm text-[var(--text-primary)]">
                {t("minutesUsed", { defaultValue: "You've used" })}{" "}
                <span className="font-semibold tabular-nums">
                  {data.minutes_used}/{data.minutes_limit}
                </span>{" "}
                {t("minutesThisMonth", { defaultValue: "minutes this month." })}{" "}
                <Link href="/app/settings/billing" className="text-[var(--accent-primary)] font-semibold hover:underline">
                  {t("actions.upgrade", { defaultValue: "Upgrade" })}
                </Link>
              </p>
              {usageRatio >= 1 && (
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {t("overage", { defaultValue: "Additional usage is billed at your plan's overage rate." })}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {t("revenueLabel", { defaultValue: "Revenue recovered" })}
            </p>
            <div className="mt-2.5 flex items-baseline gap-3">
              <h2 className="text-3xl md:text-[2.75rem] font-bold text-emerald-500 dark:text-emerald-400 tabular-nums tracking-tight leading-none">
                {fmtMoney(data.revenue_recovered_cents)}
              </h2>
              {data.revenue_trend_pct !== 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full ${
                    data.revenue_trend_pct >= 0
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "text-red-600 dark:text-red-400 bg-red-500/10"
                  }`}
                >
                  {data.revenue_trend_pct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(data.revenue_trend_pct)}%
                </span>
              )}
            </div>
          </div>

          {/* Minutes meter */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--text-tertiary)]">{t("minutesLabel", { defaultValue: "Minutes" })}</span>
                <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                  {data.minutes_used}/{data.minutes_limit}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-bar-fill ${
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
          </div>
        </div>

        {/* Pre-signal contextual guidance — shows when product is set up but no calls yet */}
        {!hasSignal && data.revenue_recovered_cents === 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] px-5 py-4">
            <CalendarCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t("readyToGo.title", { defaultValue: "Your autonomous operator is ready to execute" })}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {t("readyToGo.body", { defaultValue: "Revenue, calls, and appointments will update in real time as your operator handles calls. Make a test call to see it in action, or forward your business number to go live." })}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Link href="/app/agents" className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                  {t("readyToGo.testCall", { defaultValue: "Test your agent" })}
                </Link>
                <span className="text-[var(--text-tertiary)]">·</span>
                <Link href="/app/settings/phone" className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                  {t("readyToGo.goLive", { defaultValue: "Go live with your number" })}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Usage warning — show at 80%+ minute usage */}
        {data && data.minutes_limit > 0 && data.minutes_used >= data.minutes_limit * 0.8 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-5 py-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {data.minutes_used >= data.minutes_limit
                  ? t("usageWarning.limitReached", { defaultValue: "Minute limit reached" })
                  : t("usageWarning.approaching", { defaultValue: "Approaching minute limit" })}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {t("usageWarning.used", { defaultValue: `${data.minutes_used} of ${data.minutes_limit} minutes used this cycle.` })}{" "}
                <Link href="/app/settings/billing" className="text-[var(--accent-primary)] font-medium hover:underline">
                  {data.minutes_used >= data.minutes_limit
                    ? t("usageWarning.buyMore", { defaultValue: "Buy more minutes" })
                    : t("usageWarning.manage", { defaultValue: "Manage usage" })}
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Onboarding checklist — sequential numbered steps */}
        {!hasSignal && (
          <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("getStarted", { defaultValue: "Get started" })}</h3>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                {[!!data.agent_configured, !!data.phone_number_configured].filter(Boolean).length}/4 complete
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">{t("getStartedSubtitle", { defaultValue: "Complete these steps to go live — takes about 5 minutes" })}</p>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                  style={{ width: `${([!!data.agent_configured, !!data.phone_number_configured].filter(Boolean).length / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Required steps */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)] mb-3">Required to go live</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {[
                {
                  step: 1,
                  href: data.agent_configured ? "/app/agents" : "/app/agents/new",
                  icon: Bot,
                  title: t("onboarding.createAgent.title", { defaultValue: "Create your AI operator" }),
                  desc: t("onboarding.createAgent.description", { defaultValue: "Choose a template and customize your operator's voice and personality" }),
                  done: !!data.agent_configured,
                },
                {
                  step: 2,
                  href: "/app/settings/phone",
                  icon: Phone,
                  title: t("onboarding.connectNumber.title", { defaultValue: "Connect a number" }),
                  desc: t("onboarding.connectNumber.description", { defaultValue: "Get a phone number for your AI to answer" }),
                  done: !!data.phone_number_configured,
                },
              ].map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className={`onboard-card group flex flex-col ${item.done ? "opacity-70" : "ring-1 ring-[var(--accent-primary)]/20"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    {item.done ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary-subtle)] flex items-center justify-center">
                        <span className="text-sm font-bold text-[var(--accent-primary)]">{item.step}</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                  <h4 className={`font-semibold text-sm ${item.done ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"}`}>{item.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>

            {/* Recommended steps */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] mb-3">Recommended</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  step: 3,
                  href: "/app/knowledge",
                  icon: MessageSquare,
                  title: t("onboarding.addKnowledge.title", { defaultValue: "Add your FAQs" }),
                  desc: t("onboarding.addKnowledge.description", { defaultValue: "Teach your agent about your business" }),
                  done: false,
                },
                {
                  step: 4,
                  href: "/app/agents",
                  icon: PhoneCall,
                  title: t("onboarding.makeTestCall.title", { defaultValue: "Make a test call" }),
                  desc: t("onboarding.makeTestCall.description", { defaultValue: "Call your number to hear your agent in action" }),
                  done: false,
                },
              ].map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className={`onboard-card group flex flex-col ${item.done ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    {item.done ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                        <span className="text-sm font-bold text-[var(--text-tertiary)]">{item.step}</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                  <h4 className={`font-semibold text-sm ${item.done ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"}`}>{item.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Revenue Recovery Score Card (HERO) ─────────────────────────── */}
      <Suspense fallback={null}>
        <motion.div
          className="grid lg:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <RecoveryScoreCard workspaceId={workspaceId} />
          </motion.div>
        </motion.div>
      </Suspense>

      {/* ── Setup Health Card ──────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <SetupHealthCard workspaceId={workspaceId} />
      </Suspense>

      {/* ── Autonomous Briefing: "Since You Were Away" ─────────────────── */}
      <Suspense fallback={null}>
        <AutonomousBriefing workspaceId={workspaceId} />
      </Suspense>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {kpis.map((k) => (
          <motion.div
            key={k.label}
            className="kpi-card"
            variants={staggerItem}
            style={{
              "--kpi-accent": k.accent,
            } as React.CSSProperties}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${k.accent} 8%, transparent)`,
                  boxShadow: `0 1px 4px color-mix(in srgb, ${k.accent} 8%, transparent), inset 0 0 0 1px color-mix(in srgb, ${k.accent} 12%, transparent)`,
                }}
              >
                <k.icon className="w-[18px] h-[18px]" style={{ color: k.accent }} strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight leading-none">
              {typeof k.value === "string" ? k.value : k.value.toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-2 tracking-wide">{k.label}</p>
            {k.sub && (
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{k.sub}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ── AI Recommendations Card ────────────────────────────────────── */}
      <Suspense fallback={<CardSkeleton />}>
        <RecommendationsCard workspaceId={workspaceId} />
      </Suspense>

      {/* ── Revenue Leakage Radar ─────────────────────────────────────── */}
      {(data.missed_calls_today > 0 || data.no_shows_this_week > 0 || data.stale_leads > 0 || data.pending_follow_ups > 0) && (
        <section className="dash-section p-5 md:p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Revenue at risk</h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
              {[data.missed_calls_today, data.no_shows_this_week, data.stale_leads, data.pending_follow_ups].filter(v => v > 0).length} opportunities
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.missed_calls_today > 0 && (
              <Link href="/app/calls" className="group flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-amber-500/40 p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{data.missed_calls_today}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Unanswered revenue opportunities</p>
                  <p className="text-[11px] text-amber-500 font-medium mt-1 group-hover:underline">Recover now →</p>
                </div>
              </Link>
            )}
            {data.no_shows_this_week > 0 && (
              <Link href="/app/contacts" className="group flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-amber-500/40 p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{data.no_shows_this_week}</p>
                  <p className="text-xs text-[var(--text-secondary)]">No-shows this week</p>
                  <p className="text-[11px] text-amber-500 font-medium mt-1 group-hover:underline">Re-engage →</p>
                </div>
              </Link>
            )}
            {data.stale_leads > 0 && (
              <Link href="/app/contacts?filter=stale" className="group flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-amber-500/40 p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{data.stale_leads}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Stale leads (7+ days)</p>
                  <p className="text-[11px] text-amber-500 font-medium mt-1 group-hover:underline">Reactivate →</p>
                </div>
              </Link>
            )}
            {data.pending_follow_ups > 0 && (
              <Link href="/app/follow-ups" className="group flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-amber-500/40 p-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <MailCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{data.pending_follow_ups}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Pending follow-ups</p>
                  <p className="text-[11px] text-amber-500 font-medium mt-1 group-hover:underline">Send now →</p>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Two-column: Needs attention + Activity ─────────────────────── */}
      <motion.div
        className="grid lg:grid-cols-2 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Needs attention */}
        <motion.section className="dash-section p-5 md:p-6" data-product-tour="needsAttentionQueue" variants={staggerItem}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--accent-warning)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("needsAttention.title", { defaultValue: "Next agent actions" })}
              </h2>
              {data.needs_attention.length > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-warning-subtle)] text-[var(--accent-warning)]">
                  {data.needs_attention.length}
                </span>
              )}
            </div>
            <Link
              href="/app/leads"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t("viewAll", { defaultValue: "View all" })}
            </Link>
          </div>
          {data.needs_attention.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("needsAttention.empty", { defaultValue: "Nothing needs your action right now." })}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/app/campaigns" className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                  {t("needsAttention.launchCampaign", { defaultValue: "Launch a campaign" })}
                </Link>
                <span className="text-[var(--text-tertiary)]">·</span>
                <Link href="/app/contacts" className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                  {t("needsAttention.importContacts", { defaultValue: "Import contacts" })}
                </Link>
              </div>
            </div>
          ) : (
            <motion.ul
              className="space-y-2"
              variants={staggerFast}
              initial="initial"
              animate="animate"
            >
              {data.needs_attention.slice(0, 7).map((item) => (
                <motion.li key={item.id} className="attention-item px-4 py-3" variants={staggerItem}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/app/leads?highlight=${encodeURIComponent(item.id)}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors truncate block"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.reason}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={callingId === item.id}
                        onClick={() => void onCall(item.id)}
                      >
                        <Phone className="w-3.5 h-3.5 mr-1" />
                        {t("call", { defaultValue: "Call" })}
                      </Button>
                      <Link href="/app/inbox">
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-3 text-xs">
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          {t("text", { defaultValue: "Text" })}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.section>

        {/* Live call feed with Suspense fallback */}
        <motion.section variants={staggerItem}>
          <Suspense fallback={<CardSkeleton />}>
            <LiveCallFeed workspaceId={workspaceId} />
          </Suspense>
        </motion.section>
      </motion.div>

      {/* ── Active campaigns ───────────────────────────────────────────── */}
      <section
        className="dash-section p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("activeCampaigns.title", { defaultValue: "Active recovery campaigns" })}
            </h2>
          </div>
          <Link
            href="/app/campaigns"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline"
          >
            {t("activeCampaigns.create", { defaultValue: "Create campaign" })}
          </Link>
        </div>
        {data.campaigns.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("noCampaigns", { defaultValue: "No active campaigns. Launch one from Campaigns." })}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.campaigns.map((c) => (
              <Link
                key={c.id}
                href="/app/campaigns"
                className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-xs)] p-4 transition-[border-color,box-shadow,transform]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {c.name}
                  </p>
                  <ChevronRight className="w-4 h-4 text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold tabular-nums text-[var(--text-primary)]">{c.enrolled}</span> {t("campaigns.contacts", { defaultValue: "contacts" })}
                  </span>
                  <span className="text-[var(--border-default)]">&middot;</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold tabular-nums text-emerald-500">{c.booked}</span> {t("campaigns.booked", { defaultValue: "booked" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Voice Intelligence + A/B Testing ──────────────────────────── */}
      <motion.div
        className="grid lg:grid-cols-2 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Suspense fallback={<CardSkeleton />}><IntelligenceCard /></Suspense>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Suspense fallback={<CardSkeleton />}><VoiceABTestCard /></Suspense>
        </motion.div>
      </motion.div>

      {/* ── Call Recordings ────────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Suspense fallback={<CardSkeleton />}><CallRecordingsCard /></Suspense>
        </motion.div>
      </motion.div>
    </div>
  );
}

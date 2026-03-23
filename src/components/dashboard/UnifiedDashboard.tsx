"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  Activity,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { track } from "@/lib/analytics/posthog";
import { safeGetItem, safeSetItem } from "@/lib/client/safe-storage";

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
  phone_number_configured?: boolean;
  needs_attention: { id: string; name: string; reason: string; phone?: string | null }[];
  activity: { id: string; at: string; line: string }[];
  campaigns: { id: string; name: string; status: string; enrolled: number; booked: number }[];
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
  minutes_limit: 500,
  needs_attention: [],
  activity: [],
  campaigns: [],
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

/* ──────────────────────────────────────────────────────────────────────── */

export function UnifiedDashboard() {
  const t = useTranslations("dashboard");
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Summary | null) => setData(j ?? { ...EMPTY }))
      .catch(() => setData({ ...EMPTY }))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
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
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-[var(--bg-hover)]" />
        <div className="h-44 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-56 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
          <div className="h-56 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
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
      sub: `${data.inbound_calls ?? 0} in \u00b7 ${data.outbound_calls ?? 0} out`,
      icon: Phone,
      accent: "var(--accent-primary)",
    },
    {
      label: t("kpis.appointmentsBooked", { defaultValue: "Appointments booked" }),
      value: data.appointments_booked,
      sub: data.conversion_rate > 0 ? `${data.conversion_rate}% conversion` : undefined,
      icon: CalendarCheck,
      accent: "var(--accent-secondary)",
    },
    {
      label: t("kpis.recovered", { defaultValue: "Calls recovered" }),
      value: data.missed_calls_recovered ?? 0,
      sub: data.qualified_leads > 0 ? `${data.qualified_leads} qualified` : undefined,
      icon: TrendingUp,
      accent: "var(--accent-warning)",
    },
    {
      label: t("kpis.followUpsSent", { defaultValue: "Follow-ups sent" }),
      value: data.follow_ups_sent,
      sub: undefined,
      icon: MailCheck,
      accent: "var(--accent-indigo, #4F46E5)",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      {/* ── Phone warning ──────────────────────────────────────────────── */}
      {data?.phone_number_configured === false && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Phone number not connected
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Your AI can&apos;t receive calls yet.{" "}
              <Link href="/app/settings/phone" className="text-[var(--accent-primary)] font-medium hover:underline">
                Connect a number
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
          {t("dashboard", { defaultValue: "Dashboard" })}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          This month&apos;s performance at a glance
        </p>
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
                  {t("upgrade", { defaultValue: "Upgrade" })}
                </Link>
              </p>
              {usageRatio >= 1 && (
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Additional usage is billed at your plan&apos;s overage rate.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              Revenue recovered
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <h2 className="text-3xl md:text-4xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums tracking-tight">
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
                <span className="text-xs text-[var(--text-tertiary)]">Minutes</span>
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

        {/* Onboarding cards */}
        {!hasSignal && (
          <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Get started</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  href: "/app/settings/phone",
                  icon: Phone,
                  title: "Connect a number",
                  desc: "Set up your phone number to start receiving calls",
                },
                {
                  href: "/app/settings/agent",
                  icon: Bot,
                  title: "Configure your agent",
                  desc: "Customize how your AI handles calls",
                },
                {
                  href: "/app/settings/phone",
                  icon: PhoneCall,
                  title: "Make a test call",
                  desc: "Call your number from any phone to test it",
                },
              ].map((step) => (
                <Link
                  key={step.href + step.title}
                  href={step.href}
                  className="onboard-card group flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary-subtle)] flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)]">{step.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{step.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="kpi-card"
            style={{ "--kpi-accent": k.accent } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${k.accent} 10%, transparent)` }}
              >
                <k.icon className="w-4 h-4" style={{ color: k.accent }} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
              {k.value.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">{k.label}</p>
            {k.sub && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{k.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Two-column: Needs attention + Activity ─────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs attention */}
        <section className="dash-section p-5 md:p-6" data-product-tour="needsAttentionQueue">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--accent-warning)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("needsAttention.title", { defaultValue: "Needs attention" })}
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
              View all
            </Link>
          </div>
          {data.needs_attention.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("needsAttention.empty", { defaultValue: "Nothing needs your action right now." })}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.needs_attention.slice(0, 7).map((item) => (
                <li key={item.id} className="attention-item px-4 py-3">
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
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity feed */}
        <section className="dash-section p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("activity.title", { defaultValue: "Today's activity" })}
              </h2>
            </div>
          </div>
          {data.activity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("activity.empty", { defaultValue: "Activity will show as calls and messages come in." })}
              </p>
            </div>
          ) : (
            <div className="space-y-0 max-h-72 overflow-y-auto pr-1">
              {data.activity.map((a) => (
                <div key={a.id} className="activity-item py-3">
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums">
                    {fmtTime(a.at)}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">{a.line}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Active campaigns ───────────────────────────────────────────── */}
      <section className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("activeCampaigns", { defaultValue: "Active outbound campaigns" })}
            </h2>
          </div>
          <Link
            href="/app/campaigns"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline"
          >
            {t("createCampaign", { defaultValue: "Create campaign" })}
          </Link>
        </div>
        {data.campaigns.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              No active campaigns. Launch one from Campaigns.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.campaigns.map((c) => (
              <Link
                key={c.id}
                href="/app/campaigns"
                className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-xs)] p-4 transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {c.name}
                  </p>
                  <ChevronRight className="w-4 h-4 text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold tabular-nums text-[var(--text-primary)]">{c.enrolled}</span> contacts
                  </span>
                  <span className="text-[var(--border-default)]">&middot;</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold tabular-nums text-emerald-500">{c.booked}</span> booked
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

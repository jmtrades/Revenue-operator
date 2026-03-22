"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Phone, MessageSquare, Megaphone, LayoutList, Bot, PhoneCall } from "lucide-react";
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

function fmtMoney(cents: number): string {
  if (cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function UnifiedDashboard() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
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
      .then((j: Summary | null) => {
        setData(
          j ?? {
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
          },
        );
      })
      .catch(() =>
        setData({
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
        }),
      )
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

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

    // Only notify for the first few items to avoid spamming.
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
            // Best-effort: notification failures shouldn't block the dashboard.
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

  if (!workspaceId) {
    return (
      <div className="p-6">
        <EmptyState title={t("noWorkspace", { defaultValue: "No workspace" })} description={t("selectWorkspace", { defaultValue: "Select or create a workspace to view the dashboard." })} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
          <div className="h-48 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
        </div>
      </div>
    );
  }

  const pctMin = data.minutes_limit > 0 ? Math.min(100, Math.round((data.minutes_used / data.minutes_limit) * 100)) : 0;
  const usageRatio = data.minutes_limit > 0 ? data.minutes_used / data.minutes_limit : 0;
  const hasSignal =
    data.calls_answered > 0 ||
    data.appointments_booked > 0 ||
    data.follow_ups_sent > 0 ||
    data.revenue_recovered_cents > 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {data?.phone_number_configured === false && (
        <div className="rounded-xl border border-red-600/40 dark:border-red-500/40 bg-red-600/10 dark:bg-red-500/10 px-4 py-3">
          <p className="text-sm text-[var(--text-primary)] font-semibold">
            You haven&apos;t connected a phone number yet. Your AI can&apos;t receive calls until you do.{" "}
            <Link href="/app/settings/phone" className="underline hover:opacity-80">
              Connect Number →
            </Link>
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
        <LayoutList className="w-4 h-4" />
        <span>{t("dashboard", { defaultValue: "Dashboard" })}</span>
      </div>

      {/* Hero */}
      <section
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 border-l-4 border-l-[var(--text-primary)]"
        data-product-tour="revenueMetric"
      >
        {usageRatio >= 0.8 && (
          <div className={`mb-4 rounded-xl border px-4 py-3 ${usageRatio >= 1 ? "border-red-600/40 dark:border-red-500/40 bg-red-600/10 dark:bg-red-500/10" : "border-amber-600/40 dark:border-amber-500/40 bg-amber-600/10 dark:bg-amber-500/10"}`}>
            <p className="text-sm text-[var(--text-primary)]">
              {t("minutesUsed", { defaultValue: "You've used" })}{" "}
              <span className="font-semibold tabular-nums">
                {data.minutes_used}/{data.minutes_limit}
              </span>{" "}
              {t("minutesThisMonth", { defaultValue: "minutes this month." })}{" "}
              <Link href="/app/settings/billing" className="underline font-semibold">
                {t("upgrade", { defaultValue: "Upgrade →" })}
              </Link>
            </p>
            {usageRatio >= 1 && (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                You&apos;ve exceeded your included minutes. Additional usage is billed at your plan&apos;s overage rate.
              </p>
            )}
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">This month</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">
            {t("revenueRecovered", { defaultValue: "Revenue recovered:" })} {fmtMoney(data.revenue_recovered_cents)}
          </h1>
          {data.revenue_trend_pct !== 0 && (
            <span className={`text-sm font-medium ${data.revenue_trend_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {data.revenue_trend_pct >= 0 ? "↑" : "↓"}
              {Math.abs(data.revenue_trend_pct)}% vs prior period (calls)
            </span>
          )}
        </div>
        {!hasSignal && (
          <div className="mt-6 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Get started with Recall Touch</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link href="/app/settings/phone" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-5 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <Phone className="w-6 h-6 text-[var(--accent-primary)] flex-shrink-0" />
                  <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">→</span>
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">Connect a Number</h4>
                <p className="text-sm text-[var(--text-secondary)]">Set up your phone number to start receiving calls</p>
              </Link>
              <Link href="/app/settings/agent" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-5 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <Bot className="w-6 h-6 text-[var(--accent-primary)] flex-shrink-0" />
                  <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">→</span>
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">Configure Your Agent</h4>
                <p className="text-sm text-[var(--text-secondary)]">Customize how your AI handles calls</p>
              </Link>
              <Link href="/app/settings/phone" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-5 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <PhoneCall className="w-6 h-6 text-[var(--accent-primary)] flex-shrink-0" />
                  <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">→</span>
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">Make a Test Call</h4>
                <p className="text-sm text-[var(--text-secondary)]">Call your connected number from any phone</p>
              </Link>
            </div>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("kpis.callsHandled", { defaultValue: "Calls answered" }), value: data.calls_answered, sub: `${data.inbound_calls ?? 0} in · ${data.outbound_calls ?? 0} out` },
            { label: t("kpis.appointmentsBooked", { defaultValue: "Appts booked" }), value: data.appointments_booked, sub: data.conversion_rate > 0 ? `${data.conversion_rate}% conversion` : undefined },
            { label: t("kpis.recovered", { defaultValue: "Recovered" }), value: data.missed_calls_recovered ?? 0, sub: data.qualified_leads > 0 ? `${data.qualified_leads} qualified` : undefined },
            { label: t("kpis.followUpsSent", { defaultValue: "Follow-ups sent" }), value: data.follow_ups_sent, sub: undefined },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] px-4 py-3">
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{k.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{k.label}</p>
              {k.sub && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>
        {/* Minutes usage */}
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="tabular-nums font-medium">{data.minutes_used}/{data.minutes_limit} {t("kpis.minutes", { defaultValue: "minutes" })}</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pctMin >= 100 ? "bg-red-600 dark:bg-red-500" : pctMin >= 80 ? "bg-amber-600 dark:bg-amber-500" : "bg-green-600 dark:bg-green-500"
            }`}
            style={{ width: `${pctMin}%` }}
          />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
          data-product-tour="needsAttentionQueue"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            {t("needsAttention.title", { defaultValue: "Needs attention" })} {data.needs_attention.length > 0 ? `(${data.needs_attention.length})` : ""}
          </h2>
          {data.needs_attention.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("needsAttention.empty", { defaultValue: "Nothing needs your action right now." })}</p>
          ) : (
            <ul className="space-y-3">
              {data.needs_attention.slice(0, 7).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/app/leads?highlight=${encodeURIComponent(item.id)}`}
                      className="text-sm font-medium text-[var(--text-primary)] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)]">{item.reason}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2"
                      disabled={callingId === item.id}
                      onClick={() => void onCall(item.id)}
                    >
                      <Phone className="w-3.5 h-3.5 mr-1" />
                      {t("call", { defaultValue: "Call" })}
                    </Button>
                    <Link href={`/app/inbox`}>
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        {t("text", { defaultValue: "Text" })}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/leads" className="inline-block mt-3 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            {t("viewAll", { defaultValue: "View all" })} →
          </Link>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t("activity.title", { defaultValue: "Today's activity" })}</h2>
          {data.activity.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("activity.empty", { defaultValue: "Activity will show as calls and messages come in." })}</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.activity.map((a) => (
                <li key={a.id} className="text-sm border-b border-[var(--border-default)] pb-2">
                  <span className="text-[var(--text-secondary)] text-xs">{fmtTime(a.at)}</span>
                  <p className="text-[var(--text-tertiary)]">{a.line}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            {t("activeCampaigns", { defaultValue: "Active outbound campaigns" })}
          </h2>
          <Link href="/app/campaigns" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            {t("createCampaign", { defaultValue: "Create campaign →" })}
          </Link>
        </div>
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No active campaigns. Launch one from Campaigns.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4">
                <p className="font-medium text-[var(--text-primary)]">{c.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {c.enrolled} contacts · {c.booked} booked
                </p>
                <Link href={`/app/campaigns`} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mt-2 inline-block">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

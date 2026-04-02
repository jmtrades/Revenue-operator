"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { MetricsSkeleton } from "@/components/ui/MetricsSkeleton";
import Link from "next/link";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import {
  DollarSign, Phone, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, UserCheck, PhoneMissed, BarChart3, Download,
} from "lucide-react";

interface Summary {
  calls_last_7_days: number;
  appointments_total: number;
  appointments_upcoming: number;
}

interface Usage {
  calls: number;
  messages: number;
  calls_limit: number;
  messages_limit: number;
  calls_pct: number;
  messages_pct: number;
}

/* Revenue metrics (calculated from available data) */
function RevenueKPI({ label, value, prefix = "", suffix = "", trend, icon: Icon }: {
  label: string; value: number; prefix?: string; suffix?: string;
  trend?: { value: number; positive: boolean }; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border p-5 flex flex-col" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
          <Icon className="w-5 h-5 text-emerald-400" />
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trend.positive ? "text-emerald-400" : "text-red-400"}`}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {prefix}{value.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

function UsageBar({ label, used, limit, pct, t }: { label: string; used: number; limit: number; pct: number; t: (key: string) => string }) {
  const isWarning = pct >= 80;
  const isDanger = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
        <p className="text-sm font-medium tabular-nums" style={{ color: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "var(--text-primary)" }}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "var(--accent-primary)",
          }}
        />
      </div>
      {isDanger && (
        <p className="text-xs mt-1 text-red-400">
          {t("usage.limitReached")} <Link href="/dashboard/billing" className="underline">{t("usage.upgradeLink")}</Link>
        </p>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs mt-1 text-amber-400">
          {t("usage.approachingLimit")} <Link href="/dashboard/billing" className="underline">{t("usage.upgradeLink")}</Link>
        </p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setSummary(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback<Summary>(`/api/analytics/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<Usage>(`/api/usage?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ]).then(([r1, r2]) => {
      if (r1.data) setSummary(r1.data);
      if (r2.data) setUsage(r2.data);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  // Fetch workspace average job value (set in business settings)
  const [avgJobValue, setAvgJobValue] = useState<number>(0);
  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/me?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const val = data?.average_job_value ?? data?.metadata?.average_job_value;
        if (typeof val === "number" && val > 0) setAvgJobValue(val);
      })
      .catch(() => { /* use 0 — don't estimate */ });
  }, [workspaceId]);

  // Calculate revenue metrics from available data
  const metrics = useMemo(() => {
    if (!summary || !usage) return null;
    const callsAnswered = usage.calls;
    const appointmentsBooked = summary.appointments_total;
    const estimatedRevenue = avgJobValue > 0 ? appointmentsBooked * avgJobValue : 0;
    const conversionRate = callsAnswered > 0 ? Math.round((appointmentsBooked / callsAnswered) * 100) : 0;

    return {
      estimatedRevenue,
      callsAnswered,
      appointmentsBooked,
      conversionRate,
      hasJobValue: avgJobValue > 0,
      weeklyRevenue: avgJobValue > 0 ? Math.round(estimatedRevenue / 4) : 0,
    };
  }, [summary, usage, avgJobValue]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-5xl">
        <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.analyticsAppearHere")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />
        <MetricsSkeleton cards={6} />
      </div>
    );
  }

  const hasNoData = !summary && !usage;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("analytics.title")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("analytics.description")}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[var(--bg-hover)]"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          <Download className="w-4 h-4" />
          {t("analytics.export")}
        </button>
      </div>

      {hasNoData ? (
        <div className="py-16 px-6 text-center rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{t("empty.noDataYet")}</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            {t("analytics.emptyDescription")}
          </p>
          <Link href="/docs#call-forwarding" className="text-sm font-medium text-emerald-400">
            {t("analytics.setupCallForwarding")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Revenue Card */}
          <div className="rounded-2xl border p-6 md:p-8 relative overflow-hidden" style={{ borderColor: "var(--accent-primary)", background: "linear-gradient(135deg, rgba(34,197,94,0.05) 0%, var(--bg-surface) 100%)" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-400 mb-2">
                  {metrics?.hasJobValue ? t("analytics.totalRevenueRecovered") : "Estimated Revenue Impact"}
                </p>
                <p className="text-4xl md:text-5xl font-bold tabular-nums text-white">
                  {metrics?.hasJobValue ? `$${metrics.estimatedRevenue.toLocaleString()}` : `${metrics?.appointmentsBooked || 0} booked`}
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                  {metrics?.hasJobValue
                    ? `Based on ${metrics.appointmentsBooked} appointments × $${avgJobValue.toLocaleString()} avg job value`
                    : <>Set your average job value in <a href="/app/settings/business" className="underline text-emerald-400">Business Settings</a> to see revenue estimates</>}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-xs font-medium text-emerald-400">Live</span>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueKPI
              label="Calls Answered"
              value={metrics?.callsAnswered || 0}
              icon={Phone}
              trend={{ value: 12, positive: true }}
            />
            <RevenueKPI
              label="Appointments Booked"
              value={metrics?.appointmentsBooked || 0}
              icon={Calendar}
              trend={{ value: 8, positive: true }}
            />
            <RevenueKPI
              label="Conversion Rate"
              value={metrics?.conversionRate || 0}
              suffix="%"
              icon={TrendingUp}
              trend={{ value: 3, positive: true }}
            />
            <RevenueKPI
              label="Appointments Booked"
              value={metrics?.appointmentsBooked || 0}
              icon={Clock}
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <div className="flex items-center gap-2 mb-3">
                <PhoneMissed className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  After-Hours Calls Recovered
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {metrics?.callsAnswered || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Total calls handled by AI operator
              </p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Weekly Revenue
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                ${metrics?.weeklyRevenue.toLocaleString() || "0"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Average per week this month
              </p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Upcoming Appointments
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {summary?.appointments_upcoming || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Scheduled in the next 7 days
              </p>
            </div>
          </div>

          {/* Usage Section */}
          {usage && (
            <div className="rounded-xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
                Plan Usage This Period
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UsageBar label="Calls" used={usage.calls} limit={usage.calls_limit} pct={usage.calls_pct} t={t} />
                <UsageBar label="Messages" used={usage.messages} limit={usage.messages_limit} pct={usage.messages_pct} t={t} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Need more? Upgrade your plan for higher limits.
                </p>
                <Link href="/dashboard/billing" className="text-xs font-medium text-emerald-400">
                  Manage plan →
                </Link>
              </div>
            </div>
          )}

          {/* ROI Summary Card */}
          <div className="rounded-xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
              Your ROI Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Calls Answered</p>
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{metrics?.callsAnswered.toLocaleString() || "0"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Appointments Booked</p>
                <p className="text-lg font-semibold text-emerald-400">{metrics?.appointmentsBooked.toLocaleString() || "0"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{metrics?.hasJobValue ? "Est. Revenue" : "Conversion"}</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {metrics?.hasJobValue
                    ? `$${metrics.estimatedRevenue.toLocaleString()}`
                    : `${metrics?.conversionRate || 0}%`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

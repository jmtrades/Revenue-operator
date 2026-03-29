"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Printer,
  Phone,
  Calendar,
  MessageSquare,
  Clock,
  DollarSign,
  Shield,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Megaphone,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

/* ── Types ── */
interface RevenueDigestData {
  period: { start: string; end: string; label: string };
  recovery_score: { score: number; grade: string; trend: "up" | "down" | "stable" };
  revenue: {
    recovered_cents: number;
    at_risk_cents: number;
    projected_month_end_cents: number;
    growth_pct: number | null;
    daily_avg_cents: number;
  };
  operations: {
    calls_handled: number;
    calls_trend_pct: number | null;
    appointments_booked: number;
    appointments_trend_pct: number | null;
    follow_ups_executed: number;
    follow_ups_trend_pct: number | null;
    hours_saved: number;
  };
  top_wins: Array<{ title: string; description: string; impact_cents: number }>;
  top_risks: Array<{ title: string; description: string; estimated_loss_cents: number }>;
  recommended_actions: Array<{ title: string; description: string; priority: number }>;
  campaigns: Array<{
    name: string;
    status: string;
    enrolled: number;
    booked: number;
    conversion_pct: number;
  }>;
  generated_at: string;
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header skeleton */}
      <div className="mb-12 pb-8 border-b border-[var(--border)] skeleton-shimmer">
        <div className="h-10 w-96 rounded-lg bg-[var(--bg-hover)] mb-4" />
        <div className="h-4 w-64 rounded bg-[var(--bg-hover)] mb-2" />
        <div className="h-4 w-48 rounded bg-[var(--bg-hover)]" />
      </div>

      {/* Summary skeleton */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] skeleton-shimmer"
          >
            <div className="h-4 w-24 rounded bg-[var(--bg-hover)] mb-4" />
            <div className="h-8 w-32 rounded bg-[var(--bg-hover)] mb-2" />
            <div className="h-4 w-20 rounded bg-[var(--bg-hover)]" />
          </div>
        ))}
      </div>

      {/* Content skeletons */}
      {[1, 2, 3].map((section) => (
        <div
          key={section}
          className="mb-12 p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] skeleton-shimmer"
        >
          <div className="h-6 w-48 rounded bg-[var(--bg-hover)] mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 rounded bg-[var(--bg-hover)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendBadge({ value, trend }: { value: string; trend: number }) {
  if (trend === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-secondary)]">
        <span>{value}</span>
        <span className="text-[var(--border)]">—</span>
      </span>
    );
  }

  const isUp = trend > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  const color = isUp ? "text-[var(--accent-primary)]" : "text-[var(--accent-danger,#ef4444)]";
  const bgColor = isUp ? "bg-[var(--accent-primary)]/10" : "bg-[var(--accent-danger,#ef4444)]/10";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
        bgColor,
        color
      )}
    >
      <span>{value}</span>
      <Icon size={14} />
    </span>
  );
}

function GradeGetter(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: "A+", color: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" };
  if (score >= 80) return { letter: "A", color: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" };
  if (score >= 70) return { letter: "B+", color: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" };
  if (score >= 60) return { letter: "B", color: "text-[var(--text-secondary)] bg-[var(--bg-input)]" };
  if (score >= 50) return { letter: "C", color: "text-[var(--accent-warning,#f59e0b)] bg-[var(--accent-warning,#f59e0b)]/10" };
  return { letter: "D", color: "text-[var(--accent-danger,#ef4444)] bg-[var(--accent-danger,#ef4444)]/10" };
}

function getRecoveryVerdict(score: number, atRiskCents?: number): string {
  if (score > 80)
    return "Your autonomous revenue operator is performing in the top tier. Revenue recovery is on track and your pipeline is actively managed.";
  if (score >= 60) {
    const atRiskAmount = atRiskCents ? (atRiskCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "X,XXX";
    return `Solid operational performance with identified optimization opportunities. Addressing the risks below could unlock an additional $${atRiskAmount}/month.`;
  }
  const atRiskAmount = atRiskCents ? (atRiskCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "X,XXX";
  return `Revenue recovery requires immediate attention. $${atRiskAmount} in pipeline value is at risk without action.`;
}

export default function RevenueDigestPage() {
  const t = useTranslations();
  const ws = useWorkspaceSafe();
  const [digest, setDigest] = useState<RevenueDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDigest = async () => {
      if (!ws?.workspaceId) return;

      try {
        setLoading(true);
        const response = await apiFetch<RevenueDigestData>(
          `/api/reports/digest?workspace_id=${ws.workspaceId}`
        );

        if (response && response.period) {
          setDigest(response);
        } else {
          setError("Failed to load revenue digest");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load revenue digest"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDigest();
  }, [ws?.workspaceId]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="rounded-xl border border-[var(--accent-danger,#ef4444)]/20 bg-[var(--accent-danger,#ef4444)]/5 p-6">
          <p className="text-[var(--accent-danger,#ef4444)] font-medium">Error Loading Report</p>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center mx-auto mb-5">
            <TrendingUp className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Your Revenue Digest is Building
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6 leading-relaxed">
            This report auto-generates as your operator handles calls, books appointments, and creates revenue opportunities. Once you have activity, you&apos;ll see recovery scores, wins, risks, and recommended actions here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/app/agents"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] hover:opacity-90 transition-opacity"
            >
              <Phone size={16} />
              Make a test call
            </a>
            <a
              href="/app/campaigns/create"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
            >
              <Megaphone size={16} />
              Launch a campaign
            </a>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-6">
            Reports update automatically — no manual action needed
          </p>
        </div>
      </div>
    );
  }

  const grade = GradeGetter(digest.recovery_score.score);
  const verdict = getRecoveryVerdict(digest.recovery_score.score, digest.revenue.at_risk_cents);
  const revenueFmt = `$${(digest.revenue.recovered_cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const atRiskFmt = `$${(digest.revenue.at_risk_cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const projectionFmt = `$${(digest.revenue.projected_month_end_cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <Breadcrumbs items={[{ label: t("common.home"), href: "/app" }, { label: "Reports" }]} />
        {/* ════════════════════════════════════════════════════════════
            REPORT HEADER
            ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-2">
                Revenue Operator
              </h1>
              <p className="text-lg text-[var(--text-secondary)] font-medium">
                Revenue Operations Digest
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-colors print:hidden"
            >
              <Printer size={18} />
              <span className="text-sm font-medium">Print</span>
            </button>
          </div>

          {/* Period & Generated timestamp */}
          <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)] mb-6">
            <span>Period: {digest.period.label}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
            <span>Generated {new Date().toLocaleDateString()}</span>
          </div>

          {/* Branded accent line */}
          <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 1: EXECUTIVE SUMMARY
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-8 shadow-sm">
            {/* Recovery Score Card */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                    Recovery Score
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-5xl font-bold text-[var(--accent-primary)]">
                      {digest.recovery_score.score}
                    </div>
                    <div
                      className={cn(
                        "text-4xl font-bold px-4 py-2 rounded-xl",
                        grade.color
                      )}
                    >
                      {digest.recovery_score.grade}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <TrendBadge
                    value={digest.recovery_score.trend === "up" ? "↑" : digest.recovery_score.trend === "down" ? "↓" : "—"}
                    trend={digest.recovery_score.trend === "up" ? 1 : digest.recovery_score.trend === "down" ? -1 : 0}
                  />
                </div>
              </div>

              <p className="text-base text-[var(--text-primary)] leading-relaxed border-l-4 border-[var(--accent-primary)] pl-4">
                {verdict}
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-[var(--border-default)]">
              {/* Revenue Recovered */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Revenue Recovered
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">{revenueFmt}</p>
                {digest.revenue.growth_pct != null && (
                <TrendBadge
                  value={`${Math.abs(digest.revenue.growth_pct)}%`}
                  trend={digest.revenue.growth_pct}
                />
              )}
              </div>

              {/* Revenue at Risk */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Revenue at Risk
                </p>
                <p className="text-3xl font-bold text-[var(--accent-warning,#f59e0b)]">{atRiskFmt}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Requires attention
                </p>
              </div>

              {/* Month-end Projection */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  Month-end Projection
                </p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{projectionFmt}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Current trajectory
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2: OPERATIONS PERFORMANCE
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Operations Performance
          </h2>

          {/* 4-Column Metric Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {/* Calls Handled */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Phone size={20} className="text-[var(--accent-primary)]" />
                <TrendBadge
                  value={`${Math.abs(digest.operations.calls_trend_pct ?? 0)}%`}
                  trend={digest.operations.calls_trend_pct ?? 0}
                />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                {digest.operations.calls_handled}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Calls Handled
              </p>
            </div>

            {/* Revenue Opportunities Created */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Target size={20} className="text-[var(--accent-primary)]" />
                <TrendBadge
                  value={`${Math.abs(digest.operations.appointments_trend_pct ?? 0)}%`}
                  trend={digest.operations.appointments_trend_pct ?? 0}
                />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                {digest.operations.appointments_booked}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Opportunities Created
              </p>
            </div>

            {/* Automated Recovery Actions */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Shield size={20} className="text-[var(--accent-primary)]" />
                <TrendBadge
                  value={`${Math.abs(digest.operations.follow_ups_trend_pct ?? 0)}%`}
                  trend={digest.operations.follow_ups_trend_pct ?? 0}
                />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                {digest.operations.follow_ups_executed}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Recovery Actions
              </p>
            </div>

            {/* Operator Hours Saved */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Clock size={20} className="text-[var(--accent-warning,#f59e0b)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  est.
                </span>
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                {digest.operations.hours_saved}h
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Hours Saved
              </p>
            </div>
          </div>

          {/* Summary Sentence */}
          <div className="bg-[var(--accent-primary)]/5 rounded-xl border border-[var(--accent-primary)]/10 p-4">
            <p className="text-sm text-[var(--text-primary)]">
              Your agent handled{" "}
              <span className="font-semibold">{digest.operations.calls_handled} calls</span>,
              created{" "}
              <span className="font-semibold">
                {digest.operations.appointments_booked} revenue opportunities
              </span>
              , and executed{" "}
              <span className="font-semibold">
                {digest.operations.follow_ups_executed} automated recovery actions
              </span>{" "}
              — saving approximately{" "}
              <span className="font-semibold">
                {digest.operations.hours_saved} hours
              </span>{" "}
              of manual work.
            </p>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3: TOP WINS
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Top Wins
          </h2>

          {digest.top_wins && digest.top_wins.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {digest.top_wins.map((win, idx) => (
                <div
                  key={`win-${idx}`}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <Trophy
                      size={24}
                      className="text-[var(--accent-warning,#f59e0b)] flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                        Win {idx + 1}
                      </p>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                        {win.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {win.description}
                  </p>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                      Estimated Impact
                    </p>
                    <p className="text-2xl font-bold text-[var(--accent-primary)]">
                      $
                      {(win.impact_cents / 100).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--accent-warning,#f59e0b)]/20 bg-[var(--accent-warning,#f59e0b)]/5 p-6">
              <p className="text-[var(--text-primary)] font-medium">
                Building momentum — wins will appear as your operator handles more
                calls.
              </p>
            </div>
          )}
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 4: TOP RISKS
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Top Risks
          </h2>

          {digest.top_risks && digest.top_risks.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {digest.top_risks.map((risk, idx) => (
                <div
                  key={`risk-${idx}`}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--accent-danger,#ef4444)]/20 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle
                      size={24}
                      className="text-[var(--accent-danger,#ef4444)] flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[var(--accent-danger,#ef4444)] uppercase tracking-wide">
                        Risk {idx + 1}
                      </p>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                        {risk.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {risk.description}
                  </p>

                  <div className="pt-4 border-t border-[var(--accent-danger,#ef4444)]/10">
                    <p className="text-xs font-medium text-[var(--accent-danger,#ef4444)] uppercase tracking-wide mb-1">
                      At Risk
                    </p>
                    <p className="text-2xl font-bold text-[var(--accent-danger,#ef4444)]">
                      $
                      {(risk.estimated_loss_cents / 100).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-6">
              <p className="text-[var(--text-primary)] font-medium">
                No critical risks identified. Your pipeline is healthy.
              </p>
            </div>
          )}
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 5: RECOMMENDED ACTIONS
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Recommended Actions
          </h2>

          {digest.recommended_actions && digest.recommended_actions.length > 0 ? (
            <div className="space-y-4">
              {digest.recommended_actions.map((action, idx) => (
                <div
                  key={`action-${idx}`}
                  className="flex items-start gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--accent-primary)]">
                      {action.priority}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6">
              <p className="text-[var(--text-secondary)] font-medium">
                No actions required at this time.
              </p>
            </div>
          )}
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 6: CAMPAIGN PERFORMANCE
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Campaign Performance
          </h2>

          {digest.campaigns && digest.campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">
                      Contacts
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">
                      Booked
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {digest.campaigns.map((campaign, idx) => {
                    const isTopPerformer = idx === 0 && digest.campaigns && digest.campaigns.length > 0;
                    return (
                      <tr
                        key={`camp-${idx}`}
                        className={cn(
                          "border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors",
                          isTopPerformer && "bg-[var(--accent-warning,#f59e0b)]/5"
                        )}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)]">
                              {campaign.name}
                            </span>
                            {isTopPerformer && (
                              <Star size={16} className="text-[var(--accent-warning,#f59e0b)]" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)]">
                          {campaign.enrolled}
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)]">
                          {campaign.booked}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                              campaign.conversion_pct > 10
                                ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                : "bg-[var(--bg-input)] text-[var(--text-secondary)]"
                            )}
                          >
                            {campaign.conversion_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6">
              <p className="text-[var(--text-secondary)] font-medium">
                Campaign data will appear as your first campaign launches.
              </p>
            </div>
          )}
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            SECTION: ABOUT THIS REPORT
            ════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mb-12 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] p-6"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            About This Report
          </h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <p>
              • This Revenue Operations Digest is auto-generated by Revenue Operator&apos;s intelligence engine.
            </p>
            <p>
              • It aggregates data from your AI voice agent, automated follow-up sequences, campaign execution, and pipeline management into a single strategic view.
            </p>
            <p>
              • Revenue Recovery Score™ is a proprietary compound metric measuring five dimensions of revenue recovery performance.
            </p>
            <p>
              • All dollar estimates use a $250 average deal value. Adjust in Settings &gt; Business to refine projections.
            </p>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            REPORT FOOTER
            ════════════════════════════════════════════════════════════ */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 pt-8 border-t border-[var(--border)] text-center"
        >
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-medium">
            Revenue Operator — Autonomous Revenue Operations
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            This digest is generated from live operational data and reflects real-time platform intelligence.
          </p>
        </motion.footer>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            background: white;
          }

          button,
          .print\:hidden {
            display: none !important;
          }

          .max-w-6xl {
            max-width: 100%;
          }

          h1,
          h2 {
            page-break-after: avoid;
          }

          section {
            page-break-inside: avoid;
          }

          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}

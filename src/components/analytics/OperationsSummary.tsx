"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch, ApiError } from "@/lib/api";

interface OperationMetrics {
  avg_response_time: number;
  no_show_rate: number;
  reactivation_rate: number;
  follow_up_completion_rate: number;
}

interface OperationsSummaryProps {
  workspaceId: string;
  startDate?: string;
  endDate?: string;
}

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: number;
  isTrendPositive?: boolean;
}

function MetricCard({
  label,
  value,
  suffix,
  prefix,
  trend,
  isTrendPositive = true,
}: MetricCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="text-sm font-medium text-[var(--text-secondary)]">{prefix}</span>
          )}
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {Number.isFinite(value) ? value.toFixed(1) : "—"}
          </p>
          {suffix && (
            <span className="text-sm font-medium text-[var(--text-secondary)]">{suffix}</span>
          )}
        </div>
      </div>

      {hasTrend && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isTrendPositive
              ? "text-[#16A34A]"
              : "text-[#DC2626]"
          }`}
        >
          {isTrendPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

export function OperationsSummary({
  workspaceId,
  startDate,
  endDate,
}: OperationsSummaryProps) {
  const t = useTranslations("operations");
  const [metrics, setMetrics] = useState<OperationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Build date params
        const params = new URLSearchParams({
          workspace_id: workspaceId,
        });

        // Use provided dates or default to last 30 days
        if (!startDate || !endDate) {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 30);

          const formatDate = (date: Date) => date.toISOString().split("T")[0];
          params.append("start_date", formatDate(start));
          params.append("end_date", formatDate(end));
        } else {
          params.append("start_date", startDate);
          params.append("end_date", endDate);
        }

        const response = await apiFetch<{
          metrics: Array<{
            response_time_avg_seconds: number | null;
            no_shows: number;
            no_shows_recovered: number;
            follow_ups_sent: number;
          }>;
          totals: {
            response_time_avg_seconds: number | null;
            no_shows: number;
            no_shows_recovered: number;
            follow_ups_sent: number;
            calls_answered: number;
          };
        }>(`/api/analytics/metrics?${params}`);

        if (!active) return;

        // Calculate operational metrics from totals
        const totals = response.totals;
        const totalLeads = 100; // placeholder - ideally from API

        const noShowRate =
          totals.calls_answered > 0
            ? (totals.no_shows / totals.calls_answered) * 100
            : 0;

        const reactivationRate =
          totals.no_shows > 0
            ? (totals.no_shows_recovered / totals.no_shows) * 100
            : 0;

        const followUpRate =
          totals.calls_answered > 0
            ? (totals.follow_ups_sent / totals.calls_answered) * 100
            : 0;

        setMetrics({
          avg_response_time: totals.response_time_avg_seconds || 0,
          no_show_rate: noShowRate,
          reactivation_rate: reactivationRate,
          follow_up_completion_rate: followUpRate,
        });
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load operations metrics");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [workspaceId, startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label={t("avgResponseTime")}
        value={metrics.avg_response_time}
        suffix="sec"
        isTrendPositive={false}
      />
      <MetricCard
        label={t("noShowRate")}
        value={metrics.no_show_rate}
        suffix="%"
        isTrendPositive={false}
      />
      <MetricCard
        label={t("reactivationRate")}
        value={metrics.reactivation_rate}
        suffix="%"
        isTrendPositive={true}
      />
      <MetricCard
        label={t("followUpRate")}
        value={metrics.follow_up_completion_rate}
        suffix="%"
        isTrendPositive={true}
      />
    </div>
  );
}

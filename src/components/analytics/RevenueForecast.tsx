"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch, ApiError } from "@/lib/api";

interface RevenueForecastProps {
  workspaceId: string;
}

interface ForecastData {
  current_revenue_cents: number;
  projected_revenue_cents: number;
  growth_rate_pct: number | null;
  daily_avg_cents: number;
  days_remaining: number;
  confidence: "high" | "medium" | "low";
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "Unknown";
  }
}

function getStatusText(current: number, projected: number): string {
  const monthStart = new Date();
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const daysInMonth = monthEnd.getUTCDate();
  const currentDay = monthStart.getUTCDate();
  const expectedRevenue = (current / currentDay) * daysInMonth;

  if (Math.abs(projected - expectedRevenue) < expectedRevenue * 0.1) {
    return "Tracking to target";
  } else if (projected > expectedRevenue) {
    return "Ahead of pace";
  } else {
    return "Below target — action needed";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Ahead of pace":
      return "text-[#16A34A]";
    case "Tracking to target":
      return "text-[#2563EB]";
    case "Below target — action needed":
      return "text-[#DC2626]";
    default:
      return "text-[var(--text-secondary)]";
  }
}

export function RevenueForecast({ workspaceId }: RevenueForecastProps) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const controller = new AbortController();

    apiFetch<ForecastData>(
      `/api/analytics/forecast?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        credentials: "include",
        timeout: 8000,
        retries: 1,
        signal: controller.signal as RequestInit["signal"],
      }
    )
      .then((forecast) => {
        setData(forecast);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[RevenueForecast] Error fetching forecast:", err);
        setError(err instanceof ApiError ? "Failed to load forecast" : "Error loading forecast");
        setData(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--text-tertiary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Revenue Trajectory</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="text" className="h-8" />
          <Skeleton variant="text" className="h-8" />
          <Skeleton variant="rectangular" className="h-2 rounded-full col-span-2" />
          <Skeleton variant="text" className="h-4" />
          <Skeleton variant="text" className="h-4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--text-tertiary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Revenue Trajectory</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Revenue forecasting activates after your first calls. Your trajectory, projections, and pace will appear here automatically.
        </p>
      </div>
    );
  }

  const status = getStatusText(data.current_revenue_cents, data.projected_revenue_cents);
  const statusColor = getStatusColor(status);
  const growthIsPositive = data.growth_rate_pct === null ? null : data.growth_rate_pct >= 0;

  // Calculate progress bar percentage (0 to 100%) — use stable UTC values to avoid hydration mismatch
  const monthStart = new Date();
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const daysInMonth = monthEnd.getUTCDate();
  const currentDay = monthStart.getUTCDate();
  const progressPct = Math.min(100, (currentDay / daysInMonth) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <Target className="w-5 h-5 text-[var(--text-tertiary)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Revenue Trajectory</h3>
      </div>

      {/* Current vs Projected Row */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Current Month Revenue */}
        <div className="flex flex-col">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Current Month
          </p>
          <div className="flex items-baseline gap-1">
            <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {formatCurrency(data.current_revenue_cents).replace("$", "")}
            </p>
          </div>
        </div>

        {/* Projected Month-End */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Projected Month-End
            </p>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-inset)] text-[var(--text-secondary)]">
              {getConfidenceLabel(data.confidence)}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <Target className="w-4 h-4 text-[var(--text-secondary)]" />
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {formatCurrency(data.projected_revenue_cents).replace("$", "")}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--text-secondary)]">Month Progress</p>
          <p className="text-xs font-medium text-[var(--text-secondary)]">{Math.round(progressPct)}%</p>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#2563EB]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Growth Rate & Daily Avg */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Daily Average */}
        <div className="rounded-lg bg-[var(--bg-inset)] p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Daily Average
          </p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(data.daily_avg_cents)}
          </p>
        </div>

        {/* Growth Rate */}
        <div className="rounded-lg bg-[var(--bg-inset)] p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Growth vs Prior Month
          </p>
          {data.growth_rate_pct !== null ? (
            <div className={`flex items-center gap-1 text-lg font-semibold`}>
              {growthIsPositive ? (
                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#DC2626]" />
              )}
              <span
                className={growthIsPositive ? "text-[#16A34A]" : "text-[#DC2626]"}
              >
                {growthIsPositive ? "+" : ""}{data.growth_rate_pct}%
              </span>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">—</p>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] p-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Status
          </p>
          <p className={`text-sm font-semibold ${statusColor}`}>{status}</p>
        </div>
        <p className="text-xs text-[var(--text-secondary)] text-right">
          {data.days_remaining} day{data.days_remaining === 1 ? "" : "s"} remaining
        </p>
      </div>
    </motion.div>
  );
}

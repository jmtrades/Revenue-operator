"use client";

import { useMemo } from "react";

interface UsageBarProps {
  used: number;
  limit: number;
  label?: string;
  showOverage?: boolean;
  overageUsed?: number;
  showPercentage?: boolean;
  compact?: boolean;
}

export function UsageBar({
  used,
  limit,
  label = "Minutes",
  showOverage = false,
  overageUsed = 0,
  showPercentage = true,
  compact = false,
}: UsageBarProps) {
  const percentage = useMemo(() => {
    return limit > 0 ? (used / limit) * 100 : 0;
  }, [used, limit]);

  const barColor = useMemo(() => {
    if (percentage > 100) return "bg-red-500";
    if (percentage > 90) return "bg-red-500";
    if (percentage > 75) return "bg-amber-500";
    return "bg-emerald-500";
  }, [percentage]);

  const barWidth = Math.min(100, percentage);
  const isWarning = percentage > 75;

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
            {used}/{limit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </p>
          {showOverage && overageUsed > 0 && (
            <p className="text-xs text-red-500 mt-0.5">
              +{overageUsed} overage
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
            {used}/{limit}
          </p>
          {showPercentage && (
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 tabular-nums">
              {Math.round(percentage)}% used
            </p>
          )}
        </div>
      </div>

      <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {isWarning && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {percentage >= 100
            ? "Limit exceeded. Overage charges may apply."
            : "Approaching limit. Consider upgrading."}
        </p>
      )}
    </div>
  );
}

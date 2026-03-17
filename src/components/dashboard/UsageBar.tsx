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

  const alertLevel = useMemo(() => {
    if (percentage > 100) return "exceeded";
    if (percentage > 90) return "critical";
    if (percentage > 75) return "warning";
    return "normal";
  }, [percentage]);

  const barColor = useMemo(() => {
    switch (alertLevel) {
      case "exceeded":
        return "bg-red-500";
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-amber-500";
      default:
        return "bg-white";
    }
  }, [alertLevel]);

  const barWidth = Math.min(100, percentage);

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white">{label}</span>
          <span className="text-xs text-zinc-400">
            {used}/{limit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {alertLevel !== "normal" && (
          <span className="text-[11px] text-zinc-500">
            {Math.round(percentage)}% used
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {showOverage && overageUsed > 0 && (
            <p className="text-xs text-red-400 mt-0.5">
              +{overageUsed} in overage
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {used}/{limit}
          </p>
          {showPercentage && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {Math.round(percentage)}% used
            </p>
          )}
        </div>
      </div>

      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {alertLevel === "warning" && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-200">
            Approaching limit. Consider upgrading your plan.
          </p>
        </div>
      )}

      {alertLevel === "critical" && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs font-medium text-red-200">
            Near or exceeded limit. Upgrade immediately to avoid service disruption.
          </p>
        </div>
      )}

      {alertLevel === "exceeded" && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs font-medium text-red-200">
            Limit exceeded. Overage charges will apply.
          </p>
        </div>
      )}
    </div>
  );
}

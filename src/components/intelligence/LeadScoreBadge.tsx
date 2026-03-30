"use client";

import { AlertCircle } from "lucide-react";

interface LeadScoreBadgeProps {
  urgency: number;
  intent: number;
  engagement: number;
  nextAction: string;
  riskFlags: string[];
}

function getTemperature(
  urgency: number,
  intent: number,
  engagement: number
): { label: string; bg: string; text: string } {
  const avg = (urgency + intent + engagement) / 3;
  if (avg >= 70) {
    return { label: "Hot", bg: "bg-red-500/20", text: "text-red-400" };
  }
  if (avg >= 50) {
    return { label: "Warm", bg: "bg-orange-500/20", text: "text-orange-400" };
  }
  if (avg >= 30) {
    return { label: "Cool", bg: "bg-blue-500/20", text: "text-blue-400" };
  }
  return { label: "Cold", bg: "bg-gray-500/20", text: "text-gray-400" };
}

function getActionIcon(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("call")) return "📞";
  if (lower.includes("email")) return "📧";
  if (lower.includes("sms") || lower.includes("message")) return "📱";
  if (lower.includes("follow")) return "↗";
  if (lower.includes("reactivat")) return "🔄";
  if (lower.includes("escalat")) return "🚨";
  if (lower.includes("book")) return "📅";
  return "→";
}

function hasRiskFlag(flags: string[]): { hasCritical: boolean; hasWarning: boolean } {
  const critical = flags.some((f) => f === "anger" || f === "opt_out");
  const warning = flags.some((f) => f === "going_cold" || f === "no_show_risk");
  return { hasCritical: critical, hasWarning: warning };
}

export function LeadScoreBadge({
  urgency,
  intent,
  engagement,
  nextAction,
  riskFlags,
}: LeadScoreBadgeProps) {
  const temp = getTemperature(urgency, intent, engagement);
  const icon = getActionIcon(nextAction);
  const { hasCritical, hasWarning } = hasRiskFlag(riskFlags);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border border-current/20 ${temp.bg} ${temp.text}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {temp.label}
      </div>

      <span className="text-xs text-[var(--text-secondary)]">·</span>

      <span className="text-xs font-medium text-[var(--text-primary)]">
        {icon} {nextAction}
      </span>

      {(hasCritical || hasWarning) && (
        <>
          <span className="text-xs text-[var(--text-secondary)]">·</span>
          <div
            className={`h-2 w-2 rounded-full ${
              hasCritical ? "bg-red-500" : "bg-orange-500"
            }`}
            title={
              hasCritical
                ? "Critical risk flags"
                : "Warning risk flags"
            }
          />
        </>
      )}
    </div>
  );
}

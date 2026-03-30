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

const ACTION_LABELS: Record<string, string> = {
  ask_clarification: "Clarifying needs",
  send_proof: "Sending proof",
  reframe_value: "Reframing value",
  book_call: "Booking call",
  schedule_call: "Scheduling call",
  schedule_followup: "Follow-up sequence",
  reactivate_later: "Queued reactivation",
  escalate_human: "Escalating",
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ");
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
  const actionLabel = getActionLabel(nextAction);
  const { hasCritical, hasWarning } = hasRiskFlag(riskFlags);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-current/20 ${temp.bg} ${temp.text}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        {temp.label}
      </div>

      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-violet-500/[0.08] text-[10px] font-medium text-violet-400">
        {actionLabel}
      </span>

      {(hasCritical || hasWarning) && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            hasCritical ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
          }`}
          title={riskFlags.join(", ")}
        >
          <AlertCircle className="w-2.5 h-2.5" />
          {hasCritical ? "risk" : "watch"}
        </span>
      )}
    </div>
  );
}

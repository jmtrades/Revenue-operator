/**
 * Record when a risk-surface incident was prevented (e.g. follow-up sent, confirmation sent).
 * Used for Reports "incidents prevented this week".
 */

import { getDb } from "@/lib/db/queries";

const REASON_TO_RISK: Record<string, string> = {
  silence_risk: "reply_window_expiring",
  decay_recovery: "cooling_conversation",
  attendance_protection: "no_show_risk",
  booking_qualified: "stalled_negotiation",
  ready_follow_up: "continuity_gap",
};

const ACTION_TO_RISK: Record<string, string> = {
  follow_up: "continuity_gap",
  clarifying_question: "continuity_gap",
  qualification_question: "continuity_gap",
  confirmation: "no_show_risk",
  reminder: "no_show_risk",
  book_cta: "stalled_negotiation",
  call_invite: "stalled_negotiation",
  booking: "stalled_negotiation",
};

export async function recordRiskIncidentPrevented(
  workspaceId: string,
  reasonCodeOrAction: string,
  options?: { leadId?: string; callSessionId?: string; detail?: Record<string, unknown> }
): Promise<void> {
  const riskType = REASON_TO_RISK[reasonCodeOrAction] ?? ACTION_TO_RISK[reasonCodeOrAction];
  if (!riskType) return;

  const db = getDb();
  try {
    await db.from("risk_surface_incidents").insert({
      workspace_id: workspaceId,
      risk_type: riskType,
      lead_id: options?.leadId ?? null,
      call_session_id: options?.callSessionId ?? null,
      detail: options?.detail ?? {},
    });
  } catch {
    // Non-blocking; table may not exist
  }
}

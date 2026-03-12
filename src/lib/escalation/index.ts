/**
 * Conditional Escalation Engine
 * Risk-based handoff: suggest instead of auto-send, notify assigned user, log escalation_reason.
 * System remains autonomous for normal leads.
 */

import { getDb } from "@/lib/db/queries";

export type EscalationTrigger =
  | "high_deal_value"
  | "vip_lead"
  | "anger_detected"
  | "negotiation_attempt"
  | "policy_sensitive"
  | "autonomy_assist_approval_required"
  | "guarantee_stagnation"
  | "emotional_complexity"
  | "ambiguous_meaning_outcome_critical"
  | "intent_conflicts_with_booking"
  | "legal_medical_risk"
  | "financial_risk"
  | "delivery_failed"
  | "system_integrity_violation"
  | "signal_unprocessable"
  | "progress_stalled";

export interface EscalationRules {
  enabled?: boolean;
  escalation_timeout_hours?: number;
  triggers?: {
    high_deal_value_threshold_cents?: number;
    vip_escalate?: boolean;
    anger_escalate?: boolean;
    negotiation_escalate?: boolean;
    policy_sensitive_escalate?: boolean;
  };
}

const DEFAULT_RULES: EscalationRules = {
  enabled: false,
  escalation_timeout_hours: 24,
  triggers: {
    high_deal_value_threshold_cents: 50000,
    vip_escalate: true,
    anger_escalate: true,
    negotiation_escalate: true,
    policy_sensitive_escalate: true,
  },
};

export function mergeEscalationRules(partial?: EscalationRules | null): EscalationRules {
  if (!partial) return DEFAULT_RULES;
  return {
    enabled: partial.enabled ?? DEFAULT_RULES.enabled,
    escalation_timeout_hours: partial.escalation_timeout_hours ?? DEFAULT_RULES.escalation_timeout_hours,
    triggers: { ...DEFAULT_RULES.triggers, ...partial.triggers },
  };
}

export async function isLeadInEscalationHold(leadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("escalation_logs")
    .select("hold_until")
    .eq("lead_id", leadId)
    .eq("holding_message_sent", true)
    .not("hold_until", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const holdUntil = (data as { hold_until?: string })?.hold_until;
  if (!holdUntil) return false;
  return new Date(holdUntil) > new Date();
}

export async function hasEscalationHoldExpired(leadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("escalation_logs")
    .select("hold_until")
    .eq("lead_id", leadId)
    .eq("holding_message_sent", true)
    .not("hold_until", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const holdUntil = (data as { hold_until?: string })?.hold_until;
  if (!holdUntil) return false;
  return new Date(holdUntil) <= new Date();
}

export interface EscalationCheckResult {
  shouldEscalate: boolean;
  reason?: EscalationTrigger;
  details?: string;
}

export async function checkEscalation(
  workspaceId: string,
  leadId: string,
  context: {
    dealValueCents?: number;
    isVip?: boolean;
    angerDetected?: boolean;
    negotiationDetected?: boolean;
    policySensitiveDetected?: boolean;
  }
): Promise<EscalationCheckResult> {
  const db = getDb();
  const { data: settingsRow } = await db
    .from("settings")
    .select("escalation_rules")
    .eq("workspace_id", workspaceId)
    .single();

  const rules = mergeEscalationRules(
    (settingsRow as { escalation_rules?: EscalationRules })?.escalation_rules ?? undefined
  );
  if (!rules.enabled) return { shouldEscalate: false };

  const t = rules.triggers ?? {};

  if (t.high_deal_value_threshold_cents != null && (context.dealValueCents ?? 0) >= t.high_deal_value_threshold_cents) {
    return {
      shouldEscalate: true,
      reason: "high_deal_value",
      details: `Deal value ${context.dealValueCents} exceeds threshold ${t.high_deal_value_threshold_cents}`,
    };
  }
  if (t.vip_escalate && context.isVip) {
    return { shouldEscalate: true, reason: "vip_lead", details: "VIP lead" };
  }
  if (t.anger_escalate && context.angerDetected) {
    return { shouldEscalate: true, reason: "anger_detected", details: "Anger detected in message" };
  }
  if (t.negotiation_escalate && context.negotiationDetected) {
    return { shouldEscalate: true, reason: "negotiation_attempt", details: "Negotiation attempt detected" };
  }
  if (t.policy_sensitive_escalate && context.policySensitiveDetected) {
    return { shouldEscalate: true, reason: "policy_sensitive", details: "Policy-sensitive scenario" };
  }

  return { shouldEscalate: false };
}

const OPERATIONAL_RISK_REASONS: EscalationTrigger[] = [
  "delivery_failed",
  "system_integrity_violation",
  "signal_unprocessable",
  "progress_stalled",
];

export async function logEscalation(
  workspaceId: string,
  leadId: string,
  escalationReason: EscalationTrigger,
  proposedAction: string,
  proposedMessage: string,
  assignedUserId?: string,
  holdUntil?: Date
): Promise<string | null> {
  const db = getDb();
  const { data } = await db.from("escalation_logs").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    escalation_reason: escalationReason,
    proposed_action: proposedAction,
    proposed_message: proposedMessage,
    assigned_user_id: assignedUserId ?? null,
    hold_until: holdUntil?.toISOString() ?? null,
    holding_message_sent: false,
  }).select("id").single();
  const id = (data as { id?: string })?.id ?? null;

  if (id && OPERATIONAL_RISK_REASONS.includes(escalationReason)) {
    const { sendOwnerAssuranceEmail } = await import("@/lib/operational-presence");
    sendOwnerAssuranceEmail(workspaceId).catch(() => {});
  }

  const { breakOperationalConfidenceStreak } = await import("@/lib/operational-confidence-streak");
  breakOperationalConfidenceStreak(workspaceId).catch((err) => {
    // Break failed; non-fatal
  });

  return id;
}

export async function getAssignedUserId(workspaceId: string, leadId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("lead_assignments")
    .select("assigned_to")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .limit(1)
    .single();
  return (data as { assigned_to?: string })?.assigned_to ?? null;
}

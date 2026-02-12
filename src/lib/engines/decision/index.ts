/**
 * Decision Engine — Pure intervention authority.
 * Consumes deal_state_vector and optional strategy_state. Outputs intervention_decision only.
 * No message construction. No AI.
 */

import { getDb } from "@/lib/db/queries";
import type { DealStateVector } from "@/lib/engines/perception";
import type { WorkspaceStrategyState } from "@/lib/strategy/planner";
import { ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";
import type { LeadState } from "@/lib/types";
import {
  isWithinBusinessHours,
  passesCooldownLadder,
  passesStageLimit,
} from "@/lib/autopilot";
import { mergeSettings } from "@/lib/autopilot";
import { isFeatureEnabled, isRampComplete } from "@/lib/autonomy";
import { canSend, getFallbackChannel } from "@/lib/channels/capabilities";
import { getWarmupLimit } from "@/lib/warmup";
import { getBookingRoute } from "@/lib/intelligence/booking-routing";

export type InterventionType =
  | "follow_up"
  | "qualification_question"
  | "booking"
  | "call_invite"
  | "reminder"
  | "prep_info"
  | "recovery"
  | "win_back"
  | "offer"
  | "clarifying_question"
  | "greeting"
  | "question"
  | "next_step";

export interface InterventionDecision {
  intervene: boolean;
  intervention_type: InterventionType | null;
  timing: "immediate" | "scheduled" | "deferred";
  channel_priority: string[];
  confidence: number;
  reason_code: string;
}

const INTERVENTION_REASON_CODES: Record<string, string> = {
  vip_excluded: "VIP excluded from messaging",
  ready_follow_up: "Lead engaged, follow-up optimal",
  silence_risk: "No-reply window closing",
  decay_recovery: "Engagement decay, recovery indicated",
  booking_qualified: "High deal probability, booking indicated",
  attendance_protection: "Call upcoming, reminder indicated",
  ramp_hold: "Autonomy ramp not complete",
  paused: "Workspace paused",
  opt_out: "Lead opted out",
  no_allowed_actions: "No actions allowed for state",
  outside_hours: "Outside business hours",
  cooldown: "Cooldown active",
  stage_limit: "Stage limit reached",
  warmup_limit: "Warmup limit reached",
  channel_unavailable: "Channel unavailable",
  feature_disabled: "Feature disabled",
};

/** Pure intervention decision. No message construction. */
export async function decideIntervention(
  workspaceId: string,
  leadId: string,
  stateVector: DealStateVector,
  strategyState?: WorkspaceStrategyState | null
): Promise<InterventionDecision> {
  const db = getDb();
  const state = stateVector.state as LeadState;
  const allowedActions = ALLOWED_ACTIONS_BY_STATE[state] ?? [];

  if (allowedActions.length === 0) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.no_allowed_actions,
    };
  }

  if (stateVector.opt_out) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.opt_out,
    };
  }

  const { data: settingsRow } = await db.from("settings").select("*").eq("workspace_id", workspaceId).single();
  const settings = mergeSettings(settingsRow as Parameters<typeof mergeSettings>[0]);
  if (settings.vip_rules?.exclude_from_messaging) {
    const domains = settings.vip_rules.domains ?? [];
    const company = (stateVector.company ?? "").toLowerCase();
    if (stateVector.is_vip || domains.some((d: string) => company.includes(d.toLowerCase()))) {
      return {
        intervene: false,
        intervention_type: null,
        timing: "deferred",
        channel_priority: [],
        confidence: 0,
        reason_code: INTERVENTION_REASON_CODES.vip_excluded,
      };
    }
  }

  const rampOk = await isRampComplete(workspaceId);
  if (!rampOk) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.ramp_hold,
    };
  }

  const { data: wsRow } = await db.from("workspaces").select("status, created_at").eq("id", workspaceId).single();
  if ((wsRow as { status?: string })?.status === "paused") {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.paused,
    };
  }

  let effectiveAllowedActions = allowedActions;
  const { isLowPressureMode } = await import("@/lib/human-safety/disinterest-detector");
  const lowPressure = await isLowPressureMode(workspaceId, leadId);
  if (lowPressure) {
    const passiveOnly = ["follow_up", "clarifying_question"];
    effectiveAllowedActions = allowedActions.filter((a) => passiveOnly.includes(a));
    if (effectiveAllowedActions.length === 0) {
      return {
        intervene: false,
        intervention_type: null,
        timing: "deferred",
        channel_priority: [],
        confidence: 0,
        reason_code: "low_pressure_mode",
      };
    }
    const { data: lastOut } = await db
      .from("outbound_messages")
      .select("sent_at")
      .eq("lead_id", leadId)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();
    const lastSentAt = (lastOut as { sent_at?: string })?.sent_at ? new Date((lastOut as { sent_at: string }).sent_at) : null;
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    if (lastSentAt && lastSentAt > seventyTwoHoursAgo) {
      return {
        intervene: false,
        intervention_type: null,
        timing: "scheduled",
        channel_priority: [],
        confidence: 0,
        reason_code: "low_pressure_72h",
      };
    }
  }

  if (!isWithinBusinessHours(settings)) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "scheduled",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.outside_hours,
    };
  }

  const wsCreated = (wsRow as { created_at?: string })?.created_at ? new Date((wsRow as { created_at: string }).created_at) : new Date();
  const warmupLimit = getWarmupLimit(wsCreated);
  if (warmupLimit < Number.POSITIVE_INFINITY) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: warmupToday } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("sent_at", todayStart.toISOString());
    if ((warmupToday ?? 0) >= warmupLimit) {
      return {
        intervene: false,
        intervention_type: null,
        timing: "scheduled",
        channel_priority: [],
        confidence: 0,
        reason_code: INTERVENTION_REASON_CODES.warmup_limit,
      };
    }
  }

  const { data: convRow } = await db.from("conversations").select("channel").eq("lead_id", leadId).limit(1).single();
  let channel = (convRow as { channel?: string })?.channel ?? "web";
  const channelCanSend = await canSend(channel);
  if (!channelCanSend) {
    const fallback = await getFallbackChannel(channel);
    if (!fallback) {
      return {
        intervene: false,
        intervention_type: null,
        timing: "deferred",
        channel_priority: [],
        confidence: 0,
        reason_code: INTERVENTION_REASON_CODES.channel_unavailable,
      };
    }
    channel = fallback;
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: outboundToday } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .gte("sent_at", todayStart.toISOString());

  if (!passesStageLimit(state as LeadState, outboundToday ?? 0)) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.stage_limit,
    };
  }

  const { data: outboundRows } = await db
    .from("outbound_messages")
    .select("sent_at")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false })
    .limit(1);
  const { count: totalOutbound } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const lastOutbound = outboundRows?.[0] as { sent_at?: string } | undefined;
  const lastAt = lastOutbound?.sent_at ? new Date(lastOutbound.sent_at) : null;
  const attemptCount = (totalOutbound ?? 0) + 1;
  if (!passesCooldownLadder(lastAt, attemptCount)) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "scheduled",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.cooldown,
    };
  }

  let interventionType: InterventionType = effectiveAllowedActions[0] as InterventionType;
  let confidence = 0.8;
  let reasonCode = INTERVENTION_REASON_CODES.ready_follow_up;

  if (stateVector.silence_risk > 0.5) {
    interventionType = state === "REACTIVATE" ? "win_back" : "follow_up";
    confidence = 0.85;
    reasonCode = INTERVENTION_REASON_CODES.silence_risk;
  } else if (state === "REACTIVATE" || stateVector.engagement_decay_hours > 72) {
    const agg = strategyState?.aggressiveness_level ?? "balanced";
    const recoveryConfidence = agg === "conservative" ? 0.85 : agg === "aggressive" ? 0.65 : 0.75;
    if (strategyState?.recovery_priority === "low" && agg === "conservative") {
      interventionType = "follow_up" as InterventionType;
      confidence = 0.7;
    } else {
      interventionType = effectiveAllowedActions.includes("win_back") ? "win_back" : (effectiveAllowedActions.includes("recovery") ? "recovery" : "follow_up") as InterventionType;
      confidence = recoveryConfidence;
    }
    reasonCode = INTERVENTION_REASON_CODES.decay_recovery;
  } else if (state === "BOOKED" && stateVector.attendance_probability > 0) {
    interventionType = effectiveAllowedActions.includes("reminder") ? "reminder" : (effectiveAllowedActions.includes("prep_info") ? "prep_info" : "follow_up") as InterventionType;
    confidence = 0.8;
    reasonCode = INTERVENTION_REASON_CODES.attendance_protection;
  } else if ((state === "QUALIFIED" || state === "ENGAGED") && stateVector.deal_probability > 0.6) {
    const { data: dealRow } = await db.from("deals").select("id").eq("lead_id", leadId).neq("status", "lost").limit(1).single();
    const dealId = (dealRow as { id?: string })?.id;
    if (dealId && effectiveAllowedActions.includes("booking")) {
      const route = await getBookingRoute(dealId);
      if (route.tier === "clarify_nurture") {
        interventionType = "qualification_question";
      } else if (route.tier === "triage_call" && effectiveAllowedActions.includes("call_invite")) {
        interventionType = "call_invite";
      } else {
        interventionType = "booking";
      }
      confidence = 0.85;
      reasonCode = INTERVENTION_REASON_CODES.booking_qualified;
    }
  }

  const actionToFeature: Record<string, string> = {
    follow_up: "followups",
    booking: "booking",
    call_invite: "booking",
    reminder: "confirmations",
    prep_info: "confirmations",
    win_back: "winback",
    qualification_question: "triage",
    clarifying_question: "triage",
  };
  const feature = actionToFeature[interventionType] ?? "followups";
  const featureEnabled = await isFeatureEnabled(workspaceId, feature as "followups" | "confirmations" | "winback" | "booking" | "triage");
  if (!featureEnabled) {
    return {
      intervene: false,
      intervention_type: null,
      timing: "deferred",
      channel_priority: [],
      confidence: 0,
      reason_code: INTERVENTION_REASON_CODES.feature_disabled,
    };
  }

  const agg = strategyState?.aggressiveness_level ?? "balanced";
  const actThreshold = agg === "conservative" ? 0.85 : agg === "aggressive" ? 0.7 : 0.8;
  if (agg === "conservative" && confidence < actThreshold) {
    confidence = Math.min(confidence + 0.05, actThreshold);
  }

  try {
    const { getBlendedExpectation } = await import("@/lib/network/behavioral-blend");
    const blend = await getBlendedExpectation(workspaceId, leadId, {
      stage: state,
      messageType: interventionType,
      hoursSinceLastMessage: stateVector.engagement_decay_hours ?? 24,
    });
    confidence = Math.min(0.95, confidence + (blend.expected_success - 0.5) * 0.08);
  } catch {
    // Non-blocking: blend failure does not affect decision
  }

  const channelPriority = [channel];
  const timing = confidence >= actThreshold ? "immediate" : "scheduled";

  return {
    intervene: true,
    intervention_type: interventionType,
    timing,
    channel_priority: channelPriority,
    confidence,
    reason_code: reasonCode,
  };
}

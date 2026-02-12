/**
 * Decision pipeline using Perception -> Decision -> Execution engines.
 * No AI in message construction. Deterministic templates only.
 */

import { getDb } from "@/lib/db/queries";
import { computeDealStateVector } from "@/lib/engines/perception";
import { decideIntervention } from "@/lib/engines/decision";
import { buildMessageFromIntervention, DEFER_MESSAGE } from "@/lib/engines/execution";
import { computeRevenueState, buildLossPreventionPayload } from "@/lib/revenue-state";
import { redact } from "@/lib/redact";
import { checkPolicy, mergeSettings } from "@/lib/autopilot";
import { detectSensitiveIntent, getSafeResponse, getEscalationHoldingMessage } from "@/lib/safe-responses";
import { checkEscalation, logEscalation, getAssignedUserId, isLeadInEscalationHold } from "@/lib/escalation";
import { shouldRequireApproval } from "@/lib/autonomy";
import { narrativeForAction } from "@/lib/trust/build-narrative";
import { confidenceToLabel } from "@/lib/trust/confidence-language";
import { canInterveneNow, recordIntervention, hashMessage } from "@/lib/stability/cooldowns";
import { logRestraint } from "@/lib/trust/log-restraint";
import { setLeadPlan } from "@/lib/plans/lead-plan";

const SAFE_FALLBACK_MESSAGES: Record<string, string> = {
  clarifying_question: "Thanks for reaching out. Could you tell me a bit more about what you're looking for?",
  book_cta: "I'd be happy to help. Would you like to schedule a quick call to discuss?",
  greeting: "Hi! Thanks for your message. How can I help you today?",
};

/**
 * Run decision using engine pipeline (Perception -> Decision -> Execution).
 * Deterministic templates only. No free-form AI generation.
 */
export async function runDecisionJobWithEngines(
  leadId: string,
  workspaceId: string
): Promise<void> {
  const stateVector = await computeDealStateVector(workspaceId, leadId);
  if (!stateVector) {
    console.error("[decisionJob] lead not found", redact({ leadId }));
    return;
  }

  const revenueState = computeRevenueState(stateVector);

  if (stateVector.state === "BOOKED") {
    try {
      const { protectAttendance } = await import("@/lib/outcomes/attendance");
      await protectAttendance(leadId);
    } catch {
      // Non-blocking
    }
  }
  if (["SHOWED", "QUALIFIED", "ENGAGED"].includes(stateVector.state)) {
    try {
      const { monitorDealHealth } = await import("@/lib/outcomes/deal-health");
      await monitorDealHealth(leadId);
    } catch {
      // Non-blocking
    }
  }

  const { getWorkspaceStrategy } = await import("@/lib/strategy/planner");
  const strategyState = await getWorkspaceStrategy(workspaceId);
  const decision = await decideIntervention(workspaceId, leadId, stateVector, strategyState);
  if (!decision.intervene || !decision.intervention_type) {
    const { recordInaction } = await import("@/lib/inaction-reasons");
    await recordInaction(leadId, workspaceId, "decision_no_intervention", {
      reason_code: decision.reason_code,
    });
    const recheckAt = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => {
          const t = new Date();
          t.setHours(t.getHours() + 12);
          return t;
        })();
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "recheck",
      next_action_at: recheckAt.toISOString(),
    });
    return;
  }

  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("name, company, email, phone, state, opt_out, is_vip")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!lead) return;

  if ((lead as { opt_out?: boolean }).opt_out) {
    await logRestraint(workspaceId, leadId, "opt_out", {
      reason_code: "opt_out",
      ...buildLossPreventionPayload(revenueState, decision.intervention_type, decision.reason_code ?? "opt_out", 0),
    });
    const recheckAt = (() => { const t = new Date(); t.setDate(t.getDate() + 30); return t; })();
    await setLeadPlan(workspaceId, leadId, { next_action_type: "observe", next_action_at: recheckAt.toISOString() });
    return;
  }

  const { data: convRow } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).single();
  const convId = (convRow as { id?: string })?.id;
  if (!convId) {
    const recheckAt = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => { const t = new Date(); t.setHours(t.getHours() + 12); return t; })();
    await setLeadPlan(workspaceId, leadId, { next_action_type: "recheck", next_action_at: recheckAt.toISOString() });
    return;
  }

  const { data: settingsRow } = await db.from("settings").select("*").eq("workspace_id", workspaceId).single();
  const settings = mergeSettings(settingsRow as Parameters<typeof mergeSettings>[0]);

  const coverageFlags = (settingsRow as { coverage_flags?: Record<string, boolean> })?.coverage_flags;
  const { isCoverageEnabled } = await import("@/lib/coverage-flags");
  if (!isCoverageEnabled(coverageFlags, decision.intervention_type)) {
    const covLossPayload = buildLossPreventionPayload(
      revenueState,
      decision.intervention_type,
      decision.reason_code,
      0
    );
    await logRestraint(workspaceId, leadId, "coverage_not_enabled", {
      reason_code: decision.reason_code,
      ...covLossPayload,
    });
    const { recordInaction } = await import("@/lib/inaction-reasons");
    await recordInaction(leadId, workspaceId, "coverage_not_enabled", {
      intervention_type: decision.intervention_type,
      reason_code: decision.reason_code,
    });
    const recheckAt = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => {
          const t = new Date();
          t.setHours(t.getHours() + 24);
          return t;
        })();
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "recheck",
      next_action_at: recheckAt.toISOString(),
    });
    return;
  }

  const stage = (lead as { state: import("@/lib/types").LeadState }).state;
  const cooldownCheck = await canInterveneNow(workspaceId, leadId, decision.intervention_type, stage);
  if (!cooldownCheck.allowed) {
    const coolLossPayload = buildLossPreventionPayload(
      revenueState,
      decision.intervention_type,
      decision.reason_code,
      0
    );
    await logRestraint(workspaceId, leadId, cooldownCheck.reason ?? "cooldown", {
      cooldown_until: cooldownCheck.cooldown_until,
      reason_code: decision.reason_code,
      ...coolLossPayload,
    });
    const observeAt = cooldownCheck.cooldown_until
      ? (() => { const t = new Date(cooldownCheck.cooldown_until!); t.setMinutes(t.getMinutes() + 5); return t; })()
      : revenueState.transition_toward_risk_at
        ? new Date(revenueState.transition_toward_risk_at)
        : (() => { const t = new Date(); t.setHours(t.getHours() + 6); return t; })();
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "observe",
      next_action_at: observeAt.toISOString(),
    });
    return;
  }

  const minAct = Number((settingsRow as { min_confidence_to_act?: number })?.min_confidence_to_act ?? 0.55);
  const minSchedule = Number((settingsRow as { min_confidence_to_schedule?: number })?.min_confidence_to_schedule ?? 0.45);
  if (decision.confidence < minAct) {
    if (decision.confidence >= minSchedule) {
      const observeAt = revenueState.transition_toward_risk_at
        ? new Date(revenueState.transition_toward_risk_at)
        : (() => {
            const t = new Date();
            t.setHours(t.getHours() + 4);
            return t;
          })();
      const channel = (convRow as { channel?: string })?.channel ?? "web";
      const { count: totalOutbound } = await db.from("outbound_messages").select("id", { count: "exact", head: true }).eq("lead_id", leadId);
      const attemptCount = (totalOutbound ?? 0) + 1;
      const { sendOutbound } = await import("@/lib/delivery/provider");
      const { recordIntervention, hashMessage } = await import("@/lib/stability/cooldowns");
      await db.from("messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: DEFER_MESSAGE,
        confidence_score: decision.confidence,
        approved_by_human: false,
        metadata: { action: "defer", reason_code: decision.reason_code },
      });
      const { data: om } = await db
        .from("outbound_messages")
        .insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          conversation_id: convId,
          content: DEFER_MESSAGE,
          channel,
          status: "queued",
          attempt_count: attemptCount,
        })
        .select("id")
        .single();
      if (om) {
        const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
        await sendOutbound((om as { id: string }).id, workspaceId, leadId, convId, channel, DEFER_MESSAGE, to);
      }
      await recordIntervention(workspaceId, leadId, "clarifying_question", hashMessage(DEFER_MESSAGE));
      await setLeadPlan(workspaceId, leadId, {
        next_action_type: "observe",
        next_action_at: observeAt.toISOString(),
      });
      const lossPayload = buildLossPreventionPayload(
        revenueState,
        decision.intervention_type,
        decision.reason_code,
        0,
        { intervention_type_override: "NO_ACTION" }
      );
      await db.from("action_logs").insert({
        workspace_id: workspaceId,
        entity_type: "lead",
        entity_id: leadId,
        action: "uncertainty_restraint",
        actor: "System",
        role: null,
        payload: {
          confidence: decision.confidence,
          min_to_act: minAct,
          reason_code: decision.reason_code,
          scheduled_observe_at: observeAt.toISOString(),
          defer_message_sent: true,
          ...lossPayload,
        },
      });
      return;
    }
    const { recordInaction } = await import("@/lib/inaction-reasons");
    await recordInaction(leadId, workspaceId, "low_confidence", {
      confidence: decision.confidence,
      min_to_act: minAct,
      reason_code: decision.reason_code,
    });
    const recheckAt = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => {
          const t = new Date();
          t.setHours(t.getHours() + 36);
          return t;
        })();
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "recheck",
      next_action_at: recheckAt.toISOString(),
    });
    return;
  }

  let message = buildMessageFromIntervention(decision, {
    leadName: (lead as { name?: string }).name,
    company: (lead as { company?: string }).company,
  });

  const { data: messages } = await db
    .from("messages")
    .select("content, role")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(5);
  const lastUserMsg = (messages ?? []).find((m: { role: string }) => m.role === "user")?.content ?? "";
  const sensitive = detectSensitiveIntent([], lastUserMsg);
  if (sensitive) {
    message = getSafeResponse(sensitive);
  }

  const policy = checkPolicy(
    { is_vip: (lead as { is_vip?: boolean }).is_vip, company: (lead as { company?: string }).company, opt_out: (lead as { opt_out?: boolean }).opt_out },
    message,
    decision.intervention_type,
    settings,
    (lead as { state: import("@/lib/types").LeadState }).state
  );
  if (!policy.allowed) {
    message = SAFE_FALLBACK_MESSAGES[policy.safeFallback] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  const { isPreviewMode } = await import("@/lib/preview-mode");
  const { shouldSimulateOnly } = await import("@/lib/autonomy");
  const previewMode = await isPreviewMode(workspaceId);
  const simulateOnly = await shouldSimulateOnly(workspaceId);
  const forceSimulate = previewMode || simulateOnly;

  const { resolveRole } = await import("@/lib/roles");
  const roleResolved = resolveRole((lead as { state?: string }).state as import("@/lib/types").LeadState, decision.intervention_type, ["full_autopilot"]);
  if (!roleResolved) {
    const { recordInaction } = await import("@/lib/inaction-reasons");
    await recordInaction(leadId, workspaceId, "no_role_for_action", { state: (lead as { state: string }).state, action: decision.intervention_type });
    const recheckAt = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => {
          const t = new Date();
          t.setHours(t.getHours() + 12);
          return t;
        })();
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "recheck",
      next_action_at: recheckAt.toISOString(),
    });
    return;
  }
  const roleLabel = roleResolved.label ?? "System";
  const roleId = roleResolved.role ?? "follow_up_manager";

  const channel = (decision.channel_priority[0] ?? (convRow as { channel?: string })?.channel) || "web";

  const { count: totalOutbound } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const attemptCount = (totalOutbound ?? 0) + 1;

  const inEscalationHold = await isLeadInEscalationHold(leadId);
  if (inEscalationHold) {
    const holdingMessage = getEscalationHoldingMessage();
    await db.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: holdingMessage,
      confidence_score: 1,
      approved_by_human: false,
      metadata: { action: "escalation_hold_limited_assist", reason_code: decision.reason_code },
    });
    const { data: omH } = await db
      .from("outbound_messages")
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        conversation_id: convId,
        content: holdingMessage,
        channel,
        status: "queued",
        attempt_count: attemptCount,
      })
      .select("id")
      .single();
    if (omH) {
      const { sendOutbound } = await import("@/lib/delivery/provider");
      const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
      await sendOutbound((omH as { id: string }).id, workspaceId, leadId, convId, channel, holdingMessage, to);
    }
    const escHoldRecheck = (() => { const t = new Date(); t.setHours(t.getHours() + 4); return t; })();
    await setLeadPlan(workspaceId, leadId, { next_action_type: "observe", next_action_at: escHoldRecheck.toISOString() });
    return;
  }

  const { data: dealRow } = await db.from("deals").select("value_cents").eq("lead_id", leadId).neq("status", "lost").limit(1).single();
  const dealValue = (dealRow as { value_cents?: number })?.value_cents ?? 0;
  const needsApproval = !forceSimulate && (await shouldRequireApproval(workspaceId, decision.intervention_type, {
    isSensitive: !!sensitive,
    dealValueCents: dealValue,
  }));
  const escalationCheck = await checkEscalation(workspaceId, leadId, {
    dealValueCents: dealValue,
    isVip: (lead as { is_vip?: boolean }).is_vip ?? false,
    angerDetected: sensitive === "anger",
    negotiationDetected: sensitive === "negotiation",
    policySensitiveDetected: !!sensitive,
  });

  if (!forceSimulate && ((escalationCheck.shouldEscalate && escalationCheck.reason) || needsApproval)) {
    const escReason = escalationCheck.reason ?? "autonomy_assist_approval_required";
    const assignedUserId = await getAssignedUserId(workspaceId, leadId);
    const { data: escRules } = await db.from("settings").select("escalation_rules, escalation_timeout_hours").eq("workspace_id", workspaceId).single();
    const timeoutHours = (escRules as { escalation_rules?: { escalation_timeout_hours?: number }; escalation_timeout_hours?: number })?.escalation_rules?.escalation_timeout_hours
      ?? (escRules as { escalation_timeout_hours?: number })?.escalation_timeout_hours
      ?? 24;
    const holdUntil = new Date();
    holdUntil.setHours(holdUntil.getHours() + timeoutHours);
    const escalationId = await logEscalation(workspaceId, leadId, escReason, decision.intervention_type, message, assignedUserId ?? undefined, holdUntil);

    const holdingMessage = getEscalationHoldingMessage();
    await db.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: holdingMessage,
      confidence_score: 1,
      approved_by_human: false,
      metadata: { action: "escalation_holding", escalation_reason: escReason, reason_code: decision.reason_code },
    });

    if (escalationId) {
      await db.from("escalation_logs").update({ hold_until: holdUntil.toISOString(), holding_message_sent: true }).eq("id", escalationId);
    }

    const outChannel = channel;
    const { data: om } = await db
      .from("outbound_messages")
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        conversation_id: convId,
        content: holdingMessage,
        channel: outChannel,
        status: "queued",
        attempt_count: attemptCount,
      })
      .select("id")
      .single();

    if (om) {
      const { sendOutbound } = await import("@/lib/delivery/provider");
      const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
      const sendResult = await sendOutbound((om as { id: string }).id, workspaceId, leadId, convId, outChannel, holdingMessage, to);
      if (sendResult.status === "failed" && sendResult.error) {
        await db.from("outbound_messages").update({ delivery_error: sendResult.error }).eq("id", (om as { id: string }).id);
      }
    }

    await db.from("pending_approvals").insert({
      lead_id: leadId,
      conversation_id: convId,
      proposed_message: message,
      confidence_score: decision.confidence,
      intent_classification: { reason_code: decision.reason_code, sensitive },
      status: "pending",
    });
    const escNarrative = narrativeForAction(decision.intervention_type, { lastUserMsg, state: (lead as { state: string }).state, policyReason: policy.reason, reasoning: { reason_code: decision.reason_code } });
    const escLossPayload = buildLossPreventionPayload(
      revenueState,
      decision.intervention_type,
      decision.reason_code,
      dealValue,
      { intervention_type_override: "HUMAN_ALERT" }
    );
    await db.from("action_logs").insert({
      workspace_id: workspaceId,
      entity_type: "lead",
      entity_id: leadId,
      action: "escalation_suggest",
      actor: roleLabel,
      role: roleId,
      payload: {
        escalation_reason: escReason,
        proposed_action: decision.intervention_type,
        reason_code: decision.reason_code,
        hold_until: holdUntil.toISOString(),
        noticed: escNarrative.noticed,
        decision: escNarrative.decision,
        expected: escNarrative.expected,
        confidence_label: confidenceToLabel(decision.confidence),
        ...escLossPayload,
      },
    });
    const escRecheck = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => { const t = new Date(); t.setHours(t.getHours() + (timeoutHours ?? 24)); return t; })();
    await setLeadPlan(workspaceId, leadId, { next_action_type: "observe", next_action_at: escRecheck.toISOString() });
    return;
  }

  if (forceSimulate) {
    const simLossPayload = buildLossPreventionPayload(
      revenueState,
      decision.intervention_type,
      decision.reason_code,
      dealValue
    );
    await db.from("action_logs").insert({
      workspace_id: workspaceId,
      entity_type: "lead",
      entity_id: leadId,
      action: "simulated_send_message",
      actor: roleLabel,
      role: roleId,
      payload: {
        action: decision.intervention_type,
        confidence: decision.confidence,
        reason_code: decision.reason_code,
        simulated: true,
        ...simLossPayload,
      },
    });
    const simRecheck = revenueState.transition_toward_risk_at
      ? new Date(revenueState.transition_toward_risk_at)
      : (() => { const t = new Date(); t.setHours(t.getHours() + 4); return t; })();
    await setLeadPlan(workspaceId, leadId, { next_action_type: "observe", next_action_at: simRecheck.toISOString() });
    return;
  }

  await db.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: message,
    confidence_score: decision.confidence,
    approved_by_human: false,
    metadata: { action: decision.intervention_type, policy_reason: policy.reason, reason_code: decision.reason_code },
  });

  const { data: om } = await db
    .from("outbound_messages")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      conversation_id: convId,
      content: message,
      channel,
      status: "queued",
      attempt_count: attemptCount,
    })
    .select("id")
    .single();

  if (om) {
    const { sendOutbound } = await import("@/lib/delivery/provider");
    const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
    const sendResult = await sendOutbound((om as { id: string }).id, workspaceId, leadId, convId, channel, message, to);
    if (sendResult.status === "failed" && sendResult.error) {
      await db.from("outbound_messages").update({ delivery_error: sendResult.error }).eq("id", (om as { id: string }).id);
    }
  }

  const { incrementMetric, METRIC_KEYS } = await import("@/lib/observability/metrics");
  await incrementMetric(workspaceId, policy.allowed ? METRIC_KEYS.REPLIES_SENT : METRIC_KEYS.FALLBACK_USED);

  await recordIntervention(workspaceId, leadId, decision.intervention_type, hashMessage(message));

  try {
    const { recordRiskIncidentPrevented } = await import("@/lib/risk-surface/record-incident");
    await recordRiskIncidentPrevented(workspaceId, decision.reason_code, { leadId, detail: { intervention_type: decision.intervention_type } });
  } catch {
    // Non-blocking
  }

  const { data: plan } = await db.from("lead_plans").select("sequence_id").eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("status", "active").single();
  if (plan && (plan as { sequence_id?: string }).sequence_id) {
    const { advanceSequence } = await import("@/lib/sequences/engine");
    await advanceSequence(workspaceId, leadId, strategyState);
  } else {
    const { completeLeadPlan } = await import("@/lib/plans/lead-plan");
    await completeLeadPlan(workspaceId, leadId);
  }

  const sendLossPayload = buildLossPreventionPayload(
    revenueState,
    decision.intervention_type,
    decision.reason_code,
    dealValue
  );
  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "send_message",
    actor: roleLabel,
    role: roleId,
    payload: {
      action: decision.intervention_type,
      confidence: decision.confidence,
      policy_reason: policy.reason,
      reason_code: decision.reason_code,
      confidence_label: confidenceToLabel(decision.confidence),
      ...sendLossPayload,
    },
  });
}

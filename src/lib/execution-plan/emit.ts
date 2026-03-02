/**
 * Emit action_intents from an ExecutionPlan. No direct send; executor performs actions.
 */

import { createActionIntent } from "@/lib/action-intents";
import { buildVoiceExecutionPlan } from "@/lib/voice/plan/build";
import { assertWithinRateLimit } from "./rate-limits";
import type { ExecutionPlan } from "./types";
import { getLatestCommitmentState } from "@/lib/intelligence/commitment-score";
import { buildEscalationSummary } from "@/lib/intelligence/escalation-summary";
import { getEscalationContext } from "@/lib/intelligence/escalation-memory";

export interface EmitRecipient {
  to?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Emit the action intent indicated by plan.decision. Idempotent via dedupe_key.
 */
export async function emitExecutionPlanIntent(
  plan: ExecutionPlan,
  recipient: EmitRecipient,
  options?: { rendered_text?: string; approval_id?: string | null; dedupe_suffix?: string }
): Promise<string | null> {
  const { identifiers, decision, action_intent_to_emit, channel_chosen, disclaimer_lines: _disclaimer_lines, approval_id } = plan;
  const workspaceId = identifiers.workspace_id;
  const conversationId = identifiers.conversation_id;
  const threadId = identifiers.thread_id ?? null;
  const workUnitId = identifiers.work_unit_id ?? null;
  const suffix = options?.dedupe_suffix ?? Date.now().toString();
  const baseDedupe = `exec:${workspaceId}:${conversationId}:${plan.intent_type}:${suffix}`;

  if (decision === "blocked") {
    return null;
  }

  if (decision === "emit_approval" && action_intent_to_emit === "escalate_to_human") {
    const commitmentState = threadId ? await getLatestCommitmentState(workspaceId, threadId) : null;
    const escalationContext = threadId ? await getEscalationContext(workspaceId, threadId) : null;
    const escalationSummary = buildEscalationSummary({
      primary_objective: plan.primary_objective ?? undefined,
      secondary_objective: plan.secondary_objective ?? undefined,
      commitment_state: commitmentState ?? undefined,
      objections_raised: 0,
      disclaimer_lines: plan.disclaimer_lines,
      risk_score: plan.risk_score ?? undefined,
      open_commitments: escalationContext?.openCommitments ?? [],
      broken_commitments_count: escalationContext?.brokenCount ?? 0,
      last_3_actions: escalationContext?.last3Actions ?? [],
      volatility_score: commitmentState?.volatilityScore ?? 0,
      regulatory_constraints_snapshot: plan.regulatory_constraints_snapshot,
      cadence_recommendation: "Pause automated contact until human review.",
      what_not_to_say: plan.what_not_to_say ?? [],
      last_outcome_type: null,
      outcome_confidence: null,
      last_commitment_status: null,
      stage: null,
      drift_score: 0,
      contradiction_score: 0,
      goodwill_score: 50,
      repeated_unknown_count: 0,
      last_outcome_type_for_severity: null,
    });
    return createActionIntent(workspaceId, {
      threadId,
      workUnitId,
      intentType: "escalate_to_human",
      payload: {
        approval_id: options?.approval_id ?? approval_id,
        conversation_id: conversationId,
        thread_id: threadId,
        workspace_id: workspaceId,
        escalation_summary: escalationSummary,
      },
      dedupeKey: `approval:${workspaceId}:${conversationId}:${suffix}`,
    });
  }

  if (decision === "emit_preview" && action_intent_to_emit === "request_disclosure_confirmation") {
    return createActionIntent(workspaceId, {
      threadId,
      workUnitId,
      intentType: "request_disclosure_confirmation",
      payload: {
        conversation_id: conversationId,
        thread_id: threadId,
        channel: channel_chosen,
        disclaimer_lines: plan.disclaimer_lines,
        policy_id: plan.policy_id,
      },
      dedupeKey: `preview:${workspaceId}:${conversationId}:${suffix}`,
    });
  }

  if (decision === "send" && action_intent_to_emit === "send_message") {
    await assertWithinRateLimit(workspaceId, "message");
    const text = options?.rendered_text ?? plan.rendered_text ?? "";
    return createActionIntent(workspaceId, {
      threadId,
      workUnitId,
      intentType: "send_message",
      payload: {
        channel: channel_chosen,
        to: recipient.email ?? recipient.phone ?? recipient.to,
        text,
        thread_id: threadId,
        conversation_id: conversationId,
        workspace_id: workspaceId,
      },
      dedupeKey: baseDedupe,
    });
  }

  if (decision === "send" && action_intent_to_emit === "place_outbound_call") {
    await assertWithinRateLimit(workspaceId, "voice");
    const voicePlanResult = await buildVoiceExecutionPlan({
      workspaceId,
      threadId,
      workUnitId,
      conversationId,
      domainType: plan.domain_type,
      jurisdiction: plan.jurisdiction ?? "UK",
      stageState: plan.strategy_state_after,
      nowIso: options?.dedupe_suffix ? undefined : new Date().toISOString(),
    });
    if (!voicePlanResult.ok) {
      if (voicePlanResult.reason === "invalid_state") {
        const commitmentState = threadId ? await getLatestCommitmentState(workspaceId, threadId) : null;
        const escalationSummary = buildEscalationSummary({
          primary_objective: plan.primary_objective ?? "escalate",
          secondary_objective: plan.secondary_objective ?? undefined,
          commitment_state: commitmentState ?? undefined,
          objections_raised: 3,
          disclaimer_lines: plan.disclaimer_lines,
          risk_score: plan.risk_score ?? 75,
          last_outcome_type: null,
          outcome_confidence: null,
          last_commitment_status: null,
          stage: null,
          drift_score: 0,
          contradiction_score: 0,
          goodwill_score: 50,
          repeated_unknown_count: 0,
          last_outcome_type_for_severity: null,
        });
        return createActionIntent(workspaceId, {
          threadId,
          workUnitId,
          intentType: "escalate_to_human",
          payload: {
            reason: "objection_chain_limit",
            conversation_id: conversationId ?? undefined,
            workspace_id: workspaceId,
            escalation_summary: escalationSummary,
          },
          dedupeKey: `call:escalate:${workspaceId}:${conversationId}:${suffix}`,
        });
      }
      return null;
    }
    const voicePlan = voicePlanResult.plan;
    return createActionIntent(workspaceId, {
      threadId,
      workUnitId,
      intentType: "place_outbound_call",
      payload: {
        phone: recipient.phone ?? recipient.to,
        domain_type: plan.domain_type,
        jurisdiction: plan.jurisdiction ?? "UK",
        thread_id: threadId ?? undefined,
        work_unit_id: workUnitId ?? undefined,
        conversation_id: conversationId ?? undefined,
        plan: {
          domain_type: voicePlan.domain_type,
          jurisdiction: voicePlan.jurisdiction,
          stage_state: voicePlan.stage_state,
          consent_required: voicePlan.consent_required,
          max_duration_seconds: voicePlan.max_duration_seconds,
          escalation_threshold: voicePlan.escalation_threshold,
          disclaimer_lines: voicePlan.disclaimer_lines,
          script_blocks: voicePlan.script_blocks,
        },
        compliance_requirements: {
          consent_required: voicePlan.consent_required,
          quiet_hours_respected: true,
          jurisdiction_locked: plan.approval_mode === "jurisdiction_locked",
        },
        trace: {
          policy_id: plan.policy_id ?? null,
          approval_id: plan.approval_id ?? null,
        },
      },
      dedupeKey: `call:${workspaceId}:${conversationId}:${suffix}`,
    });
  }

  return null;
}

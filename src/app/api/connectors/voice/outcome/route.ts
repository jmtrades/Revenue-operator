/**
 * POST /api/connectors/voice/outcome
 * Ingest call outcome from external executor. Append-only. Requires workspace role owner/admin/operator/closer.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { completeActionIntent } from "@/lib/action-intents";
import { createActionIntent } from "@/lib/action-intents";
import { upsertStrategyState } from "@/lib/strategy-state/store";
import { updateCommitmentFromVoiceOutcome } from "@/lib/intelligence/commitment-score";
import {
  resolveUniversalOutcome,
  insertUniversalOutcome,
  type NextRequiredAction,
} from "@/lib/intelligence/outcome-taxonomy";
import { recordCommitment } from "@/lib/intelligence/commitment-registry";
import {
  extractQuestionsFromVoiceOutcome,
  recordUnresolvedQuestions,
  resolveQuestions,
  getOpenQuestions,
} from "@/lib/intelligence/unresolved-questions";
import { resolveObjectionLifecycle } from "@/lib/intelligence/objection-lifecycle";
import { computeAttemptEnvelope } from "@/lib/intelligence/attempt-envelope";
import { enforceOutcomeClosure } from "@/lib/intelligence/outcome-closure";
import { getPreviousSnapshot, buildConversationSnapshot } from "@/lib/intelligence/conversation-snapshot";
import { resolveConversationStage } from "@/lib/intelligence/conversation-stage";
import { evaluateDrift } from "@/lib/intelligence/drift-detector";
import { getWorkspaceStrategyMatrix } from "@/lib/intelligence/strategy-effectiveness";
import { buildStrategicHorizon } from "@/lib/intelligence/strategic-horizon";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import { recordStrategyEffectiveness } from "@/lib/intelligence/strategy-effectiveness";

const OUTCOMES = ["connected", "no_answer", "voicemail", "busy", "failed", "completed"] as const;
const EMIT_INTENT_ACTIONS = ["schedule_followup", "request_disclosure_confirmation", "escalate_to_human", "pause_execution"] as const;

function orientationLine(
  outcome: string,
  consentRecorded: boolean | null,
  disclosuresRead: boolean | null,
  nextRequiredAction: string | null
): string {
  if (nextRequiredAction === "escalate_to_human") return "A call outcome required human review.";
  if (outcome === "completed" || outcome === "connected") return "A call connected.";
  if (outcome === "no_answer" || outcome === "voicemail") return "A call attempt occurred.";
  if (outcome === "failed" || outcome === "busy") return "A call attempt occurred.";
  if (consentRecorded === true) return "Consent was recorded on the call.";
  if (disclosuresRead === true) return "Disclosure was delivered on the call.";
  return "A call attempt occurred.";
}

function resultStatus(outcome: string): "succeeded" | "failed" | "skipped" {
  if (outcome === "failed") return "failed";
  return "succeeded";
}

export async function POST(request: NextRequest) {
  let body: {
    workspace_id?: string;
    external_call_id?: string;
    action_intent_id?: string;
    outcome?: string;
    duration_seconds?: number;
    consent_recorded?: boolean | null;
    disclosures_read?: boolean | null;
    objection_key?: string | null;
    next_required_action?: string | null;
    notes_structured?: Record<string, unknown> | null;
    conversation_id?: string | null;
    thread_id?: string | null;
    work_unit_id?: string | null;
    strategy_state?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  const externalCallId = body.external_call_id?.trim();
  const actionIntentId = body.action_intent_id?.trim();
  const outcome = body.outcome && OUTCOMES.includes(body.outcome as (typeof OUTCOMES)[number]) ? body.outcome : null;

  if (!workspaceId || !externalCallId) {
    return NextResponse.json({ ok: false, reason: "workspace_id_and_external_call_id_required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceRole(request, workspaceId, ["owner", "admin", "operator", "closer"]);
  if (authErr) return authErr;

  const db = getDb();
  const channel = "voice_outcome";

  const payload: Record<string, unknown> = {
    outcome: outcome ?? "failed",
    duration_seconds: typeof body.duration_seconds === "number" ? body.duration_seconds : 0,
    consent_recorded: body.consent_recorded ?? null,
    disclosures_read: body.disclosures_read ?? null,
    objection_key: body.objection_key ?? null,
    next_required_action: body.next_required_action ?? null,
    notes_structured: body.notes_structured ?? null,
  };
  const orientation = orientationLine(
    payload.outcome as string,
    payload.consent_recorded as boolean | null,
    payload.disclosures_read as boolean | null,
    body.next_required_action ?? null
  );
  if (orientation.length > 90) payload.orientation_line = "A call attempt occurred.";
  else payload.orientation_line = orientation;

  let inserted = true;
  try {
    await db.from("connector_events").insert({
      workspace_id: workspaceId,
      channel,
      external_id: externalCallId,
      payload,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      inserted = false;
      return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
    }
    throw e;
  }

  if (inserted && actionIntentId) {
    const { data: intentRow } = await db
      .from("action_intents")
      .select("payload_json")
      .eq("id", actionIntentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const payloadJson = (intentRow as { payload_json?: Record<string, unknown> } | null)?.payload_json;
    const compliance = payloadJson?.compliance_requirements as { consent_required?: boolean } | undefined;
    const plan = payloadJson?.plan as { disclaimer_lines?: string[] } | undefined;
    const consentRequired = compliance?.consent_required === true;
    const disclosuresRequired = Array.isArray(plan?.disclaimer_lines) && plan.disclaimer_lines.length > 0;
    if (consentRequired && body.consent_recorded !== true) {
      return NextResponse.json({ ok: false, reason: "compliance_violation" }, { status: 422 });
    }
    if (disclosuresRequired && body.disclosures_read !== true) {
      return NextResponse.json({ ok: false, reason: "compliance_violation" }, { status: 422 });
    }
  }

  if (inserted && actionIntentId && outcome) {
    const status = resultStatus(outcome);
    await completeActionIntent(actionIntentId, status, externalCallId);
  }

  if (inserted && body.thread_id?.trim() && outcome) {
    await updateCommitmentFromVoiceOutcome(workspaceId, body.thread_id.trim(), {
      outcome: outcome as "connected" | "no_answer" | "voicemail" | "busy" | "failed" | "completed",
      consent_recorded: body.consent_recorded ?? null,
      disclosures_read: body.disclosures_read ?? null,
      objection_key: body.objection_key ?? null,
      next_required_action: body.next_required_action ?? null,
    }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
  }

  const conversationId = body.conversation_id?.trim();

  if (inserted) {
    const resolved = resolveUniversalOutcome({
      voiceOutcome: outcome ?? undefined,
      consentRecorded: body.consent_recorded ?? null,
      disclosuresRead: body.disclosures_read ?? null,
      attemptCount: 0,
      maxAttemptsPerLead: 10,
    });
    await insertUniversalOutcome({
      workspaceId,
      threadId: body.thread_id?.trim() ?? null,
      workUnitId: body.work_unit_id ?? null,
      actionIntentId: actionIntentId ?? null,
      channel: "voice",
      outcome_type: resolved.outcome_type,
      outcome_confidence: resolved.outcome_confidence,
      next_required_action: resolved.next_required_action,
      structured_payload_json: { outcome: outcome ?? "failed", external_call_id: externalCallId },
    }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });

    const threadIdTrim = body.thread_id?.trim();
    if (threadIdTrim) {
      const voiceStruct = { objection_key: body.objection_key, next_required_action: body.next_required_action, notes_structured: body.notes_structured };
      const questions = extractQuestionsFromVoiceOutcome(voiceStruct);
      if (questions.length > 0) await recordUnresolvedQuestions(workspaceId, threadIdTrim, "voice", questions).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
      if (body.consent_recorded === true && body.disclosures_read === true) {
        await resolveQuestions(workspaceId, threadIdTrim, "answered", ["compliance"]).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
      }
      const openQuestions = await getOpenQuestions(workspaceId, threadIdTrim).catch(() => []);
      const prevSnapshot = await getPreviousSnapshot(workspaceId, threadIdTrim).catch(() => null);
      const driftResult = evaluateDrift({ lastOutcomeTypes: [], commitmentReversalsCount: 0, repeatedUnknownCount: 0 });
      const objectionStage = resolveObjectionLifecycle({
        prevStage: prevSnapshot?.stage ?? null,
        outcomeType: resolved.outcome_type,
        lastOutcomeType: resolved.outcome_type,
        driftScore: prevSnapshot?.drift_score ?? driftResult.driftScore,
        contradictionScore: prevSnapshot?.contradiction_score ?? driftResult.contradictionScore,
      });
      const envelope = computeAttemptEnvelope({
        previousSnapshot: prevSnapshot?.snapshot_json ?? null,
        openQuestionsCount: openQuestions.length,
        goodwillScore: prevSnapshot?.goodwill_score ?? 50,
        driftScore: prevSnapshot?.drift_score ?? driftResult.driftScore,
        contradictionScore: prevSnapshot?.contradiction_score ?? driftResult.contradictionScore,
        isLegalRisk: resolved.outcome_type === "legal_risk",
      });
      const stage = resolveConversationStage({ previousStage: prevSnapshot?.stage as never ?? null, outcomeType: resolved.outcome_type });
      await recordStrategyEffectiveness({
        workspaceId,
        threadId: threadIdTrim,
        variantKey: envelope.recommended_variant,
        outcomeType: resolved.outcome_type,
        commitmentDelta: 0,
        goodwillDelta: 0,
        escalationTriggered:
          resolved.outcome_type === "escalation_required" ||
          resolved.outcome_type === "legal_risk" ||
          resolved.outcome_type === "hostile",
      }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });

      const variantScoreSnapshot = await getWorkspaceStrategyMatrix(workspaceId).catch(() => ({}));
      const horizonSteps = buildStrategicHorizon({
        stage: stage ?? null,
        primaryObjective: null,
        openQuestionsCount: openQuestions.length,
        brokenCommitmentsCount: 0,
        goodwillScore: prevSnapshot?.goodwill_score ?? 50,
        riskScore: 0,
        driftScore: prevSnapshot?.drift_score ?? driftResult.driftScore,
      });
      await buildConversationSnapshot({
        workspaceId,
        threadId: threadIdTrim,
        stage,
        objectionStage,
        goodwillScore: prevSnapshot?.goodwill_score ?? 50,
        driftScore: prevSnapshot?.drift_score ?? driftResult.driftScore,
        contradictionScore: prevSnapshot?.contradiction_score ?? driftResult.contradictionScore,
        snapshotJson: {
          open_questions_count: openQuestions.length,
          last_question_types: openQuestions.slice(0, 5).map((q) => q.question_type),
          objection_lifecycle_stage: objectionStage,
          attempt_number: envelope.attempt_number,
          recommended_variant: envelope.recommended_variant,
          strategy_effectiveness_snapshot: variantScoreSnapshot,
          strategic_horizon: horizonSteps,
          variant_score_snapshot: variantScoreSnapshot,
        },
      }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
    }

    if ((resolved.outcome_type === "call_back_requested" || resolved.outcome_type === "payment_promised") && threadIdTrim) {
      await recordCommitment({
        workspaceId,
        threadId: threadIdTrim,
        commitmentType: resolved.outcome_type === "payment_promised" ? "payment" : "call_back",
      }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
    }

    let nextAction: NextRequiredAction | null =
      resolved.next_required_action !== "none" && resolved.next_required_action !== "record_commitment"
        ? resolved.next_required_action
        : body.next_required_action && EMIT_INTENT_ACTIONS.includes(body.next_required_action as (typeof EMIT_INTENT_ACTIONS)[number])
          ? body.next_required_action as NextRequiredAction
          : null;

    const closure = enforceOutcomeClosure(resolved.outcome_type, nextAction);
    if (!closure.allowed) {
      if (closure.forcedNextAction && closure.forcedNextAction !== "none" && EMIT_INTENT_ACTIONS.includes(closure.forcedNextAction as (typeof EMIT_INTENT_ACTIONS)[number])) {
        nextAction = closure.forcedNextAction;
      } else if (closure.forcedNextAction === "none") {
        nextAction = null;
      } else {
        nextAction = closure.forcedNextAction;
      }
      await appendLedgerEvent({
        workspaceId,
        eventType: "outcome_closure_enforced",
        severity: "notice",
        subjectType: "thread",
        subjectRef: (threadIdTrim ?? workspaceId).slice(0, 160),
        details: { last_outcome_type: resolved.outcome_type, forced_next_action: closure.forcedNextAction },
      }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
    }

    if (nextAction && EMIT_INTENT_ACTIONS.includes(nextAction as (typeof EMIT_INTENT_ACTIONS)[number])) {
      const dedupeKey = `voice_outcome:${externalCallId}:${nextAction}`;
      await createActionIntent(workspaceId, {
        threadId: body.thread_id ?? null,
        workUnitId: body.work_unit_id ?? null,
        intentType: nextAction as "schedule_followup" | "request_disclosure_confirmation" | "escalate_to_human" | "pause_execution",
        payload: {
          workspace_id: workspaceId,
          external_call_id: externalCallId,
          conversation_id: conversationId ?? null,
          thread_id: body.thread_id ?? null,
          work_unit_id: body.work_unit_id ?? null,
          next_required_action: nextAction,
        },
        dedupeKey,
      }).catch((err) => { log("error", "[connectors/voice/outcome] error:", { error: err instanceof Error ? err.message : err }); });
    }
  }

  if (inserted && conversationId) {
    await upsertStrategyState({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      thread_id: body.thread_id ?? null,
      work_unit_id: body.work_unit_id ?? null,
      current_state: (body.strategy_state?.trim() && body.strategy_state.length <= 64) ? body.strategy_state : "discovery",
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
import { log } from "@/lib/logger";

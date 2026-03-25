/**
 * POST /api/operational/action-intents/complete
 * Body: { id, result_status, result_ref?, write_back? }. Marks intent complete. Optional append-only write_back.
 * Requires workspace access (intent must belong to workspace).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { completeActionIntent } from "@/lib/action-intents";
import { getDb } from "@/lib/db/queries";
import { updateCommitmentFromMessageOutcome } from "@/lib/intelligence/commitment-score";
import { resolveUniversalOutcome, insertUniversalOutcome } from "@/lib/intelligence/outcome-taxonomy";
import { createActionIntent } from "@/lib/action-intents";
import { extractQuestionsFromMessageMetadata, recordUnresolvedQuestions } from "@/lib/intelligence/unresolved-questions";
import { enforceOutcomeClosure } from "@/lib/intelligence/outcome-closure";
import { recordStrategyEffectiveness } from "@/lib/intelligence/strategy-effectiveness";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import type { OperationalAction } from "@/lib/reciprocal-events";
import { assertSameOrigin } from "@/lib/http/csrf";

const EMIT_INTENT_ACTIONS = ["schedule_followup", "request_disclosure_confirmation", "escalate_to_human", "pause_execution"] as const;

type ResultStatus = "succeeded" | "failed" | "skipped";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  let body: {
    id?: string;
    result_status?: string;
    result_ref?: string | null;
    write_back?: {
      type: "connector_event" | "reciprocal_event";
      workspace_id: string;
      channel?: string;
      external_id?: string;
      payload?: Record<string, unknown>;
      thread_id?: string;
      actor_role?: string;
      operational_action?: string;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = body.id;
  const resultStatus = body.result_status as ResultStatus | undefined;
  if (!id || !resultStatus || !["succeeded", "failed", "skipped"].includes(resultStatus)) {
    return NextResponse.json({ error: "id and result_status (succeeded|failed|skipped) required" }, { status: 400 });
  }

  const db = getDb();
  const { data: row } = await db
    .from("action_intents")
    .select("workspace_id, thread_id, intent_type")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const workspaceId = (row as { workspace_id: string; thread_id?: string | null; intent_type?: string | null }).workspace_id;
  const threadId = (row as { thread_id?: string | null }).thread_id;
  const intentType = (row as { intent_type?: string | null }).intent_type;
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const ok = await completeActionIntent(id, resultStatus, body.result_ref ?? null);
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (threadId && intentType === "send_message") {
    await updateCommitmentFromMessageOutcome(workspaceId, threadId, {
      result_status: resultStatus,
      intent_type: intentType,
    }).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });

    const resolved = resolveUniversalOutcome({
      messageResultStatus: resultStatus,
      consentRecorded: null,
      disclosuresRead: null,
      attemptCount: 0,
    });
    await insertUniversalOutcome({
      workspaceId,
      threadId: threadId ?? null,
      workUnitId: null,
      actionIntentId: id,
      channel: "message",
      outcome_type: resolved.outcome_type,
      outcome_confidence: resolved.outcome_confidence,
      next_required_action: resolved.next_required_action,
      structured_payload_json: { result_status: resultStatus, intent_type: intentType },
    }).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });

    await recordStrategyEffectiveness({
      workspaceId,
      threadId,
      variantKey: "message",
      outcomeType: resolved.outcome_type,
      commitmentDelta: 0,
      goodwillDelta: 0,
      escalationTriggered:
        resolved.outcome_type === "escalation_required" ||
        resolved.outcome_type === "legal_risk" ||
        resolved.outcome_type === "hostile",
    }).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });

    const meta = body.write_back?.payload ?? {};
    const questions = extractQuestionsFromMessageMetadata(meta as Record<string, unknown>);
    if (questions.length > 0 && threadId) await recordUnresolvedQuestions(workspaceId, threadId, "message", questions).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });

    type EmitAction = "schedule_followup" | "request_disclosure_confirmation" | "escalate_to_human" | "pause_execution";
    let nextAction: EmitAction | null = resolved.next_required_action !== "none" && resolved.next_required_action !== "record_commitment"
      ? (resolved.next_required_action as EmitAction)
      : null;
    const closure = enforceOutcomeClosure(resolved.outcome_type, nextAction);
    if (!closure.allowed) {
      nextAction = closure.forcedNextAction !== "none" && closure.forcedNextAction !== "record_commitment"
        ? (closure.forcedNextAction as EmitAction)
        : null;
      await appendLedgerEvent({
        workspaceId,
        eventType: "outcome_closure_enforced",
        severity: "notice",
        subjectType: "thread",
        subjectRef: (threadId ?? workspaceId).slice(0, 160),
        details: { last_outcome_type: resolved.outcome_type, forced_next_action: closure.forcedNextAction },
      }).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });
    }
    if (nextAction && EMIT_INTENT_ACTIONS.includes(nextAction as (typeof EMIT_INTENT_ACTIONS)[number])) {
      await createActionIntent(workspaceId, {
        threadId,
        workUnitId: null,
        intentType: nextAction as "schedule_followup" | "request_disclosure_confirmation" | "escalate_to_human" | "pause_execution",
        payload: {
          workspace_id: workspaceId,
          thread_id: threadId,
          next_required_action: nextAction,
          source: "message_completion",
        },
        dedupeKey: `msg_complete:${id}:${nextAction}:${Date.now()}`,
      }).catch((err) => { console.error("[operational/action-intents/complete] error:", err instanceof Error ? err.message : err); });
    }
  }

  const wb = body.write_back;
  if (wb?.type === "connector_event" && wb.workspace_id === workspaceId && wb.channel && wb.external_id) {
    await db.from("connector_events").insert({
      workspace_id: wb.workspace_id,
      channel: wb.channel,
      external_id: wb.external_id,
      payload: wb.payload ?? {},
    });
  }
  if (
    wb?.type === "reciprocal_event" &&
    wb.workspace_id === workspaceId &&
    wb.thread_id &&
    wb.actor_role &&
    wb.operational_action
  ) {
    const { recordReciprocalEvent } = await import("@/lib/reciprocal-events");
    await recordReciprocalEvent({
      threadId: wb.thread_id,
      actorRole: wb.actor_role as "originator" | "counterparty" | "downstream" | "observer",
      operationalAction: wb.operational_action as OperationalAction,
    });
  }

  return NextResponse.json({ completed: true });
}

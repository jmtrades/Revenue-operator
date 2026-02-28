/**
 * Deterministic intent emission. No external calls. Doctrine-safe.
 * Emit only at: shared_transaction created (pending_ack), responsibility created, schedule_follow_up recorded.
 */

import { createActionIntent } from "./index";

const INTENT_SEND_PUBLIC_RECORD_LINK = "send_public_record_link" as const;
const INTENT_REQUEST_COUNTERPARTY_ACTION = "request_counterparty_action" as const;
const INTENT_CREATE_FOLLOWUP_COMMITMENT = "create_followup_commitment" as const;

/**
 * When a shared transaction is created with state pending_acknowledgement.
 * Dedupe: one per thread (thread is new, so one intent per thread).
 */
export async function emitSendPublicRecordLink(
  workspaceId: string,
  threadId: string,
  payload: { external_ref?: string; subject_type?: string; subject_id?: string }
): Promise<void> {
  const dedupeKey = `st:${threadId}:${INTENT_SEND_PUBLIC_RECORD_LINK}`;
  await createActionIntent(workspaceId, {
    threadId,
    intentType: INTENT_SEND_PUBLIC_RECORD_LINK,
    payload: { thread_id: threadId, ...payload },
    dedupeKey,
  });
}

/**
 * When a pending responsibility exists (after createResponsibilityForEvent).
 * Dedupe: one per (thread, required_action) so we do not flood.
 */
export async function emitRequestCounterpartyAction(
  workspaceId: string,
  threadId: string,
  payload: { required_action: string; assigned_role: string }
): Promise<void> {
  const dedupeKey = `resp:${threadId}:${payload.required_action}:${INTENT_REQUEST_COUNTERPARTY_ACTION}`;
  await createActionIntent(workspaceId, {
    threadId,
    intentType: INTENT_REQUEST_COUNTERPARTY_ACTION,
    payload: { thread_id: threadId, ...payload },
    dedupeKey,
  });
}

/**
 * When schedule_follow_up is recorded (reciprocal event).
 * Dedupe: one per (thread, event) - use thread + action type.
 */
export async function emitCreateFollowupCommitment(
  workspaceId: string,
  threadId: string,
  payload: { event_id?: string }
): Promise<void> {
  const dedupeKey = `re:${threadId}:schedule_follow_up:${INTENT_CREATE_FOLLOWUP_COMMITMENT}`;
  await createActionIntent(workspaceId, {
    threadId,
    intentType: INTENT_CREATE_FOLLOWUP_COMMITMENT,
    payload: { thread_id: threadId, ...payload },
    dedupeKey,
  });
}

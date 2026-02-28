/**
 * Action intents: universal execution interface.
 * This repo only creates and manages intents; no external API calls (Stripe/Twilio/Calendar) here.
 * External executor claims and completes intents. Append-only; no deletes.
 */

import { getDb } from "@/lib/db/queries";

export type IntentType =
  | "send_public_record_link"
  | "request_counterparty_action"
  | "create_followup_commitment"
  | "human_review_required"
  | "policy_violation_detected"
  | "template_missing"
  | "place_outbound_call"
  | "send_message"
  | "schedule_followup"
  | "request_document"
  | "collect_payment"
  | "escalate_to_human"
  | "generate_contract"
  | "request_disclosure_confirmation"
  | "record_verbal_consent"
  | "pause_execution";

export type ResultStatus = "succeeded" | "failed" | "skipped";

export interface CreateActionIntentInput {
  threadId?: string | null;
  workUnitId?: string | null;
  intentType: IntentType;
  payload: Record<string, unknown>;
  dedupeKey: string;
}

/**
 * Create an action intent. Idempotent via dedupe_key: on unique violation (23505) we ignore.
 * No external calls.
 */
export async function createActionIntent(
  workspaceId: string,
  input: CreateActionIntentInput
): Promise<string | null> {
  const db = getDb();
  try {
    const { data } = await db
      .from("action_intents")
      .insert({
        workspace_id: workspaceId,
        thread_id: input.threadId ?? null,
        work_unit_id: input.workUnitId ?? null,
        intent_type: input.intentType,
        payload_json: input.payload ?? {},
        dedupe_key: input.dedupeKey,
      })
      .select("id")
      .single();
    return (data as { id: string } | null)?.id ?? null;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return null;
    throw err;
  }
}

/**
 * Atomically claim the next unclaimed intent for the workspace (oldest first).
 * Update uses claimed_at IS NULL so only one worker can claim a given row. No external calls.
 */
export async function claimNextActionIntent(
  workspaceId: string,
  workerId: string
): Promise<ActionIntentRow | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: candidates } = await db
    .from("action_intents")
    .select("id, workspace_id, thread_id, work_unit_id, intent_type, payload_json, dedupe_key, created_at")
    .eq("workspace_id", workspaceId)
    .is("claimed_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  const candidate = candidates?.[0] as ActionIntentRow | undefined;
  if (!candidate?.id) return null;

  const { data: updated } = await db
    .from("action_intents")
    .update({ claimed_at: now, claimed_by: workerId })
    .eq("id", candidate.id)
    .is("claimed_at", null)
    .select("id, workspace_id, thread_id, work_unit_id, intent_type, payload_json, dedupe_key, created_at, claimed_at, claimed_by")
    .single();

  const row = updated as (ActionIntentRow & { claimed_at?: string; claimed_by?: string }) | null;
  return row ?? null;
}

export interface ActionIntentRow {
  id: string;
  workspace_id: string;
  thread_id: string | null;
  work_unit_id: string | null;
  intent_type: string;
  payload_json: Record<string, unknown>;
  dedupe_key: string;
  created_at: string;
  claimed_at?: string;
  claimed_by?: string;
}

/**
 * Mark an intent as completed. Sets completed_at, result_status, result_ref.
 * No external calls.
 */
export async function completeActionIntent(
  id: string,
  status: ResultStatus,
  resultRef?: string | null
): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { error } = await db
    .from("action_intents")
    .update({
      completed_at: now,
      result_status: status,
      result_ref: resultRef ?? null,
    })
    .eq("id", id);
  return !error;
}

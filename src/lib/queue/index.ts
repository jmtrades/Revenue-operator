/**
 * Queue abstraction. Source of truth is always DB (job_queue + job_claims).
 * Engines (commitment, opportunity, payment, shared-record, etc.) communicate only via
 * enqueued jobs and append-only events — no direct engine-to-engine calls.
 * No Redis dequeue: jobs are never lost on worker crash.
 * Guarantees: no silent action failure, no indefinite responsibility, demonstrable correctness.
 */

import { getDb } from "@/lib/db/queries";

import type { ActionCommand } from "@/lib/action-queue/types";

export type JobPayload =
  | { type: "process_webhook"; webhookId: string }
  | { type: "process_signal"; signalId: string }
  | { type: "decision"; leadId: string; workspaceId: string; eventId: string }
  | { type: "action"; action: ActionCommand; action_command_id?: string }
  | { type: "no_reply"; leadId: string }
  | { type: "no_show_reminder"; leadId: string }
  | { type: "reactivation"; leadId: string }
  | { type: "billing"; workspaceId: string }
  | { type: "zoom_webhook"; webhookId: string; workspaceId: string; meetingId: string; meetingUuid: string; event: string }
  | { type: "fetch_zoom_recording"; callSessionId: string; workspaceId: string; meetingId: string }
  | { type: "analyze_call"; callSessionId: string; workspaceId: string }
  | { type: "execute_post_call_plan"; callSessionId: string; workspaceId: string; leadId: string }
  | { type: "calendar_call_ended"; callSessionId: string }
  | { type: "post_call_unknown_checkin"; leadId: string; workspaceId: string; callSessionId: string }
  | { type: "closure_reconciliation"; workspaceId: string }
  | { type: "handoff_notify"; escalationId: string; workspaceId: string; leadId: string; decisionNeeded: string }
  | { type: "handoff_notify_batch"; escalationIds: string[]; workspaceId: string };

const DLQ_NAME = "ro:dlq";

/** Enqueue decision job only if no active plan with future next_action_at and no duplicate pending job. */
export async function enqueueDecision(
  leadId: string,
  workspaceId: string,
  eventId?: string
): Promise<string | null> {
  const { shouldEnqueueDecision } = await import("@/lib/plans/lead-plan");
  const check = await shouldEnqueueDecision(workspaceId, leadId);
  if (!check.enqueue && check.reason === "plan_scheduled") {
    return null;
  }
  const db = getDb();
  const { data: rows } = await db
    .from("job_queue")
    .select("id, payload")
    .eq("status", "pending")
    .eq("job_type", "decision")
    .limit(50);
  const hasDuplicate = (rows ?? []).some(
    (r: { payload?: { leadId?: string } }) => (r.payload as { leadId?: string })?.leadId === leadId
  );
  if (hasDuplicate) return null;
  return enqueue({
    type: "decision",
    leadId,
    workspaceId,
    eventId: eventId ?? leadId,
  });
}

/** Enqueue job. Always persists to DB (source of truth); jobs are not lost on crash. */
export async function enqueue(payload: JobPayload): Promise<string> {
  const db = getDb();
  const { data: inserted } = await db.from("job_queue").insert({
    job_type: payload.type,
    payload,
    status: "pending",
  }).select("id").single();
  return (inserted as { id?: string })?.id ?? crypto.randomUUID();
}

/** Claim TTL: 15 min so long jobs (slow provider, large workspaces) are not reclaimed mid-flight. */
export const CLAIM_TTL_SECONDS = 15 * 60;

export interface DequeueResult {
  id: string;
  payload: JobPayload;
  /** Set when job was claimed via DB RPC (job_claims). TTL uses DB now(), not worker clock. */
  claim?: { worker_id: string; job_id: string; expires_at: string; claim_ttl_seconds: number };
}

/** Process one job: claim via job_claims (SELECT FOR UPDATE SKIP LOCKED). Dequeue is always DB-backed so jobs are never lost. */
export async function dequeue(workerId?: string): Promise<DequeueResult | null> {
  const db = getDb();
  const wId = workerId ?? `worker-${crypto.randomUUID().slice(0, 8)}`;

  const { data: claimResult } = await db.rpc("claim_next_job", {
    p_worker_id: wId,
    p_ttl_seconds: CLAIM_TTL_SECONDS,
  });
  const jobId =
    typeof claimResult === "string"
      ? claimResult
      : (claimResult as { job_id?: string } | null)?.job_id ?? null;
  if (!jobId) return null;

  const { data: claimRow } = await db
    .from("job_claims")
    .select("worker_id, expires_at")
    .eq("job_id", jobId)
    .single();
  const claimMeta =
    claimRow && (claimRow as { expires_at?: string }).expires_at
      ? {
          worker_id: (claimRow as { worker_id: string }).worker_id,
          job_id: jobId,
          expires_at: (claimRow as { expires_at: string }).expires_at,
          claim_ttl_seconds: CLAIM_TTL_SECONDS,
        }
      : undefined;

  const { data: row } = await db
    .from("job_queue")
    .select("id, payload, job_type")
    .eq("id", jobId)
    .single();

  if (!row) return null;
  const r = row as { id: string; payload: unknown; job_type: string };

  await db
    .from("job_queue")
    .update({ status: "processing", locked_by: wId, locked_at: new Date().toISOString(), attempts: 1 })
    .eq("id", r.id);

  const payload = (typeof r.payload === "object" && r.payload !== null ? r.payload : {}) as JobPayload;
  if (!payload.type) (payload as { type: string }).type = r.job_type;
  return { id: r.id, payload, claim: claimMeta };
}

/** Move failed job to DLQ. */
export async function toDLQ(jobId: string, error: string): Promise<void> {
  const db = getDb();
  await db
    .from("job_queue")
    .update({ status: "dlq", error })
    .eq("id", jobId);
}

/** Mark job completed. Release claim so job cannot run again. */
export async function complete(jobId: string, completionId?: string): Promise<void> {
  const db = getDb();
  const cid = completionId ?? crypto.randomUUID();
  await db.from("job_claims").delete().eq("job_id", jobId);
  await db
    .from("job_queue")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
      completion_id: cid,
      locked_by: null,
      locked_at: null,
    })
    .eq("id", jobId);
}

/** Mark job failed. Release claim. */
export async function fail(jobId: string, error: string): Promise<void> {
  const db = getDb();
  await db.from("job_claims").delete().eq("job_id", jobId);
  await db
    .from("job_queue")
    .update({ status: "failed", error })
    .eq("id", jobId);
}

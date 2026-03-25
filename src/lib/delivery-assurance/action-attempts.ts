/**
 * Action delivery lifecycle: not complete when sent; complete when provider confirms.
 * Retry schedule: 1m, 5m, 15m, 1h, 6h, 24h. After max retries → DLQ and escalate.
 */

import { getDb } from "@/lib/db/queries";

const RETRY_DELAYS_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];
const MAX_ATTEMPTS = 1 + RETRY_DELAYS_MS.length; // first try + 6 retries

/** If provider never confirms delivery (e.g. non-Twilio), mark attempt failed after this and schedule retry or DLQ. */
export const DELIVERY_STALE_HOURS = 24;

export type AttemptStatus = "pending" | "sending" | "delivered" | "acknowledged" | "failed";

export interface ActionAttemptRow {
  id: string;
  action_command_id: string;
  attempt_number: number;
  status: string;
  provider_message_id: string | null;
  outbound_message_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  next_retry_at: string | null;
}

/** Create a new attempt for an action command. Returns attempt id. */
export async function createAttempt(
  actionCommandId: string,
  attemptNumber: number,
  outboundMessageId?: string
): Promise<string> {
  const db = getDb();
  const { data } = await db
    .from("action_attempts")
    .insert({
      action_command_id: actionCommandId,
      attempt_number: attemptNumber,
      status: "pending",
      outbound_message_id: outboundMessageId ?? null,
    })
    .select("id")
    .maybeSingle();
  return (data as { id: string }).id;
}

/** Mark attempt as sent; store provider message id. */
export async function markAttemptSent(
  attemptId: string,
  providerMessageId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db.from("action_attempts").select("action_command_id, attempt_number").eq("id", attemptId).maybeSingle();
  if (!row) return;
  const attemptNum = (row as { attempt_number: number }).attempt_number;
  const nextRetryAt = attemptNum < MAX_ATTEMPTS ? new Date(Date.now() + RETRY_DELAYS_MS[attemptNum - 1]).toISOString() : null;
  await db
    .from("action_attempts")
    .update({
      status: "sending",
      provider_message_id: providerMessageId,
      updated_at: now,
      next_retry_at: nextRetryAt,
    })
    .eq("id", attemptId);
}

/** Mark attempt delivered/acknowledged (provider callback). Marks action_command processed. */
export async function markAttemptDelivered(providerMessageId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: attempt } = await db
    .from("action_attempts")
    .select("id, action_command_id")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (!attempt) return false;
  const cmdId = (attempt as { action_command_id: string }).action_command_id;
  await db.from("action_attempts").update({ status: "acknowledged", updated_at: now }).eq("id", (attempt as { id: string }).id);
  await db.from("action_commands").update({ processed_at: now }).eq("id", cmdId);
  return true;
}

/** Mark attempt failed; set next_retry_at or DLQ if max attempts. */
export async function markAttemptFailed(
  attemptId: string,
  error: string
): Promise<{ actionCommandId: string; shouldDLQ: boolean }> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db.from("action_attempts").select("action_command_id, attempt_number").eq("id", attemptId).maybeSingle();
  if (!row) return { actionCommandId: "", shouldDLQ: false };
  const cmdId = (row as { action_command_id: string }).action_command_id;
  const num = (row as { attempt_number: number }).attempt_number;
  const shouldDLQ = num >= MAX_ATTEMPTS;
  const nextRetryAt =
    !shouldDLQ && num < MAX_ATTEMPTS ? new Date(Date.now() + RETRY_DELAYS_MS[num - 1]).toISOString() : null;
  await db
    .from("action_attempts")
    .update({ status: "failed", error, updated_at: now, next_retry_at: nextRetryAt })
    .eq("id", attemptId);
  return { actionCommandId: cmdId, shouldDLQ };
}

/** Mark attempts stuck in "sending" for > DELIVERY_STALE_HOURS as failed; set next_retry_at or DLQ. Run before getActionCommandsDueForSend. */
export async function markStaleSendingAttemptsAsFailed(): Promise<number> {
  const db = getDb();
  const staleAt = new Date(Date.now() - DELIVERY_STALE_HOURS * 60 * 60 * 1000).toISOString();
  const { data: stale } = await db
    .from("action_attempts")
    .select("id")
    .eq("status", "sending")
    .lt("updated_at", staleAt);
  if (!stale?.length) return 0;
  let marked = 0;
  for (const row of stale as { id: string }[]) {
    const { shouldDLQ } = await markAttemptFailed(row.id, "Delivery not confirmed within " + DELIVERY_STALE_HOURS + "h (stale sending)");
    if (shouldDLQ) {
      const { data: attempt } = await db.from("action_attempts").select("action_command_id").eq("id", row.id).maybeSingle();
      if (attempt) {
        const { toFailedJobAndEscalate } = await import("./dlq-handoff");
        const { data: cmd } = await db.from("action_commands").select("workspace_id, lead_id, payload, type").eq("id", (attempt as { action_command_id: string }).action_command_id).maybeSingle();
        if (cmd)
          await toFailedJobAndEscalate({
            workspaceId: (cmd as { workspace_id: string }).workspace_id,
            leadId: (cmd as { lead_id: string }).lead_id,
            jobType: (cmd as { type: string }).type,
            payload: (cmd as { payload: unknown }).payload as Record<string, unknown>,
            errorMessage: "Delivery not confirmed (stale sending)",
            stage: "action",
            attemptCount: MAX_ATTEMPTS,
          });
        await db.from("action_commands").update({ processed_at: new Date().toISOString() }).eq("id", (attempt as { action_command_id: string }).action_command_id);
      }
    }
    marked++;
  }
  return marked;
}

/** True if this action_command has any attempt in delivered or acknowledged. */
export async function hasDeliveredOrAcknowledgedAttempt(actionCommandId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("action_attempts")
    .select("id")
    .eq("action_command_id", actionCommandId)
    .in("status", ["delivered", "acknowledged"])
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Next attempt number (1..MAX_ATTEMPTS) or 0 if already delivered or over max. */
export async function getNextAttemptNumber(actionCommandId: string): Promise<number> {
  const db = getDb();
  if (await hasDeliveredOrAcknowledgedAttempt(actionCommandId)) return 0;
  const { data: attempts } = await db
    .from("action_attempts")
    .select("attempt_number")
    .eq("action_command_id", actionCommandId)
    .order("attempt_number", { ascending: false })
    .limit(1);
  const latest = (attempts ?? [])[0] as { attempt_number: number } | undefined;
  const next = latest ? latest.attempt_number + 1 : 1;
  return next > MAX_ATTEMPTS ? 0 : next;
}

/**
 * Get action commands due for (next) send. Attempts are the sole truth.
 * Due if: no attempt yet, OR last attempt is failed with next_retry_at <= now, OR last attempt is stale sending (handled by markStaleSendingAttemptsAsFailed first).
 * Call markStaleSendingAttemptsAsFailed() before this so stale "sending" attempts are marked failed and become due.
 */
export async function getActionCommandsDueForSend(limit: number): Promise<
  Array<{ id: string; workspace_id: string; lead_id: string; type: string; payload: unknown; dedup_key: string; attempt_number: number }>
> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: commands } = await db
    .from("action_commands")
    .select("id, workspace_id, lead_id, type, payload, dedup_key")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit * 2);
  if (!commands?.length) return [];
  const out: Array<{ id: string; workspace_id: string; lead_id: string; type: string; payload: unknown; dedup_key: string; attempt_number: number }> = [];
  for (const cmd of commands as { id: string; workspace_id: string; lead_id: string; type: string; payload: unknown; dedup_key: string }[]) {
    const { data: attempts } = await db
      .from("action_attempts")
      .select("id, status, next_retry_at, attempt_number")
      .eq("action_command_id", cmd.id)
      .order("attempt_number", { ascending: false })
      .limit(1);
    const latest = (attempts ?? [])[0] as { status: string; attempt_number: number; next_retry_at: string | null } | undefined;
    const hasDelivered = latest?.status === "delivered" || latest?.status === "acknowledged";
    if (hasDelivered) continue;
    const attemptNumber = latest ? latest.attempt_number + 1 : 1;
    if (attemptNumber > MAX_ATTEMPTS) continue;
    if (latest) {
      if (latest.status === "sending" || latest.status === "pending") continue;
      if (latest.status === "failed" && latest.next_retry_at != null && latest.next_retry_at > now) continue;
    }
    out.push({ ...cmd, attempt_number: attemptNumber });
    if (out.length >= limit) break;
  }
  return out;
}

export { MAX_ATTEMPTS, RETRY_DELAYS_MS };

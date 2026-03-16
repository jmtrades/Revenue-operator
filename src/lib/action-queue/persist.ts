/**
 * Action Layer — Persist to action_commands before enqueue. Dedup by dedup_key.
 *
 * Guarantee: unique(dedup_key) ensures at most one action_command per logical action;
 * with worker's outbound dedup_key check, no duplicate customer messages on retry/crash.
 */

import { getDb } from "@/lib/db/queries";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import type { ActionCommand } from "./types";

const TABLE = "action_commands";

/**
 * Persist command to action_commands. On dedup_key conflict, return existing id and skip enqueue.
 * Returns { id, isNew }.
 */
export async function persistActionCommand(command: ActionCommand): Promise<{ id: string; isNew: boolean }> {
  return runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    const row = {
      dedup_key: command.dedup_key,
      workspace_id: command.workspace_id,
      lead_id: command.lead_id,
      type: command.type,
      payload: command.payload,
    };
    const { data, error } = await db.from(TABLE).insert(row).select("id").maybeSingle();
    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await db.from(TABLE).select("id").eq("dedup_key", command.dedup_key).maybeSingle();
        return { id: (existing as { id: string })?.id ?? "", isNew: false };
      }
      throw error;
    }
    return { id: (data as { id: string }).id, isNew: true };
  });
}

/**
 * Mark action_command as processed. Idempotent.
 */
export async function markActionCommandProcessed(actionCommandId: string): Promise<void> {
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db
      .from(TABLE)
      .update({ processed_at: new Date().toISOString() })
      .eq("id", actionCommandId);
  });
}

/**
 * Check if already processed (skip duplicate execution).
 */
export async function isActionCommandProcessed(actionCommandId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db.from(TABLE).select("processed_at").eq("id", actionCommandId).maybeSingle();
  return (data as { processed_at: string | null } | null)?.processed_at != null;
}

const RETRY_DELAYS_MIN = [1, 5, 30, 60, 120, 240, 480, 720];

function nextRetryAt(attemptCount: number): string {
  const idx = Math.min(attemptCount, RETRY_DELAYS_MIN.length - 1);
  const delayMs = RETRY_DELAYS_MIN[idx] * 60 * 1000;
  return new Date(Date.now() + delayMs).toISOString();
}

/**
 * On send failure: increment attempt_count, set last_error and next_retry_at. Do not set processed_at.
 */
export async function scheduleActionRetry(actionCommandId: string, error: string): Promise<{ shouldDLQ: boolean }> {
  const db = getDb();
  const { data: row } = await db.from(TABLE).select("attempt_count").eq("id", actionCommandId).maybeSingle();
  const attempt = ((row as { attempt_count?: number })?.attempt_count ?? 0) + 1;
  const shouldDLQ = attempt >= 8;

  await db
    .from(TABLE)
    .update({
      attempt_count: attempt,
      last_error: error,
      next_retry_at: shouldDLQ ? null : nextRetryAt(attempt),
    })
    .eq("id", actionCommandId);

  return { shouldDLQ };
}

export interface DueActionRow {
  id: string;
  workspace_id: string;
  lead_id: string;
  type: string;
  payload: unknown;
  dedup_key: string;
}

/**
 * Claim and return action_commands due for retry (row-level lock, one worker per row).
 * Uses RPC claim_due_action_retries so the same command cannot be enqueued twice.
 * Guarantee: no duplicate execution.
 */
export async function getDueActionRetries(limit: number = 50): Promise<DueActionRow[]> {
  const db = getDb();
  try {
    const { data } = await db.rpc("claim_due_action_retries", { p_limit: Math.min(limit, 50) });
    return (data ?? []) as DueActionRow[];
  } catch {
    return [];
  }
}

/** No-op: claiming is done inside getDueActionRetries (RPC). Kept for backward compatibility. */
export async function claimActionRetry(_actionCommandId: string): Promise<void> {}

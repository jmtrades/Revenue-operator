/**
 * Shadow execution: record what would have happened when confidence gate blocks.
 * Observing/simulating only. No timestamps or counts in API output.
 */

import { getDb } from "@/lib/db/queries";

const ACTION_TO_STATEMENT: Record<string, string> = {
  message: "A response would have been sent.",
  payment_recovery: "A reminder would have been delivered.",
  commitment_recovery: "A confirmation would have been issued.",
  shared_transaction_reminder: "A reminder would have been delivered.",
  opportunity_revival: "A response would have been sent.",
  default: "An action would have been executed.",
};

const MAX_STATEMENT_LEN = 90;

function statementForAction(actionType: string): string {
  const raw = ACTION_TO_STATEMENT[actionType] ?? ACTION_TO_STATEMENT.default;
  return raw.length > MAX_STATEMENT_LEN ? raw.slice(0, MAX_STATEMENT_LEN).trim() : raw;
}

export async function recordShadowExecution(
  workspaceId: string,
  actionType: string,
  preventedReason: "observing" | "simulating"
): Promise<void> {
  const db = getDb();
  await db.from("shadow_execution_log").insert({
    workspace_id: workspaceId,
    action_type: actionType,
    would_have_executed_at: new Date().toISOString(),
    prevented_reason: preventedReason,
    created_at: new Date().toISOString(),
  });
}

export async function getWouldHaveActedStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const { data: rows } = await db
    .from("shadow_execution_log")
    .select("action_type")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const row of rows ?? []) {
    const actionType = (row as { action_type: string }).action_type;
    const st = statementForAction(actionType);
    if (!seen.has(st)) {
      seen.add(st);
      lines.push(st);
    }
  }
  return lines;
}

/**
 * Off-platform reference detection: when new threads reference past threads within 48h by different participants.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { log } from "@/lib/logger";

const logOffPlatformReferenceSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `off-platform-reference.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Detect and record when a new thread references a past thread within 48h by different participant.
 */
export async function detectAndRecordOffPlatformReference(
  workspaceId: string,
  newThreadId: string,
  referencedThreadId: string
): Promise<void> {
  const db = getDb();
  
  const { data: ref } = await db
    .from("thread_reference_memory")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", referencedThreadId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!ref) return;
  
  const refTime = new Date((ref as { recorded_at: string }).recorded_at).getTime();
  const now = Date.now();
  const hoursDiff = (now - refTime) / (1000 * 60 * 60);
  
  if (hoursDiff > 48) return;
  
  const { data: newThread } = await db
    .from("shared_transactions")
    .select("counterparty_identifier")
    .eq("id", newThreadId)
    .maybeSingle();
  
  const { data: oldThread } = await db
    .from("shared_transactions")
    .select("counterparty_identifier")
    .eq("id", referencedThreadId)
    .maybeSingle();
  
  if (!newThread || !oldThread) return;
  
  const newCounterparty = (newThread as { counterparty_identifier: string }).counterparty_identifier;
  const oldCounterparty = (oldThread as { counterparty_identifier: string }).counterparty_identifier;
  
  if (newCounterparty === oldCounterparty) return;
  
  const { data: existing } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "This record informed subsequent work.")
    .limit(1)
    .maybeSingle();
  
  if (!existing) {
    await recordOrientationStatement(workspaceId, "This record informed subsequent work.").catch(logOffPlatformReferenceSideEffect("record-statement"));
  }
}

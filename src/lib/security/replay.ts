/**
 * Cryptographic replay defense.
 * Insert (workspace_id, signature, timestamp) before processing.
 * Reject on duplicate.
 */

import { getDb } from "@/lib/db/queries";

export async function claimReplayNonce(
  workspaceId: string,
  signature: string,
  timestampMs: number
): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from("replay_defense").insert({
    workspace_id: workspaceId,
    signature,
    timestamp_ms: timestampMs,
  });
  if (error) {
    const errStr = typeof error === "string" ? error : (error as { message?: string })?.message ?? String(error);
    const isDup = errStr.includes("duplicate") || errStr.includes("unique");
    return !isDup;
  }
  return true;
}

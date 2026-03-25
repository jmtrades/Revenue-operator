/**
 * Outbound suppression: prevent double-nudge. TTL per (workspace, counterparty, key).
 */

import { getDb } from "@/lib/db/queries";

/**
 * If no row or suppressed_until expired: insert/extend and return false (do not suppress).
 * Else return true (suppress).
 */
export async function shouldSuppressOutbound(
  workspaceId: string,
  counterpartyIdentifier: string,
  suppressionKey: string,
  ttlMinutes: number
): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const suppressedUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

  const { data: row } = await db
    .from("outbound_suppression")
    .select("id, suppressed_until")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .eq("suppression_key", suppressionKey)
    .maybeSingle();

  if (!row) {
    await db.from("outbound_suppression").upsert(
      {
        workspace_id: workspaceId,
        counterparty_identifier: counterpartyIdentifier,
        suppression_key: suppressionKey,
        suppressed_until: suppressedUntil,
        created_at: now.toISOString(),
      },
      { onConflict: "workspace_id,counterparty_identifier,suppression_key" }
    );
    return false;
  }

  const until = (row as { suppressed_until: string }).suppressed_until;
  if (new Date(until) <= now) {
    await db
      .from("outbound_suppression")
      .update({ suppressed_until: suppressedUntil })
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", counterpartyIdentifier)
      .eq("suppression_key", suppressionKey);
    return false;
  }
  return true;
}

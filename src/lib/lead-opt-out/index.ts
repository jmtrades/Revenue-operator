/**
 * Lead opt-out: STOP/UNSUBSCRIBE. Action worker checks before send.
 */

import { getDb } from "@/lib/db/queries";

export async function isOptedOut(workspaceId: string, counterpartyIdentifier: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("lead_opt_out")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  return !!data;
}

export async function recordOptOut(workspaceId: string, counterpartyIdentifier: string): Promise<void> {
  const db = getDb();
  await db.from("lead_opt_out").upsert(
    {
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      created_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,counterparty_identifier", ignoreDuplicates: true }
  );
}

/** True if message body indicates opt-out (STOP, UNSUBSCRIBE, etc.). */
export function messageIndicatesOptOut(body: string): boolean {
  const normalized = (body ?? "").trim().toUpperCase();
  if (/^\s*STOP\s*$/.test(normalized)) return true;
  if (/^\s*UNSUBSCRIBE\s*$/.test(normalized)) return true;
  if (/\bSTOP\b/.test(normalized) && normalized.length < 20) return true;
  if (/\bUNSUBSCRIBE\b/.test(normalized) && normalized.length < 25) return true;
  return false;
}

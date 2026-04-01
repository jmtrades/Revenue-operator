/**
 * Installation confirmation: detect when operational recording becomes active.
 * One-time state: first acknowledged thread, proof capsule, absence moment all exist.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";

/**
 * Check and confirm installation if all conditions met.
 * Returns true if confirmation was just set (first time).
 */
export async function checkAndConfirmInstallation(workspaceId: string): Promise<boolean> {
  const db = getDb();
  
  const { data: workspace } = await db
    .from("workspaces")
    .select("installation_confirmed_at")
    .eq("id", workspaceId)
    .maybeSingle();
  
  if (!workspace) return false;
  
  if ((workspace as { installation_confirmed_at: string | null }).installation_confirmed_at) {
    return false;
  }
  
  const { data: acknowledgedThread } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .limit(1)
    .maybeSingle();
  
  if (!acknowledgedThread) return false;
  
  const { data: proofCapsule } = await db
    .from("proof_capsules")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  
  if (!proofCapsule) return false;
  
  const { data: absenceMoment } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or("text.ilike.%removed%,text.ilike.%disabled%,text.ilike.%absence%")
    .limit(1)
    .maybeSingle();
  
  if (!absenceMoment) return false;
  
  const now = new Date().toISOString();
  await db
    .from("workspaces")
    .update({ installation_confirmed_at: now })
    .eq("id", workspaceId);
  
  await recordOrientationStatement(workspaceId, "Operational recording is now active.").catch((e) => {
    log("error", "recordOrientationStatement failed", { error: e instanceof Error ? e.message : String(e) });
  });
  
  return true;
}

/**
 * Preview / Simulation mode.
 * When enabled: full reasoning runs, actions NOT sent, logged as simulated.
 */

import { getDb } from "@/lib/db/queries";

export async function isPreviewMode(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("settings")
    .select("preview_mode")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as { preview_mode?: boolean })?.preview_mode ?? false;
}

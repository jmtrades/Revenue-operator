/**
 * Cold start priors: new workspace uses defaults until sufficient data.
 */

import { getDb } from "@/lib/db/queries";

const MIN_DEALS_FOR_LEARNING = 5;
const WORKSPACE_AGE_DAYS_FOR_LEARNING = 7;
const MIN_MESSAGES_FOR_LEARNING = 20;

export async function isColdStart(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("created_at").eq("id", workspaceId).maybeSingle();
  if (!ws) return true;
  const created = new Date((ws as { created_at: string }).created_at);
  const ageDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < WORKSPACE_AGE_DAYS_FOR_LEARNING) return true;

  const { count: dealCount } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if ((dealCount ?? 0) < MIN_DEALS_FOR_LEARNING) return true;

  const { data: leadIds } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
  const ids = (leadIds ?? []).map((l: { id: string }) => l.id);
  if (ids.length === 0) return true;
  const { data: convs } = await db.from("conversations").select("id").in("lead_id", ids);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  if (convIds.length === 0) return true;
  const { count: msgCount } = await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", convIds);
  if ((msgCount ?? 0) < MIN_MESSAGES_FOR_LEARNING) return true;

  return false;
}

export const COLD_START_PREDICTION_WEIGHT = 0.5;
export const COLD_START_FOLLOW_UP_HOURS = 8;

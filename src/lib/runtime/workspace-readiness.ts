/**
 * Installation readiness for a workspace. Used by /api/responsibility.
 */

import { getDb } from "@/lib/db/queries";

const MESSAGING_DAYS = 30;
const RECENT_ACTIVITY_DAYS = 14;

export interface WorkspaceReadiness {
  messaging_connected: boolean;
  payments_connected: boolean;
  settlement_active: boolean;
  has_recent_activity: boolean;
}

export async function getWorkspaceReadiness(workspaceId: string): Promise<WorkspaceReadiness> {
  const db = getDb();
  const now = new Date();

  const messagingSince = new Date(now.getTime() - MESSAGING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const activitySince = new Date(now.getTime() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: leadRows } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
  const leadIds = (leadRows ?? []).map((r: { id: string }) => r.id);
  if (leadIds.length === 0) {
    const [paymentExists, settlementActive, economicRecent] = await Promise.all([
      db.from("payment_obligations").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle().then((r) => !!r.data),
      db.from("settlement_accounts").select("workspace_id").eq("workspace_id", workspaceId).eq("settlement_state", "active").limit(1).maybeSingle().then((r) => !!r.data),
      db.from("economic_events").select("id").eq("workspace_id", workspaceId).gte("created_at", activitySince).limit(1).maybeSingle().then((r) => !!r.data),
    ]);
    return {
      messaging_connected: false,
      payments_connected: paymentExists,
      settlement_active: settlementActive,
      has_recent_activity: economicRecent,
    };
  }

  const { data: convRows } = await db.from("conversations").select("id").in("lead_id", leadIds);
  const conversationIds = (convRows ?? []).map((r: { id: string }) => r.id);

  const [paymentRow, settlementRow, economicRow] = await Promise.all([
    db.from("payment_obligations").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
    db.from("settlement_accounts").select("workspace_id").eq("workspace_id", workspaceId).eq("settlement_state", "active").limit(1).maybeSingle(),
    db.from("economic_events").select("id").eq("workspace_id", workspaceId).gte("created_at", activitySince).limit(1).maybeSingle(),
  ]);

  let inboundRecent = false;
  if (conversationIds.length > 0) {
    const { data: msg } = await db
      .from("messages")
      .select("id")
      .in("conversation_id", conversationIds)
      .gte("created_at", messagingSince)
      .limit(1)
      .maybeSingle();
    inboundRecent = !!msg;
  }

  return {
    messaging_connected: conversationIds.length > 0 || inboundRecent,
    payments_connected: !!paymentRow.data,
    settlement_active: !!settlementRow.data,
    has_recent_activity: !!economicRow.data,
  };
}

export type InstallationState = "ready" | "partial" | "empty";

export function installationStateFromReadiness(r: WorkspaceReadiness): InstallationState {
  const some = r.messaging_connected || r.payments_connected || r.settlement_active || r.has_recent_activity;
  if (r.messaging_connected && r.has_recent_activity) return "ready";
  if (some) return "partial";
  return "empty";
}

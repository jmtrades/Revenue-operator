/**
 * Notification center: create and query in-app notifications.
 * Notifications are per-user; create for all workspace members to broadcast.
 */

import { getDb } from "@/lib/db/queries";

export type NotificationType =
  | "new_lead"
  | "call_completed"
  | "appointment_booked"
  | "campaign_milestone"
  | "quality_alert"
  | "billing_event"
  | "system_update";

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for every member of the workspace.
 * Falls back to workspace owner if no members in workspace_members.
 */
export async function createWorkspaceNotification(
  workspaceId: string,
  input: CreateNotificationInput
): Promise<void> {
  const db = getDb();
  const { data: members } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);
  let userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
  if (userIds.length === 0) {
    const { data: ws } = await db
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();
    const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
    if (ownerId) userIds = [ownerId];
    else return;
  }
  if (userIds.length === 0) return;

  const rows = userIds.map((user_id: string) => ({
    workspace_id: workspaceId,
    user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    read: false,
  }));

  await db.from("notifications").insert(rows);
}

/**
 * Create a notification for a single user (e.g. assignee).
 */
export async function createUserNotification(
  workspaceId: string,
  userId: string,
  input: CreateNotificationInput
): Promise<void> {
  const db = getDb();
  await db.from("notifications").insert({
    workspace_id: workspaceId,
    user_id: userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    read: false,
  });
}

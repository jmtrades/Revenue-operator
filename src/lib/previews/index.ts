/**
 * Pending action previews and executed action types. Canonical, idempotent.
 */

import { getDb } from "@/lib/db/queries";

export async function setPendingPreview(
  workspaceId: string,
  actionType: string,
  previewText: string,
  willExecuteAt?: Date | null
): Promise<void> {
  const db = getDb();
  await db.from("pending_action_previews").upsert(
    {
      workspace_id: workspaceId,
      action_type: actionType,
      preview_text: previewText,
      will_execute_at: willExecuteAt?.toISOString() ?? null,
    },
    { onConflict: "workspace_id,action_type" }
  );
}

export async function removePreview(workspaceId: string, actionType: string): Promise<void> {
  const db = getDb();
  await db.from("pending_action_previews").delete().eq("workspace_id", workspaceId).eq("action_type", actionType);
}

export async function markExecutedActionType(workspaceId: string, actionType: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from("executed_action_types").insert({
    workspace_id: workspaceId,
    action_type: actionType,
  });
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);
}

export async function hasExecutedActionType(workspaceId: string, actionType: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("executed_action_types")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("action_type", actionType)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function listPendingPreviews(workspaceId: string): Promise<
  { action_type: string; preview_text: string; will_execute_at: string | null }[]
> {
  const db = getDb();
  const { data } = await db
    .from("pending_action_previews")
    .select("action_type, preview_text, will_execute_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  return (data ?? []) as { action_type: string; preview_text: string; will_execute_at: string | null }[];
}

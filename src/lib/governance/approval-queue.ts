/**
 * Message approval queue: create pending, list pending, approve/reject. No external calls.
 */

import { getDb } from "@/lib/db/queries";

export interface CreateMessageApprovalInput {
  workspace_id: string;
  proposed_message: string;
  template_id?: string | null;
  policy_id?: string | null;
  conversation_id?: string | null;
  work_unit_id?: string | null;
  thread_id?: string | null;
}

export async function createMessageApproval(input: CreateMessageApprovalInput): Promise<string> {
  const db = getDb();
  const { data } = await db
    .from("message_approvals")
    .insert({
      workspace_id: input.workspace_id,
      proposed_message: input.proposed_message,
      template_id: input.template_id ?? null,
      policy_id: input.policy_id ?? null,
      conversation_id: input.conversation_id ?? null,
      work_unit_id: input.work_unit_id ?? null,
      thread_id: input.thread_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  return (data as { id: string }).id;
}

export interface PendingApprovalRow {
  id: string;
  proposed_message: string;
  created_at: string;
  thread_id: string | null;
  conversation_id: string | null;
}

export async function getPendingApprovals(workspaceId: string, limit: number): Promise<PendingApprovalRow[]> {
  const db = getDb();
  const { data } = await db
    .from("message_approvals")
    .select("id, proposed_message, created_at, thread_id, conversation_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PendingApprovalRow[];
}

export async function decideApproval(
  approvalId: string,
  workspaceId: string,
  decision: "approved" | "rejected",
  decidedBy: string | null
): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("message_approvals")
    .update({
      status: decision,
      decided_at: now,
      decided_by: decidedBy,
    })
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  return !error && !!data;
}

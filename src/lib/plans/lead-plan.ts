/**
 * Lead Plans — Single authority scheduler.
 * At most ONE active plan per lead. All scheduling goes through here.
 */

import { getDb } from "@/lib/db/queries";

export interface LeadPlanInput {
  next_action_type: string;
  next_action_at: string;
  sequence_id?: string | null;
  sequence_step?: number | null;
}

export interface LeadPlan {
  id: string;
  workspace_id: string;
  lead_id: string;
  status: "active" | "completed" | "cancelled";
  next_action_type: string;
  next_action_at: string;
  sequence_id: string | null;
  sequence_step: number | null;
  created_at: string;
  updated_at: string;
  cancelled_reason: string | null;
}

export async function getActiveLeadPlan(
  workspaceId: string,
  leadId: string
): Promise<LeadPlan | null> {
  const db = getDb();
  const { data } = await db
    .from("lead_plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "active")
    .maybeSingle();
  return (data as LeadPlan | null) ?? null;
}

export async function setLeadPlan(
  workspaceId: string,
  leadId: string,
  plan: LeadPlanInput
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = await getActiveLeadPlan(workspaceId, leadId);
  if (existing) {
    await db
      .from("lead_plans")
      .update({
        status: "cancelled",
        cancelled_reason: "superseded",
        updated_at: now,
      })
      .eq("id", existing.id);
  }

  await db.from("lead_plans").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    status: "active",
    next_action_type: plan.next_action_type,
    next_action_at: plan.next_action_at,
    sequence_id: plan.sequence_id ?? null,
    sequence_step: plan.sequence_step ?? null,
  });
}

export async function completeLeadPlan(
  workspaceId: string,
  leadId: string
): Promise<void> {
  const db = getDb();
  const plan = await getActiveLeadPlan(workspaceId, leadId);
  if (plan) {
    await db
      .from("lead_plans")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", plan.id);
  }
}

export async function cancelLeadPlan(
  workspaceId: string,
  leadId: string,
  reason: string
): Promise<void> {
  const db = getDb();
  const plan = await getActiveLeadPlan(workspaceId, leadId);
  if (plan) {
    await db
      .from("lead_plans")
      .update({
        status: "cancelled",
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);
  }
}

/** Check if we should enqueue a decision job: no active plan with future next_action_at, or plan is due. */
export async function shouldEnqueueDecision(
  workspaceId: string,
  leadId: string,
  _proposedAt?: Date
): Promise<{ enqueue: boolean; reason?: string; existingPlan?: LeadPlan }> {
  const plan = await getActiveLeadPlan(workspaceId, leadId);
  if (!plan) return { enqueue: true };

  const nextAt = new Date(plan.next_action_at);
  const now = new Date();
  const slackMs = 60 * 1000;
  if (nextAt.getTime() > now.getTime() + slackMs) {
    return {
      enqueue: false,
      reason: "plan_scheduled",
      existingPlan: plan,
    };
  }
  return { enqueue: true, existingPlan: plan };
}

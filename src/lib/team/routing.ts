/**
 * Team mode: lead routing by role
 * Hot leads → closer, others → operator
 */

import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export type TeamRole = "owner" | "manager" | "closer";

const HOT_PROBABILITY_THRESHOLD = 0.6;

export async function routeLead(
  leadId: string,
  workspaceId: string
): Promise<{ assignTo: string | null; reason: string }> {
  const db = getDb();
  const { data: closers } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "closer");

  if (!closers?.length) return { assignTo: null, reason: "No closers configured" };

  const { data: deal } = await db
    .from("deals")
    .select("id")
    .eq("lead_id", leadId)
    .neq("status", "lost")
    .limit(1)
    .single();

  let isHot = false;
  if (deal) {
    const pred = await predictDealOutcome((deal as { id: string }).id);
    isHot = pred.probability >= HOT_PROBABILITY_THRESHOLD;
  }

  if (isHot) {
    const closer = closers[Math.floor(Math.random() * closers.length)] as { user_id: string };
    await db.from("lead_assignments").upsert(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        assigned_to: closer.user_id,
        reason: "hot_lead",
      },
      { onConflict: "lead_id" }
    );
    return { assignTo: closer.user_id, reason: "Hot lead → closer" };
  }

  return { assignTo: null, reason: "Routed to operator" };
}

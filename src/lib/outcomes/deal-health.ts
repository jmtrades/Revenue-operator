/**
 * Deal Health Monitor
 * Detects: silent hesitation after call, proposal ignored, stalled negotiation.
 * When detected: enqueues targeted follow-ups via decision pipeline.
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";

const HESITATION_HOURS = 48;
const STALL_HOURS = 96;

/** Check deal health and enqueue follow-ups when risks detected. */
export async function monitorDealHealth(leadId: string): Promise<{ risk?: string } | null> {
  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id, state, last_activity_at")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const l = lead as { workspace_id: string; state: string; last_activity_at: string | null };
  const workspaceId = l.workspace_id;

  if (!["BOOKED", "SHOWED", "QUALIFIED", "ENGAGED"].includes(l.state)) return null;

  const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : null;
  const now = new Date();
  const hoursSinceActivity = lastActivity
    ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    : 999;

  const { data: lastSession } = await db
    .from("call_sessions")
    .select("call_ended_at, show_status")
    .eq("lead_id", leadId)
    .not("call_ended_at", "is", null)
    .order("call_ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sessionEndedAt = lastSession ? new Date((lastSession as { call_ended_at: string }).call_ended_at) : null;
  const hoursSinceCall = sessionEndedAt
    ? (now.getTime() - sessionEndedAt.getTime()) / (1000 * 60 * 60)
    : 999;

  if (l.state === "SHOWED" && hoursSinceCall >= HESITATION_HOURS && hoursSinceActivity >= HESITATION_HOURS) {
    await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
    return { risk: "silent_hesitation_after_call" };
  }

  if ((l.state === "QUALIFIED" || l.state === "ENGAGED") && hoursSinceActivity >= STALL_HOURS) {
    await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
    return { risk: "stalled_negotiation" };
  }

  return null;
}

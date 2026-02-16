/**
 * AttendanceOperator — prevents no-shows and primes attendance.
 * Schedules reminders/confirmations for scheduled leads; triggers recovery on no-show.
 */

import { getDb } from "@/lib/db/queries";
import { enqueueDecision } from "@/lib/queue";
import { upsertRevenueLifecycle } from "@/lib/revenue-lifecycle";

export const ATTENDANCE_OPERATOR = "AttendanceOperator";

/** Find leads with upcoming appointments (scheduled / secured); enqueue decision for reminder/confirmation */
export async function runAttendanceOperator(workspaceId: string): Promise<{ scheduled: number }> {
  const db = getDb();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: rows } = await db
    .from("revenue_lifecycles")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .eq("lifecycle_stage", "scheduled")
    .eq("revenue_state", "scheduled")
    .not("next_expected_visit_at", "is", null)
    .lte("next_expected_visit_at", in24h.toISOString());

  if (!rows?.length) return { scheduled: 0 };

  let scheduled = 0;
  for (const row of rows as { lead_id: string }[]) {
    await enqueueDecision(row.lead_id, workspaceId, row.lead_id).catch(() => {});
    scheduled += 1;
  }
  return { scheduled };
}

/** Mark no-show and move to at_risk; retention operator will run recovery */
export async function recordNoShow(leadId: string, workspaceId: string): Promise<void> {
  await upsertRevenueLifecycle(leadId, workspaceId, {
    lifecycle_stage: "at_risk",
    revenue_state: "at_risk",
    dropoff_risk: 0.8,
  });
}

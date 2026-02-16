/**
 * RetentionOperator — reactivates and generates repeat revenue.
 * Acts without conversation activity: expected return window, cancellation, no-show, long silence.
 */

import { getDb } from "@/lib/db/queries";
import { enqueueDecision } from "@/lib/queue";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { upsertRevenueLifecycle } from "@/lib/revenue-lifecycle";

export const RETENTION_OPERATOR = "RetentionOperator";

/** Expected return window passed → schedule check-in */
export async function runRetentionCheckIns(workspaceId: string): Promise<{ scheduled: number }> {
  const db = getDb();
  const now = new Date();

  const { data: rows } = await db
    .from("revenue_lifecycles")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .not("next_expected_visit_at", "is", null)
    .lt("next_expected_visit_at", now.toISOString())
    .in("lifecycle_stage", ["client", "repeat_client", "showed"]);

  if (!rows?.length) return { scheduled: 0 };

  let scheduled = 0;
  for (const row of rows as { lead_id: string }[]) {
    await enqueueDecision(row.lead_id, workspaceId, row.lead_id).catch(() => {});
    scheduled += 1;
  }
  return { scheduled };
}

/** at_risk / lost / long silence → reactivation sequence */
export async function runRetentionReactivation(workspaceId: string): Promise<{ scheduled: number }> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const { data: rows } = await db
    .from("revenue_lifecycles")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .in("revenue_state", ["at_risk", "lost"])
    .in("lifecycle_stage", ["at_risk", "lost"]);

  if (!rows?.length) return { scheduled: 0 };

  const leadIds = (rows as { lead_id: string }[]).map((r) => r.lead_id);
  const { data: leads } = await db
    .from("leads")
    .select("id, last_activity_at, state")
    .in("id", leadIds);

  let scheduled = 0;
  for (const lead of leads ?? []) {
    const l = lead as { id: string; last_activity_at: string | null; state: string };
    if (l.state === "REACTIVATE") continue;
    const last = l.last_activity_at ? new Date(l.last_activity_at) : null;
    if (last && last.getTime() > cutoff.getTime()) continue;
    const nextAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await setLeadPlan(workspaceId, l.id, {
      next_action_type: "reactivation",
      next_action_at: nextAt.toISOString(),
    }).catch(() => {});
    await enqueueDecision(l.id, workspaceId, l.id).catch(() => {});
    scheduled += 1;
  }
  return { scheduled };
}

/** No-show → recovery path + reschedule (called from attendance or event handler) */
export async function runRetentionNoShowRecovery(leadId: string, workspaceId: string): Promise<void> {
  await upsertRevenueLifecycle(leadId, workspaceId, {
    lifecycle_stage: "at_risk",
    revenue_state: "at_risk",
    dropoff_risk: 0.7,
  });
  await enqueueDecision(leadId, workspaceId, leadId).catch(() => {});
}

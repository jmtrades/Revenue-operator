/**
 * ConversionOperator — drives booking commitment.
 * Schedules actions for leads in active_prospect / potential that need a nudge to book.
 */

import { getDb } from "@/lib/db/queries";
import { enqueueDecision } from "@/lib/queue";
import { log } from "@/lib/logger";

const logConversionOperatorSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `conversion-operator.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

export const CONVERSION_OPERATOR = "ConversionOperator";

/** Find leads in active_prospect/potential with recent activity and no booking; enqueue decision to drive booking */
export async function runConversionOperator(workspaceId: string): Promise<{ scheduled: number }> {
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: rows } = await db
    .from("revenue_lifecycles")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .in("lifecycle_stage", ["new_lead", "active_prospect"])
    .eq("revenue_state", "potential")
    .is("booked_at", null);

  if (!rows?.length) return { scheduled: 0 };

  const leadIds = (rows as { lead_id: string }[]).map((r) => r.lead_id);
  const { data: leads } = await db
    .from("leads")
    .select("id, last_activity_at, state")
    .in("id", leadIds)
    .gte("last_activity_at", cutoff.toISOString());

  let scheduled = 0;
  for (const lead of leads ?? []) {
    const l = lead as { id: string; state: string };
    if (["BOOKED", "SHOWED", "WON", "LOST", "CLOSED"].includes(l.state)) continue;
    await enqueueDecision(l.id, workspaceId, l.id).catch(logConversionOperatorSideEffect("enqueue-decision"));
    scheduled += 1;
  }
  return { scheduled };
}

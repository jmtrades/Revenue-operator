/**
 * Guarantee Layer cron — commitment stability first (prevent), then time-based invariants (react).
 * Run periodically (e.g. every 15–30 min): GET /api/cron/guarantee
 * Deterministic state only. No user-visible scoring.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { updateCommitmentPressure, enforceCommitmentStability } from "@/lib/guarantee/commitment-stability";
import { updateCapacityPressure } from "@/lib/guarantee/capacity-stability";
import { updateEconomicPriority } from "@/lib/guarantee/economic-priority";
import { updateTemporalUrgency } from "@/lib/guarantee/temporal-urgency";
import { updateTrajectoryState } from "@/lib/guarantee/trajectory";
import { evaluateGuaranteesForLead } from "@/lib/guarantee/evaluate";
import { enforceBreach } from "@/lib/guarantee/enforce";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const BATCH = 50;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, workspace_id, state, last_activity_at, opt_out")
    .eq("opt_out", false)
    .in("state", [
      "CONTACTED",
      "ENGAGED",
      "QUALIFIED",
      "BOOKED",
      "REACTIVATE",
      "ATTENDED",
      "REPEAT",
    ])
    .limit(BATCH);

  const workspaceIds = [...new Set((leads ?? []).map((l: { workspace_id: string }) => l.workspace_id))];
  for (const wid of workspaceIds) {
    await updateCapacityPressure(wid);
    await updateTrajectoryState(wid);
  }

  let commitment_stabilization = 0;
  let commitment_reassurance = 0;
  let commitment_escalated = 0;
  let breachesFound = 0;
  let corrective = 0;
  let escalated = 0;

  for (const lead of leads ?? []) {
    const l = lead as { id: string; workspace_id: string; state: string; last_activity_at: string | null; opt_out?: boolean };

    await updateEconomicPriority(l.id, l.workspace_id);
    await updateTemporalUrgency(l.id, l.workspace_id);

    // 1) Commitment stability (preventative) — runs BEFORE time-based invariants
    await updateCommitmentPressure(l.id, l.workspace_id);
    const commitmentResult = await enforceCommitmentStability(l.id, l.workspace_id);
    if (commitmentResult === "stabilization") commitment_stabilization++;
    else if (commitmentResult === "reassurance") commitment_reassurance++;
    else if (commitmentResult === "escalated") commitment_escalated++;

    // 2) Time-based invariants (reactive)
    const breaches = await evaluateGuaranteesForLead({
      leadId: l.id,
      workspaceId: l.workspace_id,
      state: l.state,
      lastActivityAt: l.last_activity_at,
      optOut: l.opt_out,
    });
    for (const breach of breaches) {
      breachesFound++;
      const result = await enforceBreach(breach);
      if (result === "corrective") corrective++;
      else escalated++;
    }
  }

  return NextResponse.json({
    ok: true,
    leads_checked: (leads ?? []).length,
    commitment_stabilization,
    commitment_reassurance,
    commitment_escalated,
    breaches_found: breachesFound,
    corrective,
    escalated,
  });
}

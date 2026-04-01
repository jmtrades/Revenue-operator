/**
 * Cron: economic activation. Every 30 minutes.
 * 1) Update economic_participation (recompute economic_active)
 * 2) Activate workspaces where economic_active = true
 * 3) Run usage metering for activated workspaces (daily period)
 * No UI, no emails.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import {
  recomputeEconomicActive,
  ensureActivation,
  aggregateAndAppendUsageForPeriod,
} from "@/lib/economic-participation";
import { log } from "@/lib/logger";

function yesterdayPeriod(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();

  const { data: participationRows } = await db
    .from("economic_participation")
    .select("workspace_id");
  const workspaceIds = [
    ...new Set((participationRows ?? []).map((r: { workspace_id: string }) => r.workspace_id)),
  ];
  for (const workspaceId of workspaceIds) {
    await recomputeEconomicActive(workspaceId);
  }

  const { data: activeRows } = await db
    .from("economic_participation")
    .select("workspace_id")
    .eq("economic_active", true);
  const activeWorkspaceIds = [
    ...new Set((activeRows ?? []).map((r: { workspace_id: string }) => r.workspace_id)),
  ];
  let activated = 0;
  for (const workspaceId of activeWorkspaceIds) {
    const inserted = await ensureActivation(workspaceId);
    if (inserted) activated++;
  }

  const { data: activationRows } = await db.from("economic_activation").select("workspace_id");
  const activatedWorkspaceIds = (activationRows ?? []).map((r: { workspace_id: string }) => r.workspace_id);
  const period = yesterdayPeriod();
  for (const workspaceId of activatedWorkspaceIds) {
    await aggregateAndAppendUsageForPeriod(workspaceId, period.start, period.end).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
  }

  return NextResponse.json({
    ok: true,
    participation_updated: workspaceIds.length,
    activations_inserted: activated,
    usage_metered_workspaces: activatedWorkspaceIds.length,
  });
}

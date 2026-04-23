/**
 * Cron: Evaluate workspace objectives and update strategy.
 * Run every 30 minutes via external cron: GET /api/cron/objectives
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { evaluateWorkspaceObjective, evaluateRevenueObjective } from "@/lib/objectives/engine";
import { planWorkspaceStrategy } from "@/lib/strategy/planner";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active");

  let evaluated = 0;
  for (const ws of workspaces ?? []) {
    const workspaceId = (ws as { id: string }).id;
    try {
      const objective = await evaluateWorkspaceObjective(workspaceId);
      let revenueStatus: "ahead" | "on_track" | "behind" | null = null;
      try {
        const rev = await evaluateRevenueObjective(workspaceId);
        if (rev) revenueStatus = rev.status;
      } catch {
        // Non-blocking
      }
      if (objective) {
        await planWorkspaceStrategy(workspaceId, objective.status, revenueStatus);
        evaluated++;
      }
    } catch (err) {
      log("error", "[cron/objectives] Failed to evaluate workspace objective", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, evaluated });
}

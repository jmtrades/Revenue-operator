export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";

/**
 * GET /api/cron/self-improvement
 *
 * Daily cron — runs the agent self-improvement cycle for all active workspaces.
 * Analyzes call patterns, generates insights, and auto-applies high-confidence improvements.
 */
export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const start = Date.now();
  const results: {
    workspaces_processed: number;
    total_insights: number;
    total_applied: number;
    errors: number;
  } = { workspaces_processed: 0, total_insights: 0, total_applied: 0, errors: 0 };

  try {
    const db = getDb();

    // Find workspaces with recent call activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeWs } = await db
      .from("call_sessions")
      .select("workspace_id")
      .gte("call_started_at", sevenDaysAgo)
      .not("call_ended_at", "is", null)
      .limit(500);

    const workspaceIds = [...new Set(
      (activeWs ?? []).map((r: Record<string, unknown>) => String(r.workspace_id))
    )];

    const { runSelfImprovementCycle } = await import("@/lib/intelligence/agent-self-improvement");

    for (const wsId of workspaceIds) {
      try {
        const result = await runSelfImprovementCycle(wsId);
        results.workspaces_processed++;
        results.total_insights += result.insights_generated;
        results.total_applied += result.insights_applied;
      } catch (err) {
        results.errors++;
        // Error (details omitted to protect PII): `[cron/self-improvement] Error for ${wsId}:`, err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      duration_ms: Date.now() - start,
    });
  } catch (err) {
    // Error (details omitted to protect PII): cron/self-improvement] Fatal:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Self-improvement cron failed" }, { status: 500 });
  }
}

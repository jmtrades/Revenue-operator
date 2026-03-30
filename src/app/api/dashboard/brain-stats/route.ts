/**
 * Dashboard Brain Stats API
 * GET: Returns aggregate autonomous brain metrics for the workspace dashboard
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all lead intelligence rows for this workspace
    const { data: intelligenceRows } = await db
      .from("lead_intelligence")
      .select("urgency_score,intent_score,engagement_score,conversion_probability,risk_flags_json")
      .eq("workspace_id", workspaceId);

    const rows = (intelligenceRows ?? []) as Array<{
      urgency_score: number;
      intent_score: number;
      engagement_score: number;
      conversion_probability: number;
      risk_flags_json: string[] | null;
    }>;

    let hot = 0;
    let warm = 0;
    let cold = 0;
    let riskCount = 0;
    let conversionSum = 0;

    for (const row of rows) {
      const avg = (row.urgency_score + row.intent_score + row.engagement_score) / 3;
      if (avg >= 70) hot++;
      else if (avg >= 50) warm++;
      else cold++;

      const flags = row.risk_flags_json ?? [];
      if (flags.length > 0) riskCount++;
      conversionSum += row.conversion_probability ?? 0;
    }

    // Count autonomous actions in last 24h
    const { count: actions24h } = await db
      .from("autonomous_actions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("executed_at", oneDayAgo);

    // Count autonomous actions in last 7d
    const { count: actions7d } = await db
      .from("autonomous_actions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("executed_at", sevenDaysAgo);

    return NextResponse.json({
      total_leads_with_intelligence: rows.length,
      autonomous_actions_24h: actions24h ?? 0,
      autonomous_actions_7d: actions7d ?? 0,
      avg_conversion_probability: rows.length > 0 ? conversionSum / rows.length : 0,
      hot_leads: hot,
      warm_leads: warm,
      cold_leads: cold,
      leads_with_risk_flags: riskCount,
      top_actions: [],
    });
  } catch (err) {
    console.error("[brain-stats]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

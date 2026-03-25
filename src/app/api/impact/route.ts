/**
 * Impact API — Aggregate impact metrics from Accountability Engine.
 * GET /api/impact?workspace_id=...&since=...
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const since = req.nextUrl.searchParams.get("since");
  const defaultSince = new Date();
  defaultSince.setDate(defaultSince.getDate() - 30);
  const sinceDate = since ? new Date(since) : defaultSince;

  const db = getDb();
  const { data: rows } = await db
    .from("outcome_attribution")
    .select("probability_without_intervention, probability_with_intervention, delta, outcome")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sinceDate.toISOString());

  const items = (rows ?? []) as Array<{
    probability_without_intervention: number;
    probability_with_intervention: number;
    delta: number;
    outcome: string;
  }>;

  const totalDelta = items.reduce((s, r) => s + r.delta, 0);
  const byOutcome = items.reduce(
    (acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + r.delta;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    workspace_id: workspaceId,
    since: sinceDate.toISOString(),
    total_delta: Math.round(totalDelta * 100) / 100,
    outcomes_prevented_loss: items.filter((r) => r.delta > 0).length,
    by_outcome: byOutcome,
  });
}

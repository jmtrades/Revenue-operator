/**
 * Outcomes API — Expose outcome attributions from Accountability Engine.
 * GET /api/outcomes?workspace_id=...&since=...&limit=...
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
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50);

  const db = getDb();
  let q = db
    .from("outcome_attribution")
    .select("id, entity_type, entity_id, action, probability_without_intervention, probability_with_intervention, delta, outcome, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    q = q.gte("created_at", since);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ outcomes: data ?? [] });
}

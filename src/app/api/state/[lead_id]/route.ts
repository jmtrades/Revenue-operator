/**
 * State API — Expose unified deal_state_vector from Perception Engine.
 * GET /api/state/[lead_id]?workspace_id=...
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { computeDealStateVector } from "@/lib/engines/perception";
import { computeRevenueState } from "@/lib/revenue-state";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  const { lead_id: leadId } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const vector = await computeDealStateVector(workspaceId, leadId);
  if (!vector) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const revenueState = computeRevenueState(vector);
  return NextResponse.json({ ...vector, revenue_state: revenueState });
}

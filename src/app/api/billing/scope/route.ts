/**
 * GET /api/billing/scope?workspace_id=...
 * Billing scope: operational_scope_active, reliance_established. No numbers. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { outcomesDependOnProcess } from "@/lib/operational-perception/dependence-recognition";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const [unitsRow, dependence] = await Promise.all([
    db.from("continuity_scope_units").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
    outcomesDependOnProcess(workspaceId),
  ]);

  const operational_scope_active = !!unitsRow?.data;
  const reliance_established = dependence;

  return NextResponse.json({
    operational_scope_active,
    reliance_established,
  });
}

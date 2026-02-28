/**
 * GET /api/enterprise/connector-anomaly?workspace_id=...
 * Returns whether connector dead letter has any record for workspace. No metrics, no count.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows } = await db
    .from("connector_events_dead_letter")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  return NextResponse.json({ ok: true, has_anomaly: (rows?.length ?? 0) > 0 }, { status: 200 });
}

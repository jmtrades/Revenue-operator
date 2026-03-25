/**
 * Trust memory: last decision acknowledged in last 7 days.
 * Used only for "Last decision handled recently." on Home when healthy.
 * No counts, no timestamps.
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

  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: ackRows } = await db
    .from("handoff_acknowledgements")
    .select("escalation_id")
    .gte("acknowledged_at", sevenDaysAgo);

  if (!ackRows?.length) {
    return NextResponse.json({ handoff_acknowledged_in_last_7_days: false });
  }

  const escIds = (ackRows as { escalation_id: string }[]).map((r) => r.escalation_id);
  const { data: escRows } = await db
    .from("escalation_logs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", escIds)
    .limit(1);

  const handoff_acknowledged_in_last_7_days = (escRows?.length ?? 0) > 0;
  return NextResponse.json({ handoff_acknowledged_in_last_7_days });
}

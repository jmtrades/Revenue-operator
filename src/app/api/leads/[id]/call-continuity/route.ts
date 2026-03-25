/**
 * Call continuity status for lead: Prepared / Waiting / Recovering
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const fortyEightHoursEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: upcoming } = await db
    .from("call_sessions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(`lead_id.eq.${id},matched_lead_id.eq.${id}`)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", fortyEightHoursEnd.toISOString())
    .limit(1);

  const { data: recent } = await db
    .from("call_sessions")
    .select("id, call_ended_at")
    .eq("workspace_id", workspaceId)
    .or(`lead_id.eq.${id},matched_lead_id.eq.${id}`)
    .gte("call_ended_at", twentyFourHoursAgo.toISOString())
    .order("call_ended_at", { ascending: false })
    .limit(1);

  let status: "Prepared" | "Waiting" | "Recovering" = "Waiting";
  if ((upcoming ?? []).length > 0) status = "Prepared";
  else if ((recent ?? []).length > 0) status = "Recovering";

  return NextResponse.json({ status });
}

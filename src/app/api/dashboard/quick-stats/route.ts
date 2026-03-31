/**
 * GET /api/dashboard/quick-stats?workspace_id=...
 * Returns three key numbers for the main dashboard cards:
 *   active_leads, recent_calls (7d), pending_followups
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  let active_leads = 0;
  let recent_calls = 0;
  let pending_followups = 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Active leads (not archived/lost)
    const { count: leadCount } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED")');
    active_leads = leadCount ?? 0;
  } catch (error) {
    log("error", "dashboard.quick-stats.leads", { workspaceId, error });
  }

  try {
    // Calls in last 7 days
    const { count: callCount } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", sevenDaysAgo.toISOString());
    recent_calls = callCount ?? 0;
  } catch (error) {
    log("error", "dashboard.quick-stats.calls", { workspaceId, error });
  }

  try {
    // Pending follow-ups: leads in follow-up states or with active sequence enrollments
    const { count: followupCount } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("state", ["FOLLOW_UP", "REACTIVATE", "NURTURE"]);
    pending_followups = followupCount ?? 0;
  } catch (error) {
    log("error", "dashboard.quick-stats.followups", { workspaceId, error });
  }

  return NextResponse.json({ active_leads, recent_calls, pending_followups });
}

/**
 * Continuity risk: work that will stop when paused or trial ends.
 * GET /api/continuity/risk?workspace_id=... — returns missed_followups_next_24h, conversations_cooling, bookings_at_risk, recoveries_interrupted
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
  const now = new Date();
  const twentyFourHoursEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: ws } = await db.from("workspaces").select("status, pause_reason, protection_renewal_at, created_at").eq("id", workspaceId).single();
  const wsRow = ws as { status?: string; pause_reason?: string | null; protection_renewal_at?: string | null; created_at?: string } | undefined;
  const isPaused = Boolean(wsRow?.pause_reason);
  const trialEnding = wsRow?.protection_renewal_at
    ? new Date(wsRow.protection_renewal_at).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  if (!isPaused && !trialEnding) {
    return NextResponse.json({
      show: false,
      missed_followups_next_24h: 0,
      conversations_cooling: 0,
      bookings_at_risk: 0,
      recoveries_interrupted: 0,
    });
  }

  const { data: pendingJobs } = await db
    .from("job_queue")
    .select("id, payload")
    .eq("job_type", "decision")
    .eq("status", "pending")
    .limit(500);

  let missedFollowups24h = 0;
  let recoveriesInterrupted = 0;
  const atRiskIds = new Set<string>();

  const { data: coolingLeads } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("state", ["BOOKED", "QUALIFIED", "ENGAGED", "CONTACTED"])
    .or(`last_activity_at.lt.${threeDaysAgo.toISOString()},last_activity_at.is.null`);

  const conversationsCooling = (coolingLeads ?? []).length;
  for (const l of coolingLeads ?? []) atRiskIds.add((l as { id: string }).id);

  for (const j of pendingJobs ?? []) {
    const p = (j as { payload?: { workspaceId?: string; leadId?: string } }).payload;
    const wid = p?.workspaceId ?? (p as Record<string, string>)?.["workspaceId"];
    if (wid !== workspaceId) continue;
    missedFollowups24h++;
    const lid = p?.leadId ?? (p as Record<string, string>)?.["leadId"];
    if (lid && atRiskIds.has(lid)) recoveriesInterrupted++;
  }

  const { data: upcomingSessions } = await db
    .from("call_sessions")
    .select("id, lead_id")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", twentyFourHoursEnd.toISOString());

  const bookingsAtRisk = (upcomingSessions ?? []).length;

  return NextResponse.json({
    show: true,
    missed_followups_next_24h: missedFollowups24h,
    conversations_cooling: conversationsCooling,
    bookings_at_risk: bookingsAtRisk,
    recoveries_interrupted: recoveriesInterrupted,
  });
}

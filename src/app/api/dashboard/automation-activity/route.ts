export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let sequenceActions = 0;
  let recoveredLeads = 0;
  let smsSent = 0;
  let callsMade = 0;
  let appointmentsAutoBooked = 0;

  try {
    const { count: seqCount } = await db
      .from("sequence_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("updated_at", since)
      .eq("status", "active");
    sequenceActions = seqCount ?? 0;
  } catch {}

  try {
    const { count: fuCount } = await db
      .from("follow_up_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("sent_at", since)
      .eq("status", "sent");
    smsSent = fuCount ?? 0;
  } catch {}

  try {
    const { count: obCount } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("direction", "outbound")
      .gte("created_at", since);
    callsMade = obCount ?? 0;
  } catch {}

  try {
    const { count: apptCount } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", since)
      .eq("source", "ai_agent");
    appointmentsAutoBooked = apptCount ?? 0;
  } catch {}

  try {
    const { count: recCount } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("last_activity_at", since)
      .eq("state", "contacted");
    recoveredLeads = recCount ?? 0;
  } catch {}

  const totalActions = sequenceActions + smsSent + callsMade + appointmentsAutoBooked;

  return NextResponse.json({
    period: "24h",
    total_actions: totalActions,
    sequences_active: sequenceActions,
    follow_ups_sent: smsSent,
    calls_made: callsMade,
    appointments_booked: appointmentsAutoBooked,
    leads_recovered: recoveredLeads,
  });
}

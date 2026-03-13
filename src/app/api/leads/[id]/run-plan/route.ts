/**
 * Run post-call plan now (enqueue execute_post_call_plan)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();

  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const workspaceId = (lead as { workspace_id: string }).workspace_id;

  const authSession = await getSession(req);
  if (!authSession?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const { data: callSession } = await db
    .from("call_sessions")
    .select("id")
    .or(`lead_id.eq.${leadId},matched_lead_id.eq.${leadId}`)
    .order("call_ended_at", { ascending: false })
    .limit(1)
    .single();

  if (!callSession) {
    return NextResponse.json({ error: "No closing call found for this lead" }, { status: 400 });
  }

  const callSessionId = (callSession as { id: string }).id;
  await enqueue({
    type: "execute_post_call_plan",
    callSessionId,
    workspaceId,
    leadId,
  });

  return NextResponse.json({ queued: true, call_session_id: callSessionId });
}

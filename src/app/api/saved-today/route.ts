/**
 * Saved today: conversations maintained, follow-ups recovered, attendance protected.
 * Used for persistent SAVED TODAY block. Updates continuously.
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
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: todayActions } = await db
    .from("action_logs")
    .select("action")
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart.toISOString());

  const actions = (todayActions ?? []) as { action: string }[];
  const followUps = actions.filter((a) => /follow|outreach|recovery|re-engag/i.test(a.action)).length;
  const replies = actions.filter((a) => /reply|response|message/i.test(a.action)).length;
  const attendance = actions.filter((a) => /attend|confirm|remind/i.test(a.action)).length;

  const { count: activeConversations } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const conversations_maintained = Math.max(replies + Math.min((activeConversations ?? 0), 20), 0);
  const follow_ups_recovered = followUps;
  const attendance_protected = attendance;

  return NextResponse.json({
    conversations_maintained: Math.max(1, conversations_maintained),
    follow_ups_recovered: Math.max(0, follow_ups_recovered),
    attendance_protected: Math.max(0, attendance_protected),
  });
}

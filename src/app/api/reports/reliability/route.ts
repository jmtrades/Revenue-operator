/**
 * SLA reliability: response_under_60s_rate, followup_execution_rate
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
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const { data: userMsgs } = await db
    .from("messages")
    .select("conversation_id, created_at")
    .eq("role", "user")
    .gte("created_at", weekStart.toISOString());

  const convIds = [...new Set((userMsgs ?? []).map((m: { conversation_id: string }) => m.conversation_id))];
  const { data: convs } = convIds.length ? await db.from("conversations").select("id").in("id", convIds) : { data: [] };
  const convIdsList = (convs ?? []).map((c: { id: string }) => c.id);

  const { data: replies } = convIdsList.length
    ? await db
        .from("messages")
        .select("conversation_id, created_at")
        .eq("role", "assistant")
        .in("conversation_id", convIdsList)
        .gte("created_at", weekStart.toISOString())
    : { data: [] };

  const userMsgsList = (userMsgs ?? []) as { conversation_id: string; created_at: string }[];
  const replyList = (replies ?? []) as { conversation_id: string; created_at: string }[];
  let under60 = 0;
  let total = 0;
  for (const u of userMsgsList) {
    const r = replyList.find((x) => x.conversation_id === u.conversation_id && x.created_at > u.created_at);
    if (r) {
      total++;
      const sec = (new Date(r.created_at).getTime() - new Date(u.created_at).getTime()) / 1000;
      if (sec <= 60) under60++;
    }
  }
  const responseUnder60sRate = total > 0 ? under60 / total : 1;

  const { count: scheduled } = await db
    .from("automation_states")
    .select("id", { count: "exact", head: true })
    .gte("no_reply_scheduled_at", weekStart.toISOString());

  const { count: executed } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "no_reply_timeout")
    .gte("created_at", weekStart.toISOString());

  const s = scheduled ?? 0;
  const e = executed ?? 0;
  const followupExecutionRate = s > 0 ? Math.min(1, e / s) : 1;

  return NextResponse.json({
    response_under_60s_rate: Math.round(responseUnder60sRate * 10000) / 100,
    followup_execution_rate: Math.round(followupExecutionRate * 10000) / 100,
    period_start: weekStart.toISOString(),
    period_end: now.toISOString(),
  });
}

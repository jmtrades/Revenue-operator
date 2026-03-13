/**
 * Operational view memory: first_view_after_change when last_seen_healthy_at
 * is older than last escalation or interruption (workspace continuity, not session).
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

  const { data: memory } = await db
    .from("operational_view_memory")
    .select("last_seen_healthy_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const lastSeenAt = (memory as { last_seen_healthy_at?: string } | null)?.last_seen_healthy_at;
  if (!lastSeenAt) {
    return NextResponse.json({ first_view_after_change: true });
  }

  const { data: lastEsc } = await db
    .from("escalation_logs")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastInt } = await db
    .from("interruption_signal_sent")
    .select("sent_at")
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const escalationAt = (lastEsc as { created_at?: string } | null)?.created_at ?? null;
  const interruptionAt = (lastInt as { sent_at?: string } | null)?.sent_at ?? null;
  const lastChangeAt = [escalationAt, interruptionAt].filter(Boolean).sort().pop() ?? null;

  const first_view_after_change = lastChangeAt != null && lastSeenAt < lastChangeAt;
  return NextResponse.json({ first_view_after_change });
}

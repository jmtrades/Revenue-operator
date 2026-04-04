/**
 * Overview: what happened, why, what next
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: recentEvents } = await db
      .from("events")
      .select("id, event_type, entity_type, entity_id, payload, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: recentActions } = await db
      .from("action_logs")
      .select("id, action, entity_id, payload, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: ws } = await db.from("workspaces").select("status, pause_reason").eq("id", workspaceId).maybeSingle();
    const wsRow = ws as { status?: string; pause_reason?: string } | undefined;

    const { data: settingsRow } = await db.from("settings").select("preview_mode").eq("workspace_id", workspaceId).maybeSingle();
    const previewMode = (settingsRow as { preview_mode?: boolean })?.preview_mode ?? false;

    const { count: leadCount } = await db.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    const { count: activeDeals } = await db.from("deals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "lost");

    return NextResponse.json({
      workspace_status: wsRow?.status ?? "active",
      pause_reason: wsRow?.pause_reason ?? null,
      preview_mode: previewMode,
      lead_count: leadCount ?? 0,
      active_deals: activeDeals ?? 0,
      today_events: recentEvents ?? [],
      today_actions: recentActions ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

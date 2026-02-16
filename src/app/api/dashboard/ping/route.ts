/**
 * Record that the user opened the dashboard (for absence-confidence: do not send if opened in last 72h).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ ok: true }); // no workspace: no-op

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", workspaceId)
    .single();

  if (!ws || (ws as { owner_id: string }).owner_id !== session.userId) {
    return NextResponse.json({ ok: true }); // not found or not owner: no-op
  }

  await db
    .from("workspaces")
    .update({ last_dashboard_open_at: new Date().toISOString() })
    .eq("id", workspaceId);

  const { checkAndMarkOrientationChecked } = await import("@/lib/orientation/records");
  await checkAndMarkOrientationChecked(workspaceId).catch(() => {});

  return NextResponse.json({ ok: true });
}

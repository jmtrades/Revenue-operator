/**
 * Record that the user opened the dashboard (for absence-confidence: do not send if opened in last 72h).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ ok: true }); // no workspace: no-op

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  await db
    .from("workspaces")
    .update({ last_dashboard_open_at: new Date().toISOString() })
    .eq("id", workspaceId);

  const { checkAndMarkOrientationChecked } = await import("@/lib/orientation/records");
  await checkAndMarkOrientationChecked(workspaceId).catch((err) => { log("error", "[dashboard/ping] error:", { error: err instanceof Error ? err.message : err }); });

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/integrations/google-calendar/status — Whether current workspace has Google Calendar connected.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ connected: false });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("google_calendar_tokens")
    .select("workspace_id")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  return NextResponse.json({ connected: Boolean(data) });
}

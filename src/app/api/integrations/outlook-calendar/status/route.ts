/**
 * GET /api/integrations/outlook-calendar/status — Outlook Calendar status (Task 20).
 * Returns connected: false until Outlook OAuth and sync are implemented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ connected: false });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  return NextResponse.json({ connected: false });
}

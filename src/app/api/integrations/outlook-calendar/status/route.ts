/**
 * GET /api/integrations/outlook-calendar/status — Outlook Calendar status.
 * Checks if workspace has valid Outlook/Microsoft OAuth token and returns connected status.
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

  try {
    const db = getDb();
    const { data: connection } = await db
      .from("workspace_crm_connections")
      .select("connected_at, expires_at")
      .eq("workspace_id", session.workspaceId)
      .eq("provider", "microsoft_365")
      .maybeSingle();

    if (!connection || !connection.connected_at) {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    const expiresAt = connection.expires_at as string | null;
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    const connected = !isExpired;

    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

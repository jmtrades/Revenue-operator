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
  if (!session?.userId) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("workspace_id")?.trim();
  const workspaceId = q || session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ connected: false });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data: connection } = await db
      .from("workspace_crm_connections")
      .select("status, token_expires_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "microsoft_365")
      .maybeSingle();

    if (!connection || (connection as { status?: string }).status !== "active") {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    const expiresAt = (connection as { token_expires_at?: string | null }).token_expires_at;
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    const connected = !isExpired;

    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

/**
 * GET /api/notifications — List notifications for current user (current workspace).
 * PATCH /api/notifications — Mark all as read (body: {}).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));
  const db = getDb();

  const { data: rows, error } = await db
    .from("notifications")
    .select("id, workspace_id, type, title, body, metadata, read, created_at")
    .eq("user_id", session.userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: "Could not process notification. Please try again." }, { status: 500 });

  const unread = (rows ?? []).filter((r: { read: boolean }) => !r.read).length;
  return NextResponse.json({
    notifications: rows ?? [],
    unreadCount: unread,
  });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("user_id", session.userId)
    .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: "Could not process notification. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

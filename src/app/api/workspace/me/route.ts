/**
 * GET /api/workspace/me — Current workspace name (and id) for session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ name: "My Workspace", id: null });
  }

  try {
    const db = getDb();
    const { data, error } = await db.from("workspaces").select("id, name, vapi_assistant_id").eq("id", workspaceId).single();
    if (error || !data) {
      return NextResponse.json({ name: "My Workspace", id: workspaceId, demoMode: true });
    }
    const row = data as { id: string; name: string; vapi_assistant_id?: string | null };
    const demoMode = !row.vapi_assistant_id?.trim();
    return NextResponse.json({ name: row.name || "My Workspace", id: row.id, demoMode });
  } catch {
    return NextResponse.json({ name: "My Workspace", id: workspaceId, demoMode: true });
  }
}

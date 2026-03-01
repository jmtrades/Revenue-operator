/**
 * GET /api/usage — Usage metering: calls and messages count for workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  let calls = 0;
  let messages = 0;
  try {
    const { count: c } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    calls = c ?? 0;
  } catch {
    // ignore
  }
  try {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (leadIds.length > 0) {
      const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
      const ids = (convs ?? []).map((c: { id: string }) => c.id);
      if (ids.length > 0) {
        const { count: m } = await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", ids);
        messages = m ?? 0;
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ calls, messages });
}

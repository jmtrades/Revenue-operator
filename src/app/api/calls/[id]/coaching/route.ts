/**
 * Call coaching summary: what worked, missed signals, recommended next step
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await getSession(req);
    if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: callId } = await params;
    const db = getDb();

  const { data: session } = await db
    .from("call_sessions")
    .select("id, lead_id, workspace_id, transcript, outcome, current_node")
    .eq("id", callId)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  const workspaceId = (session as { workspace_id?: string }).workspace_id;
  if (workspaceId) {
    const accessErr = await requireWorkspaceAccess(req, workspaceId);
    if (accessErr) return accessErr;
  }

  // call_coaching table may not be provisioned yet — try reading, fall through on error
  try {
    const { data: existing } = await db
      .from("call_coaching")
      .select("what_worked, missed_signals, recommended_next_step")
      .eq("call_session_id", callId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing);
    }
  } catch {
    // Table does not exist yet — return null/unavailable
    return NextResponse.json({
      coaching: null,
      available: false,
    });
  }

  // Fallback if table exists but no coaching record yet
  return NextResponse.json({
    coaching: null,
    available: false,
  });
  } catch (error) {
    console.error("[API] calls/[id]/coaching error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

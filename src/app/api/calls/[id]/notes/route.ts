export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id } = await params;

  let body: { notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes field is required" }, { status: 400 });
  }

  const db = getDb();

  // Verify call belongs to this workspace
  const { data: call } = await db
    .from("call_sessions")
    .select("id, workspace_id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const callData = call as { workspace_id?: string; metadata?: Record<string, unknown> };
  if (callData.workspace_id && callData.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Store notes in metadata JSONB field
  const meta = callData.metadata ?? {};
  const { error } = await db
    .from("call_sessions")
    .update({
      metadata: { ...meta, notes: body.notes.slice(0, 5000) },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    log("error", "calls.notes_save_error", { error: error.message });
    return NextResponse.json({ error: "Failed to save notes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

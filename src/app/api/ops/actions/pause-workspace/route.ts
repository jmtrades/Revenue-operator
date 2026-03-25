/**
 * Ops: Pause workspace
 * Requires staff write access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireStaffWriteAccess, logStaffAction } from "@/lib/ops/auth";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await requireStaffWriteAccess().catch((r) => r as Response);
  if (session instanceof Response) return session;

  let body: { workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  await db
    .from("workspaces")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      pause_reason: "Ops: staff-initiated pause",
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  await logStaffAction(session.id, "pause_workspace", { workspace_id: workspaceId }, workspaceId);

  return NextResponse.json({ ok: true });
}

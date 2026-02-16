/**
 * Ops only: Rebuild lead state from canonical signals (replay). Deterministic.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireStaffWriteAccess, logStaffAction } from "@/lib/ops/auth";
import { rebuildAndPersistLeadState } from "@/lib/state/rebuild";

export async function POST(req: NextRequest) {
  const session = await requireStaffWriteAccess().catch((r) => r as Response);
  if (session instanceof Response) return session;

  let body: { workspace_id?: string; lead_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id;
  const leadId = body.lead_id;
  if (!workspaceId || !leadId) {
    return NextResponse.json({ error: "workspace_id and lead_id required" }, { status: 400 });
  }

  try {
    const result = await rebuildAndPersistLeadState(workspaceId, leadId);
    await logStaffAction(session.id, "rebuild_lead_state", { workspace_id: workspaceId, lead_id: leadId });
    return NextResponse.json({
      ok: true,
      final_state: result.final_state,
      lead_state_persisted: result.lead_state_persisted,
      checkpoints_count: result.checkpoints.length,
    });
  } catch (err) {
    console.error("[rebuild-lead-state]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

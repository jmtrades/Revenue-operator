/**
 * Record handoff acknowledgement. Once acknowledged, handoff notifications stop for this escalation.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { recordHandoffAcknowledgement } from "@/lib/delivery-assurance/handoff-ack";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escalationId } = await params;
  if (!escalationId) return NextResponse.json({ error: "Missing escalation id" }, { status: 400 });

  const db = getDb();
  const { data: row } = await db
    .from("escalation_logs")
    .select("id, workspace_id")
    .eq("id", escalationId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Escalation not found" }, { status: 404 });

  const workspaceIdFromRow = (row as { workspace_id?: string }).workspace_id;
  if (workspaceIdFromRow) {
    const authErr = await requireWorkspaceAccess(request, workspaceIdFromRow);
    if (authErr) return authErr;
  }

  const body = await request.json().catch(() => ({}));
  const acknowledgedBy = typeof body.acknowledged_by === "string" ? body.acknowledged_by : undefined;

  await recordHandoffAcknowledgement(escalationId, acknowledgedBy);

  const workspaceId = workspaceIdFromRow;
  if (workspaceId) {
    const { data: silenceRows } = await db
      .from("operational_silence_windows")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("ended_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    if ((silenceRows?.length ?? 0) > 0) {
      const { recordOperationalAssumption } = await import("@/lib/assumption-engine");
      recordOperationalAssumption(workspaceId, "absence_only_attention", `escalation:${escalationId}`).catch((err) => { console.error("[escalations/[id]/ack] error:", err instanceof Error ? err.message : err); });
    }
    const { recordProviderInteraction } = await import("@/lib/detachment");
    recordProviderInteraction(workspaceId, `escalation:${escalationId}`).catch((err) => { console.error("[escalations/[id]/ack] error:", err instanceof Error ? err.message : err); });
    const { data: escRow } = await db.from("escalation_logs").select("lead_id").eq("id", escalationId).maybeSingle();
    const leadId = (escRow as { lead_id?: string } | null)?.lead_id;
    if (leadId) recordProviderInteraction(workspaceId, `lead:${leadId}`).catch((err) => { console.error("[escalations/[id]/ack] error:", err instanceof Error ? err.message : err); });
    const { recordStaffRelianceEvent } = await import("@/lib/staff-reliance");
    recordStaffRelianceEvent(workspaceId).catch((err) => { console.error("[escalations/[id]/ack] error:", err instanceof Error ? err.message : err); });
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(workspaceId, "The request was addressed.").catch((err) => { console.error("[escalations/[id]/ack] error:", err instanceof Error ? err.message : err); });
  }

  return NextResponse.json({ ok: true, escalation_id: escalationId });
}

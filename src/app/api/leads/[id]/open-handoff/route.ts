/**
 * Open handoff for this lead (unacked escalation with hold in future).
 * Used to show "Enter outcome" and call ack.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();
  const now = new Date().toISOString();

  const { data: esc } = await db
    .from("escalation_logs")
    .select("id, workspace_id")
    .eq("lead_id", leadId)
    .eq("holding_message_sent", true)
    .not("hold_until", "is", null)
    .gt("hold_until", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!esc) return NextResponse.json({ escalation_id: null });
  const escalationId = (esc as { id: string }).id;
  const workspaceId = (esc as { workspace_id?: string }).workspace_id;

  const { data: ack } = await db
    .from("handoff_acknowledgements")
    .select("escalation_id")
    .eq("escalation_id", escalationId)
    .maybeSingle();

  if (ack) return NextResponse.json({ escalation_id: null });

  let beyond_scope = false;
  if (workspaceId) {
    try {
      const { isEngineAllowedForWorkspace } = await import("@/lib/operational-engines");
      const allowed = await isEngineAllowedForWorkspace(workspaceId, "commitment_reliability");
      beyond_scope = !allowed;
    } catch {
      // default: within scope
    }
  }
  return NextResponse.json({ escalation_id: escalationId, beyond_scope });
}

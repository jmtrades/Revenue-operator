/**
 * Stability context: active plan, cooldown, sequence.
 * GET /api/leads/[id]/stability?workspace_id=...
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getActiveLeadPlan } from "@/lib/plans/lead-plan";
import { canInterveneNow } from "@/lib/stability/cooldowns";
import type { LeadState } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const { data: lead } = await db
      .from("leads")
      .select("state")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const plan = await getActiveLeadPlan(workspaceId, leadId);
    const cooldownCheck = await canInterveneNow(
      workspaceId,
      leadId,
      "follow_up",
      (lead as { state: string }).state as LeadState
    );

    let sequenceRun: { sequence_id: string; current_step: number; status: string; sequence_name?: string } | null = null;
    const { data: run } = await db
      .from("sequence_runs")
      .select("sequence_id, current_step, status")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .eq("status", "running")
      .maybeSingle();
    if (run) {
      const r = run as { sequence_id: string; current_step: number; status: string };
      const { data: seq } = await db.from("sequences").select("name").eq("id", r.sequence_id).maybeSingle();
      sequenceRun = {
        ...r,
        sequence_name: (seq as { name?: string })?.name,
      };
    }

    const { data: limits } = await db
      .from("lead_intervention_limits")
      .select("last_intervened_at, cooldown_until, daily_touch_count, daily_touch_reset_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .maybeSingle();

    return NextResponse.json({
      plan: plan
        ? {
            next_action_type: plan.next_action_type,
            next_action_at: plan.next_action_at,
            sequence_id: plan.sequence_id,
            sequence_step: plan.sequence_step,
          }
        : null,
      cooldown: !cooldownCheck.allowed
        ? {
            reason: cooldownCheck.reason,
            cooldown_until: cooldownCheck.cooldown_until,
          }
        : null,
      limits: limits
        ? {
            last_intervened_at: (limits as { last_intervened_at?: string }).last_intervened_at,
            cooldown_until: (limits as { cooldown_until?: string }).cooldown_until,
            daily_touch_count: (limits as { daily_touch_count?: number }).daily_touch_count,
          }
        : null,
      sequence: sequenceRun,
    });
  } catch (err) {
    console.error("stability route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

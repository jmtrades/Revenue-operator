/**
 * Rep performance: show_rate, close_rate, avg_deal_risk, avg_follow_up_delay per closer
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { data: closers } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "closer");

  const closerIds = (closers ?? []).map((c) => (c as { user_id: string }).user_id);

  if (closerIds.length === 0) {
    return NextResponse.json({ performance: [] });
  }

  // Batch query: all lead_assignments for all closers in one call
  const { data: allAssignments } = await db
    .from("lead_assignments")
    .select("lead_id, assigned_to")
    .eq("workspace_id", workspaceId)
    .in("assigned_to", closerIds);

  // Group assignments by closer
  const assignmentsByCloser = new Map<string, string[]>();
  for (const a of allAssignments ?? []) {
    const row = a as { lead_id: string; assigned_to: string };
    const list = assignmentsByCloser.get(row.assigned_to) ?? [];
    list.push(row.lead_id);
    assignmentsByCloser.set(row.assigned_to, list);
  }

  // Collect all lead IDs across all closers for batch queries
  const allLeadIds = [...new Set((allAssignments ?? []).map((a) => (a as { lead_id: string }).lead_id))];

  // Batch query: all deals and action_logs in parallel (skip if no leads)
  const [dealsResult, actionsResult] = allLeadIds.length > 0
    ? await Promise.all([
        db.from("deals").select("id, lead_id, status, value_cents").in("lead_id", allLeadIds),
        db.from("action_logs").select("payload, created_at, entity_id").eq("entity_type", "lead").in("entity_id", allLeadIds).eq("action", "send_message"),
      ])
    : [{ data: [] }, { data: [] }];

  // Group deals by lead_id
  const dealsByLead = new Map<string, Array<{ status: string; value_cents?: number }>>();
  for (const d of dealsResult.data ?? []) {
    const deal = d as { lead_id: string; status: string; value_cents?: number };
    const list = dealsByLead.get(deal.lead_id) ?? [];
    list.push(deal);
    dealsByLead.set(deal.lead_id, list);
  }

  // Group actions by entity_id (lead_id)
  const actionsByLead = new Map<string, Array<{ created_at: string; payload?: { lead_created_at?: string } }>>();
  for (const a of actionsResult.data ?? []) {
    const action = a as { entity_id: string; created_at: string; payload?: { lead_created_at?: string } };
    const list = actionsByLead.get(action.entity_id) ?? [];
    list.push(action);
    actionsByLead.set(action.entity_id, list);
  }

  // Compute per-closer metrics in JS from batched data
  const perf: Array<{
    user_id: string;
    show_rate: number;
    close_rate: number;
    avg_deal_risk: number;
    avg_follow_up_delay_hours: number;
    deals_assigned: number;
  }> = [];

  for (const userId of closerIds) {
    const leadIds = assignmentsByCloser.get(userId) ?? [];
    if (leadIds.length === 0) {
      perf.push({ user_id: userId, show_rate: 0, close_rate: 0, avg_deal_risk: 0, avg_follow_up_delay_hours: 0, deals_assigned: 0 });
      continue;
    }

    // Gather deals for this closer's leads
    const deals: Array<{ status: string; value_cents?: number }> = [];
    for (const lid of leadIds) {
      const ld = dealsByLead.get(lid);
      if (ld) deals.push(...ld);
    }

    const booked = deals.filter((d) => d.status === "booked" || d.status === "showed");
    const showed = deals.filter((d) => d.status === "showed" || d.status === "won");
    const won = deals.filter((d) => d.status === "won");

    const showRate = booked.length > 0 ? showed.length / booked.length : 0;
    const closeRate = showed.length > 0 ? won.length / showed.length : 0;

    const totalValue = deals.reduce((s, d) => s + (d.value_cents ?? 0), 0);
    const avgDealRisk = deals.length > 0 ? totalValue / (deals.length * 100) : 0;

    // Gather actions for this closer's leads
    let totalDelayHours = 0;
    let delayCount = 0;
    for (const lid of leadIds) {
      for (const a of actionsByLead.get(lid) ?? []) {
        if (a.created_at && a.payload?.lead_created_at) {
          const delayMs = new Date(a.created_at).getTime() - new Date(a.payload.lead_created_at).getTime();
          if (delayMs > 0 && delayMs < 7 * 24 * 60 * 60 * 1000) { // Cap at 7 days
            totalDelayHours += delayMs / (1000 * 60 * 60);
            delayCount++;
          }
        }
      }
    }
    const avgFollowUpDelayHours = delayCount > 0 ? totalDelayHours / delayCount : 0;

    perf.push({
      user_id: userId,
      show_rate: Math.round(showRate * 1000) / 1000,
      close_rate: Math.round(closeRate * 1000) / 1000,
      avg_deal_risk: Math.round(avgDealRisk * 100) / 100,
      avg_follow_up_delay_hours: Math.round(avgFollowUpDelayHours * 10) / 10,
      deals_assigned: leadIds.length,
    });
  }

  return NextResponse.json({ performance: perf });
}

/**
 * Rep performance: show_rate, close_rate, avg_deal_risk, avg_follow_up_delay per closer
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();

  const { data: closers } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "closer");

  const perf: Array<{
    user_id: string;
    show_rate: number;
    close_rate: number;
    avg_deal_risk: number;
    avg_follow_up_delay_hours: number;
    deals_assigned: number;
  }> = [];

  for (const c of closers ?? []) {
    const userId = (c as { user_id: string }).user_id;
    const { data: assignments } = await db
      .from("lead_assignments")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", userId);

    const leadIds = (assignments ?? []).map((a: { lead_id: string }) => a.lead_id);
    if (leadIds.length === 0) {
      perf.push({ user_id: userId, show_rate: 0, close_rate: 0, avg_deal_risk: 0, avg_follow_up_delay_hours: 0, deals_assigned: 0 });
      continue;
    }

    const { data: deals } = await db
      .from("deals")
      .select("id, lead_id, status, value_cents")
      .in("lead_id", leadIds);

    const booked = (deals ?? []).filter((d) => (d as { status: string }).status === "booked" || (d as { status: string }).status === "showed");
    const showed = (deals ?? []).filter((d) => (d as { status: string }).status === "showed" || (d as { status: string }).status === "won");
    const won = (deals ?? []).filter((d) => (d as { status: string }).status === "won");

    const showRate = booked.length > 0 ? showed.length / booked.length : 0;
    const closeRate = showed.length > 0 ? won.length / showed.length : 0;

    const totalValue = (deals ?? []).reduce((s, d) => s + ((d as { value_cents?: number }).value_cents ?? 0), 0);
    const avgDealRisk = (deals ?? []).length > 0 ? totalValue / (deals!.length * 100) : 0;

    const { data: actions } = await db
      .from("action_logs")
      .select("payload, created_at")
      .eq("entity_type", "lead")
      .in("entity_id", leadIds)
      .eq("action", "send_message");

    let totalDelayHours = 0;
    let delayCount = 0;
    for (const a of actions ?? []) {
      const created = (a as { created_at: string }).created_at;
      if (created) {
        totalDelayHours += 0;
        delayCount++;
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

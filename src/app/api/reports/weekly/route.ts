/**
 * Weekly performance report
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
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const { data: deals } = await db
    .from("deals")
    .select("id, value_cents, status, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", weekStart.toISOString());

  const callsBooked = deals?.filter((d) => (d as { status: string }).status === "booked" || (d as { status: string }).status === "open").length ?? 0;
  const { count: secured } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", weekStart.toISOString());

  const wonDeals = deals?.filter((d) => (d as { status: string }).status === "won") ?? [];
  const revenueInfluencedCents = wonDeals.reduce((s, d) => s + ((d as { value_cents?: number }).value_cents ?? 0), 0);

  const { data: events } = await db
    .from("events")
    .select("entity_id, payload")
    .eq("workspace_id", workspaceId)
    .in("event_type", ["no_reply_timeout", "message_received"])
    .gte("created_at", weekStart.toISOString());

  const recoveries = new Set<string>();
  (events ?? []).forEach((e: { payload?: { decision?: { newState: string; fromState?: string } }; entity_id: string }) => {
    const d = e.payload?.decision as { newState?: string; fromState?: string } | undefined;
    if (d?.newState === "ENGAGED" && d?.fromState === "REACTIVATE") recoveries.add(e.entity_id);
  });

  const timeSavedEstimate = (callsBooked + recoveries.size) * 15;
  const securedCount = secured ?? callsBooked;

  const { data: sent } = await db
    .from("action_logs")
    .select("entity_id")
    .eq("workspace_id", workspaceId)
    .in("action", ["send_message", "simulated_send_message"])
    .gte("created_at", weekStart.toISOString());
  const leadsTouched = new Set((sent ?? []).map((s: { entity_id: string }) => s.entity_id)).size;

  const removal_impact = {
    lost_conversations_estimate: Math.max(0, Math.floor(leadsTouched * 0.6)),
    lost_attendance_estimate: securedCount ?? 0,
    lost_opportunities_estimate: callsBooked + recoveries.size,
    message: "If coverage were removed this week, these outcomes would not have occurred.",
  };

  const report = {
    period_start: weekStart.toISOString(),
    period_end: now.toISOString(),
    calls_booked: callsBooked,
    revenue_influenced_cents: revenueInfluencedCents,
    time_saved_minutes: timeSavedEstimate,
    recoveries: recoveries.size,
    removal_impact,
    weekly_recap: {
      secured: securedCount,
      expected_without_intervention: 0,
      delta: securedCount,
    },
  };

  return NextResponse.json(report);
}

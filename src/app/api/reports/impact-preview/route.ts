/**
 * Impact preview: simulate past 7 days if operator were disabled.
 * lost_bookings, lost_revenue, lost_follow_ups
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

  const { data: sent } = await db
    .from("outbound_messages")
    .select("id, lead_id")
    .eq("workspace_id", workspaceId)
    .gte("sent_at", weekStart.toISOString());

  const uniqueLeads = new Set((sent ?? []).map((s: { lead_id: string }) => s.lead_id));
  const lostFollowUps = uniqueLeads.size;

  const { data: deals } = await db
    .from("deals")
    .select("id, value_cents, status, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", weekStart.toISOString());

  const bookings = (deals ?? []).filter((d) => (d as { status: string }).status !== "lost");
  const wonDeals = (deals ?? []).filter((d) => (d as { status: string }).status === "won");
  const lostBookings = bookings.length;
  const lostRevenueCents = wonDeals.reduce((s, d) => s + ((d as { value_cents?: number }).value_cents ?? 0), 0);

  return NextResponse.json({
    period_start: weekStart.toISOString(),
    period_end: now.toISOString(),
    lost_bookings: lostBookings,
    lost_revenue_cents: lostRevenueCents,
    lost_follow_ups: lostFollowUps,
  });
}

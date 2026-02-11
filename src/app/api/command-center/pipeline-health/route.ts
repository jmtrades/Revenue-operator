/**
 * Call Pipeline Health: tomorrow attendance probability, empty slot risk, late cancellation risk
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setUTCHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCHours(23, 59, 59, 999);

  const { data: bookedDeals } = await db
    .from("deals")
    .select("id, lead_id, value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const { data: tomorrowSessions } = await db
    .from("call_sessions")
    .select("id, lead_id, deal_id, call_started_at, show_status")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", tomorrowStart.toISOString())
    .lt("call_started_at", tomorrowEnd.toISOString());

  const dealsWithCalls = (bookedDeals ?? []).filter((d) =>
    (tomorrowSessions ?? []).some(
      (s: { deal_id?: string | null; lead_id?: string | null }) =>
        s.deal_id === (d as { id: string }).id || s.lead_id === (d as { lead_id: string }).lead_id
    )
  );
  const sessionDealIds = new Set(
    (tomorrowSessions ?? []).map((s: { deal_id?: string }) => s.deal_id).filter((x): x is string => Boolean(x))
  );
  const dealIdsForTomorrow = [...new Set([...dealsWithCalls.map((d: { id: string }) => d.id), ...sessionDealIds])];

  let tomorrow_attendance_probability = 0;
  const attendanceByDeal: Array<{ deal_id: string; lead_id: string; probability: number }> = [];
  if (dealIdsForTomorrow.length > 0) {
    for (const dealId of dealIdsForTomorrow.slice(0, 10)) {
      try {
        const pred = await predictDealOutcome(dealId);
        const deal = (bookedDeals ?? []).find((d: { id: string }) => d.id === dealId) as { lead_id: string } | undefined;
        if (deal) {
          attendanceByDeal.push({ deal_id: dealId, lead_id: deal.lead_id, probability: pred.probability });
        }
      } catch {
        // skip
      }
    }
    tomorrow_attendance_probability =
      attendanceByDeal.length > 0
        ? attendanceByDeal.reduce((s, d) => s + d.probability, 0) / attendanceByDeal.length
        : 0;
  }

  const bookedCount = (bookedDeals ?? []).length;
  const tomorrowCount = (tomorrowSessions ?? []).length;
  const empty_slot_risk = Math.max(0, bookedCount - tomorrowCount);

  const { data: noShowHistory } = await db
    .from("call_sessions")
    .select("show_status")
    .eq("workspace_id", workspaceId)
    .not("show_status", "is", null)
    .limit(50);
  const noShowRate =
    (noShowHistory ?? []).filter((s: { show_status?: string }) => s.show_status === "no_show").length /
    Math.max(1, (noShowHistory ?? []).length);
  const late_cancellation_risk = tomorrowCount > 0 ? Math.round(noShowRate * 100) : 0;

  return NextResponse.json({
    tomorrow_attendance_probability: Math.round(tomorrow_attendance_probability * 100),
    tomorrow_calls_count: tomorrowCount,
    empty_slot_risk,
    late_cancellation_risk,
  });
}

/**
 * GET /api/dashboard/briefing — Autonomous "Since You Were Away" briefing
 *
 * Returns key metrics from the last 24 hours:
 * - Calls handled
 * - Appointments booked
 * - Follow-ups sent
 * - Leads recovered (state transitions)
 * - Missed calls recovered (follow-up calls after missed calls)
 * - Revenue influenced (appointments × $250)
 * - Hours saved estimate
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface BriefingResponse {
  calls_handled: number;
  appointments_booked: number;
  follow_ups_sent: number;
  leads_recovered: number;
  missed_calls_recovered: number;
  revenue_influenced_cents: number;
  hours_saved_estimate: number;
  period_hours: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayAgoIso = oneDayAgo.toISOString();

  try {
    // 1. Calls handled in last 24h
    const { count: callsHandled } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", oneDayAgoIso);

    // 2. Appointments booked in last 24h
    const { count: appointmentsBooked } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", oneDayAgoIso);

    // 3. Follow-ups sent in last 24h
    const { count: followUpsSent } = await db
      .from("follow_up_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "sent")
      .gte("sent_at", oneDayAgoIso);

    // 4. Leads recovered (transitioned to active state in last 24h)
    const { count: leadsRecovered } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("state", ["active", "qualified"])
      .gte("updated_at", oneDayAgoIso);

    // 5. Missed calls recovered (answered calls after a missed call to same lead in last 24h)
    // This is a more complex query: find leads with both missed and answered calls in period
    const { data: leadsWithMissedAndRecovered } = await db
      .from("call_sessions")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", oneDayAgoIso)
      .in("disposition", ["missed", "answered"]);

    let missedCallsRecovered = 0;
    if (leadsWithMissedAndRecovered && leadsWithMissedAndRecovered.length > 0) {
      // Group by lead_id and check if both "missed" and "answered" exist
      const leadMap = new Map<string, Set<string>>();
      for (const row of leadsWithMissedAndRecovered) {
        const leadId = (row as { lead_id: string }).lead_id;
        if (!leadMap.has(leadId)) {
          leadMap.set(leadId, new Set());
        }
      }

      // Refine: get both missed and answered calls for these leads
      const { data: detailedCalls } = await db
        .from("call_sessions")
        .select("lead_id, disposition")
        .eq("workspace_id", workspaceId)
        .gte("created_at", oneDayAgoIso)
        .in("lead_id", Array.from(leadMap.keys()));

      if (detailedCalls) {
        const refineMap = new Map<string, Set<string>>();
        for (const call of detailedCalls) {
          const lead = call as { lead_id: string; disposition: string };
          if (!refineMap.has(lead.lead_id)) {
            refineMap.set(lead.lead_id, new Set());
          }
          refineMap.get(lead.lead_id)!.add(lead.disposition);
        }
        // Count leads that have both missed and answered
        for (const dispositions of refineMap.values()) {
          if (dispositions.has("missed") && dispositions.has("answered")) {
            missedCallsRecovered++;
          }
        }
      }
    }

    // Calculate derived metrics
    const revenueInfluencedCents = (appointmentsBooked ?? 0) * 25000; // $250 per appointment in cents
    const hoursSavedEstimate = (callsHandled ?? 0) * 0.1; // ~6 min per call = 0.1 hours

    const briefing: BriefingResponse = {
      calls_handled: callsHandled ?? 0,
      appointments_booked: appointmentsBooked ?? 0,
      follow_ups_sent: followUpsSent ?? 0,
      leads_recovered: leadsRecovered ?? 0,
      missed_calls_recovered: missedCallsRecovered,
      revenue_influenced_cents: revenueInfluencedCents,
      hours_saved_estimate: Math.round(hoursSavedEstimate * 10) / 10,
      period_hours: 24,
    };

    return NextResponse.json(briefing);
  } catch (error) {
    console.error("[dashboard/briefing] error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to load briefing", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

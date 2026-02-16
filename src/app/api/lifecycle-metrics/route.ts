/**
 * Lifecycle metrics — Proof layer only. No heuristics.
 * Leads received, Conversations handled, Bookings created, Shows protected, Lost leads recovered.
 */

import { NextRequest, NextResponse } from "next/server";
import { aggregateProofForWorkspace } from "@/lib/proof/aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const agg = await aggregateProofForWorkspace(workspaceId, { since });

  return NextResponse.json({
    leads_received: agg.leads_received,
    conversations_handled: agg.conversations_handled,
    bookings_created: agg.bookings_created,
    shows_protected: agg.shows_protected,
    lost_leads_recovered: agg.lost_leads_recovered,
    new_opportunities: agg.leads_received,
    appointments_scheduled: agg.bookings_created,
    appointments_booked_30d: agg.bookings_created,
    shows_30d: agg.shows_protected,
    clients_recovered: agg.lost_leads_recovered,
    repeat_revenue_generated: agg.shows_protected,
  });
}

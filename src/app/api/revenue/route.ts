export const dynamic = "force-dynamic";

/**
 * Revenue Report API
 * Metrics derived from event data only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  const db = getDb();

  try {
    // Leads handled
    const { data: leads } = await db
      .from("leads")
      .select("id, state")
      .eq("workspace_id", workspaceId);

    const leadCount = leads?.length ?? 0;
    const stateCounts = (leads ?? []).reduce(
      (acc: Record<string, number>, l: { state: string }) => {
        acc[l.state] = (acc[l.state] ?? 0) + 1;
        return acc;
      },
      {}
    );

    // Deals / revenue
    const { data: deals } = await db
      .from("deals")
      .select("id, value_cents, status")
      .eq("workspace_id", workspaceId);

    const bookingsCount = deals?.filter((d) => d.status !== "lost").length ?? 0;
    const wonDeals = deals?.filter((d) => d.status === "won") ?? [];
    const revenueInfluencedCents = wonDeals.reduce(
      (sum, d) => sum + (d.value_cents ?? 0),
      0
    );

    // Recoveries: leads in ENGAGED that were previously REACTIVATE
    const { data: stateTransitions } = await db
      .from("events")
      .select("entity_id, payload")
      .eq("workspace_id", workspaceId)
      .in("event_type", ["message_received", "no_reply_timeout"]);

    const recoveries = new Set<string>();
    (stateTransitions ?? []).forEach((e: { payload?: { decision?: { newState: string; fromState?: string } }; entity_id: string }) => {
      const d = e.payload?.decision as { newState?: string; fromState?: string } | undefined;
      if (d?.newState === "ENGAGED" && d?.fromState === "REACTIVATE") {
        recoveries.add(e.entity_id);
      }
    });

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: metricsRows } = await db
      .from("metrics")
      .select("metric_key, metric_value")
      .eq("workspace_id", workspaceId)
      .gte("period_start", todayStart.toISOString());
    const metrics = (metricsRows ?? []).reduce((acc: Record<string, number>, r: { metric_key: string; metric_value: number }) => {
      acc[r.metric_key] = (acc[r.metric_key] ?? 0) + Number(r.metric_value);
      return acc;
    }, {});

    return NextResponse.json({
      leads_handled: leadCount,
      state_counts: stateCounts,
      bookings_created: bookingsCount,
      revenue_influenced_cents: revenueInfluencedCents,
      recoveries: recoveries.size,
      metrics: {
        replies_sent: metrics.replies_sent ?? 0,
        fallback_used: metrics.fallback_used ?? 0,
        delivery_failed: metrics.delivery_failed ?? 0,
        opt_out: metrics.opt_out ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

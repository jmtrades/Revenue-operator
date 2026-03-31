/**
 * Cron: Benchmark Aggregation
 * Runs daily to compute anonymized industry benchmark data.
 * This is the "data moat" — aggregated metrics by industry that become
 * more valuable over time as more businesses use the platform.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  try {
    // Get all workspaces with their settings (which contain industry/business_type)
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, settings, billing_tier, conversations_handled, created_at");

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no workspaces" });
    }

    // Extract industry from settings or billing_tier groupings
    const industryMap: Record<string, string[]> = {};
    for (const ws of workspaces) {
      const industry =
        (ws.settings as Record<string, unknown>)?.industry as string ||
        (ws.settings as Record<string, unknown>)?.business_type as string ||
        "general";
      if (!industryMap[industry]) industryMap[industry] = [];
      industryMap[industry].push(ws.id);
    }

    // Get settings for business_type info
    const { data: settingsRows } = await db
      .from("settings")
      .select("workspace_id, business_type");

    const settingsMap: Record<string, string> = {};
    if (settingsRows) {
      for (const s of settingsRows) {
        if (s.business_type) settingsMap[s.workspace_id] = s.business_type;
      }
    }

    // Rebuild industry map with settings data
    for (const ws of workspaces) {
      const industry = settingsMap[ws.id] || "general";
      if (!industryMap[industry]) industryMap[industry] = [];
      if (!industryMap[industry].includes(ws.id)) {
        industryMap[industry].push(ws.id);
      }
    }

    const benchmarks: {
      period: string;
      period_start: string;
      industry: string;
      metric_name: string;
      metric_value: number;
      sample_size: number;
    }[] = [];

    // For each industry, compute benchmark metrics
    for (const [industry, wsIds] of Object.entries(industryMap)) {
      if (wsIds.length < 2) continue; // Need minimum sample size for benchmarks

      // Calls per workspace
      const { count: totalCalls } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", wsIds);

      benchmarks.push({
        period: "daily",
        period_start: today,
        industry,
        metric_name: "avg_calls_per_workspace",
        metric_value: (totalCalls ?? 0) / wsIds.length,
        sample_size: wsIds.length,
      });

      // Leads per workspace
      const { count: totalLeads } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", wsIds);

      benchmarks.push({
        period: "daily",
        period_start: today,
        industry,
        metric_name: "avg_leads_per_workspace",
        metric_value: (totalLeads ?? 0) / wsIds.length,
        sample_size: wsIds.length,
      });

      // Appointments per workspace
      const { count: totalAppts } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", wsIds);

      benchmarks.push({
        period: "daily",
        period_start: today,
        industry,
        metric_name: "avg_bookings_per_workspace",
        metric_value: (totalAppts ?? 0) / wsIds.length,
        sample_size: wsIds.length,
      });

      // Agents per workspace
      const { count: totalAgents } = await db
        .from("agents")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", wsIds);

      benchmarks.push({
        period: "daily",
        period_start: today,
        industry,
        metric_name: "avg_agents_per_workspace",
        metric_value: (totalAgents ?? 0) / wsIds.length,
        sample_size: wsIds.length,
      });

      // Workspace count per industry
      benchmarks.push({
        period: "daily",
        period_start: today,
        industry,
        metric_name: "workspace_count",
        metric_value: wsIds.length,
        sample_size: wsIds.length,
      });
    }

    // Upsert benchmarks
    if (benchmarks.length > 0) {
      for (const b of benchmarks) {
        await db.from("benchmark_aggregates").upsert(
          {
            period: b.period,
            period_start: b.period_start,
            industry: b.industry,
            business_size: null,
            use_case: null,
            metric_name: b.metric_name,
            metric_value: b.metric_value,
            sample_size: b.sample_size,
          },
          { onConflict: "period,period_start,industry,business_size,use_case,metric_name" }
        );
      }
    }

    // Also compute daily analytics snapshot
    const { count: totalUsers } = await db.from("users").select("id", { count: "exact", head: true });
    const { count: totalWorkspaces } = await db.from("workspaces").select("id", { count: "exact", head: true });
    const { count: totalCallSessions } = await db.from("call_sessions").select("id", { count: "exact", head: true });
    const { count: totalLeadsAll } = await db.from("leads").select("id", { count: "exact", head: true });

    await db.from("analytics_snapshots").upsert(
      {
        snapshot_date: today,
        metric_category: "daily_totals",
        metrics: {
          users: totalUsers ?? 0,
          workspaces: totalWorkspaces ?? 0,
          calls: totalCallSessions ?? 0,
          leads: totalLeadsAll ?? 0,
          benchmarks_computed: benchmarks.length,
          industries_tracked: Object.keys(industryMap).length,
        },
      },
      { onConflict: "snapshot_date,metric_category" }
    );

    // Record cron heartbeat
    try {
      await db.from("system_cron_heartbeats").upsert(
        {
          cron_name: "benchmark-aggregation",
          last_run_at: now.toISOString(),
          status: "ok",
          metadata: { benchmarks_computed: benchmarks.length },
        },
        { onConflict: "cron_name" }
      );
    } catch { /* heartbeat failure non-critical */ }

    return NextResponse.json({
      status: "ok",
      benchmarks_computed: benchmarks.length,
      industries: Object.keys(industryMap).length,
      snapshot_date: today,
    });
  } catch (err) {
    // Error (details omitted to protect PII): benchmark-aggregation] error:", err);
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}

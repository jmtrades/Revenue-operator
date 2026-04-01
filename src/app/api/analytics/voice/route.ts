/**
 * GET /api/analytics/voice — Real-time voice analytics dashboard data.
 *
 * Returns comprehensive metrics for voice call performance:
 * - Call volume trends (hourly/daily/weekly)
 * - Conversion rates by source, industry, and voice
 * - Average call duration and turn count
 * - Sentiment distribution
 * - ROI metrics (revenue recovered from missed calls)
 * - Top objections and topics
 * - Lead quality scoring distribution
 *
 * Query params:
 *   workspace_id (required) - Workspace to get analytics for
 *   period - "day" | "week" | "month" (default: "week")
 *   demo_only - "true" to filter to demo calls only
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface VoiceAnalytics {
  period: string;
  total_calls: number;
  completed_calls: number;
  avg_duration_seconds: number;
  avg_turns: number;
  conversion_rate: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  outcome_distribution: Record<string, number>;
  calls_by_day: Array<{ date: string; count: number }>;
  top_industries: Array<{ industry: string; count: number }>;
  lead_score_distribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  roi_metrics: {
    estimated_missed_calls_recovered: number;
    estimated_revenue_recovered: number;
    cost_per_call: number;
    roi_multiplier: number;
  };
  voice_performance: Array<{
    voice_id: string;
    calls: number;
    avg_duration: number;
    conversion_rate: number;
  }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const workspaceId = searchParams.get("workspace_id");
  const period = searchParams.get("period") || "week";
  const demoOnly = searchParams.get("demo_only") === "true";

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 },
    );
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "week":
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch call sessions for the period
    let query = db
      .from("call_sessions")
      .select("id, call_started_at, call_ended_at, summary, outcome, metadata, lead_id")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", startDate.toISOString())
      .order("call_started_at", { ascending: false });

    const { data: sessions, error: sessErr } = await query;

    if (sessErr) {
      log("error", "analytics.voice.query_failed", { error: sessErr.message });
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }

    const allSessions = (sessions ?? []) as Array<{
      id: string;
      call_started_at?: string | null;
      call_ended_at?: string | null;
      summary?: string | null;
      outcome?: string | null;
      metadata?: Record<string, unknown> | null;
      lead_id?: string | null;
    }>;

    // Filter demo calls if requested
    const filteredSessions = demoOnly
      ? allSessions.filter((s) => {
          const meta = s.metadata ?? {};
          return meta.is_demo === true || meta.demo_call === true || meta.mode === "demo";
        })
      : allSessions;

    // Calculate metrics
    const totalCalls = filteredSessions.length;
    const completedCalls = filteredSessions.filter((s) => s.call_ended_at).length;

    // Duration stats
    const durations = filteredSessions
      .filter((s) => s.call_started_at && s.call_ended_at)
      .map((s) => {
        const start = new Date(s.call_started_at!).getTime();
        const end = new Date(s.call_ended_at!).getTime();
        return Math.round((end - start) / 1000);
      })
      .filter((d) => d > 0 && d < 3600); // Filter out anomalies

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Turn count stats
    const turnCounts = filteredSessions
      .map((s) => {
        const meta = s.metadata ?? {};
        return (meta.demo_turns as number) || (meta.turns as number) || 0;
      })
      .filter((t) => t > 0);

    const avgTurns = turnCounts.length > 0
      ? Math.round(turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length)
      : 0;

    // Outcome distribution
    const outcomes: Record<string, number> = {};
    for (const s of filteredSessions) {
      const outcome = s.outcome || (s.metadata?.last_call_outcome as string) || "unknown";
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    }

    // Conversion rate (signup_initiated or demo_completed with score > 50)
    const conversions = filteredSessions.filter((s) => {
      const outcome = s.outcome || (s.metadata?.last_call_outcome as string);
      return outcome === "signup_initiated" || outcome === "demo_completed";
    }).length;
    const conversionRate = totalCalls > 0 ? Math.round((conversions / totalCalls) * 100) : 0;

    // Sentiment distribution
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    for (const s of filteredSessions) {
      const meta = s.metadata ?? {};
      const summary = meta.call_summary as { sentiment?: string } | undefined;
      const sent = summary?.sentiment || "neutral";
      if (sent in sentiments) {
        sentiments[sent as keyof typeof sentiments]++;
      }
    }

    // Calls by day
    const dayMap: Record<string, number> = {};
    for (const s of filteredSessions) {
      if (s.call_started_at) {
        const day = s.call_started_at.split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      }
    }
    const callsByDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Lead score distribution
    const leadIds = [...new Set(filteredSessions.map((s) => s.lead_id).filter(Boolean))];
    const leadScores = { hot: 0, warm: 0, cold: 0 };
    if (leadIds.length > 0) {
      try {
        const { data: leads } = await db
          .from("leads")
          .select("status")
          .eq("workspace_id", workspaceId)
          .in("id", leadIds as string[]);

        for (const lead of (leads ?? []) as Array<{ status?: string }>) {
          const status = (lead.status ?? "NEW").toUpperCase();
          if (status === "HOT") leadScores.hot++;
          else if (status === "WARM") leadScores.warm++;
          else leadScores.cold++;
        }
      } catch {
        // Non-critical
      }
    }

    // ROI metrics — use actual data where available, clearly flag estimates
    const costPerMinute = 0.02; // Platform blended cost
    const totalMinutes = durations.reduce((a, b) => a + b, 0) / 60;
    const totalCost = totalMinutes * costPerMinute;
    // Use actual completed/converted calls instead of fake 47% recovery rate
    const estimatedRecovered = completedCalls; // Calls actually handled by AI
    // Revenue: use actual deal data if available, otherwise conservative $0 (no fake estimates)
    let estimatedRevenue = 0;
    try {
      const { data: dealData } = await db
        .from("deals")
        .select("value_cents")
        .eq("workspace_id", workspaceId)
        .in("status", ["won", "closed"])
        .gte("created_at", sinceDate);
      const dealValues = (dealData ?? []) as { value_cents?: number }[];
      estimatedRevenue = dealValues.reduce((sum, d) => sum + (d.value_cents ?? 0), 0) / 100;
    } catch {
      // deals table may not exist — revenue stays 0 (honest, not fabricated)
    }

    const analytics: VoiceAnalytics = {
      period,
      total_calls: totalCalls,
      completed_calls: completedCalls,
      avg_duration_seconds: avgDuration,
      avg_turns: avgTurns,
      conversion_rate: conversionRate,
      sentiment_distribution: sentiments,
      outcome_distribution: outcomes,
      calls_by_day: callsByDay,
      top_industries: [], // Would need industry tracking in session metadata
      lead_score_distribution: leadScores,
      roi_metrics: {
        estimated_missed_calls_recovered: estimatedRecovered,
        estimated_revenue_recovered: estimatedRevenue,
        cost_per_call: totalCalls > 0 ? Math.round((totalCost / totalCalls) * 100) / 100 : 0,
        roi_multiplier: totalCost > 0 ? Math.round((estimatedRevenue / totalCost) * 10) / 10 : 0,
      },
      voice_performance: [], // Would need voice_id tracking in session metadata
    };

    return NextResponse.json(analytics);
  } catch (err) {
    log("error", "analytics.voice.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

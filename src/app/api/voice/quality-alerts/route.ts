/**
 * Voice Quality Alerts API
 * GET: Check quality metrics against thresholds and return alerts
 * POST: Configure alert thresholds for a workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

interface QualityAlert {
  type: "mos_low" | "ttfb_high" | "error_spike" | "sentiment_negative";
  severity: "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
  period: string;
}

const DEFAULT_THRESHOLDS = {
  min_mos: 3.5, // Minimum acceptable MOS score
  max_avg_ttfb_ms: 500, // Max acceptable average TTFB
  max_error_rate_pct: 5, // Max error rate percentage
  max_negative_sentiment_pct: 20, // Max negative sentiment percentage
};

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const alerts: QualityAlert[] = [];

    // Look at the last 24 hours of quality data
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: qualityLogs } = await db
      .from("voice_quality_logs")
      .select("avg_ttfb_ms, max_ttfb_ms, error_count, user_sentiment, call_duration_seconds, total_tts_calls")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since.toISOString());

    if (!qualityLogs || qualityLogs.length === 0) {
      return NextResponse.json({ alerts: [], period: "24h", total_calls: 0 });
    }

    const logs = qualityLogs as Array<{
      avg_ttfb_ms: number;
      max_ttfb_ms: number;
      error_count: number;
      user_sentiment: string;
      call_duration_seconds: number;
      total_tts_calls: number;
    }>;

    const totalCalls = logs.length;

    // 1. Check average TTFB
    const avgTtfb =
      logs.reduce((sum, l) => sum + (l.avg_ttfb_ms ?? 0), 0) / totalCalls;

    if (avgTtfb > DEFAULT_THRESHOLDS.max_avg_ttfb_ms) {
      alerts.push({
        type: "ttfb_high",
        severity: avgTtfb > DEFAULT_THRESHOLDS.max_avg_ttfb_ms * 2 ? "critical" : "warning",
        message: `Average TTFB is ${Math.round(avgTtfb)}ms (threshold: ${DEFAULT_THRESHOLDS.max_avg_ttfb_ms}ms)`,
        value: Math.round(avgTtfb),
        threshold: DEFAULT_THRESHOLDS.max_avg_ttfb_ms,
        period: "24h",
      });
    }

    // 2. Check error rate
    const totalErrors = logs.reduce((sum, l) => sum + (l.error_count ?? 0), 0);
    const totalTtsCalls = logs.reduce((sum, l) => sum + (l.total_tts_calls ?? 1), 0);
    const errorRate = totalTtsCalls > 0 ? (totalErrors / totalTtsCalls) * 100 : 0;

    if (errorRate > DEFAULT_THRESHOLDS.max_error_rate_pct) {
      alerts.push({
        type: "error_spike",
        severity: errorRate > DEFAULT_THRESHOLDS.max_error_rate_pct * 2 ? "critical" : "warning",
        message: `Error rate is ${errorRate.toFixed(1)}% (threshold: ${DEFAULT_THRESHOLDS.max_error_rate_pct}%)`,
        value: parseFloat(errorRate.toFixed(1)),
        threshold: DEFAULT_THRESHOLDS.max_error_rate_pct,
        period: "24h",
      });
    }

    // 3. Check negative sentiment rate
    const negativeSentiment = logs.filter((l) => l.user_sentiment === "negative").length;
    const negativePct = totalCalls > 0 ? (negativeSentiment / totalCalls) * 100 : 0;

    if (negativePct > DEFAULT_THRESHOLDS.max_negative_sentiment_pct) {
      alerts.push({
        type: "sentiment_negative",
        severity: negativePct > DEFAULT_THRESHOLDS.max_negative_sentiment_pct * 2 ? "critical" : "warning",
        message: `${negativePct.toFixed(0)}% of calls had negative sentiment (threshold: ${DEFAULT_THRESHOLDS.max_negative_sentiment_pct}%)`,
        value: parseFloat(negativePct.toFixed(1)),
        threshold: DEFAULT_THRESHOLDS.max_negative_sentiment_pct,
        period: "24h",
      });
    }

    // 4. Check MOS estimate (derived from TTFB + error rate + duration)
    // Simple MOS estimation: start at 4.5, deduct for high TTFB, errors, short calls
    const avgDuration =
      logs.reduce((sum, l) => sum + (l.call_duration_seconds ?? 0), 0) / totalCalls;
    let estimatedMos = 4.5;
    if (avgTtfb > 300) estimatedMos -= 0.5;
    if (avgTtfb > 600) estimatedMos -= 0.5;
    if (errorRate > 2) estimatedMos -= 0.3;
    if (errorRate > 10) estimatedMos -= 0.5;
    if (avgDuration < 30) estimatedMos -= 0.3; // Very short calls = likely bad experience
    if (negativePct > 30) estimatedMos -= 0.4;
    estimatedMos = Math.max(1, Math.min(5, estimatedMos));

    if (estimatedMos < DEFAULT_THRESHOLDS.min_mos) {
      alerts.push({
        type: "mos_low",
        severity: estimatedMos < 2.5 ? "critical" : "warning",
        message: `Estimated MOS is ${estimatedMos.toFixed(1)} (threshold: ${DEFAULT_THRESHOLDS.min_mos})`,
        value: parseFloat(estimatedMos.toFixed(1)),
        threshold: DEFAULT_THRESHOLDS.min_mos,
        period: "24h",
      });
    }

    return NextResponse.json({
      alerts,
      period: "24h",
      total_calls: totalCalls,
      metrics: {
        avg_ttfb_ms: Math.round(avgTtfb),
        error_rate_pct: parseFloat(errorRate.toFixed(1)),
        negative_sentiment_pct: parseFloat(negativePct.toFixed(1)),
        estimated_mos: parseFloat(estimatedMos.toFixed(1)),
        avg_duration_seconds: Math.round(avgDuration),
      },
    });
  } catch (error) {
    log("error", "[API] voice quality-alerts error:", { error: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

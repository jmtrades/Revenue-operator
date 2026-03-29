/**
 * GET /api/analytics/voice/ab-comparison — A/B test performance comparison.
 *
 * Compares streaming vs TwiML call variants across key metrics:
 * - Total calls per variant
 * - Average duration per variant
 * - Conversion rate per variant
 * - Average turns (demo interactions) per variant
 * - Sentiment distribution per variant
 *
 * Query params:
 *   workspace_id (required) - Workspace to analyze
 *   period - "7d" | "30d" | "90d" (default: "30d")
 *
 * Returns winner determination (streaming vs twiml) with confidence score.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

interface VariantMetrics {
  total_calls: number;
  avg_duration_seconds: number;
  conversion_rate: number;
  avg_turns: number;
  avg_sentiment_score: number;
}

interface AbComparisonResponse {
  period: string;
  streaming: VariantMetrics;
  twiml: VariantMetrics;
  winner: "streaming" | "twiml" | "inconclusive";
  confidence: number;
  recommendation: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const workspaceId = searchParams.get("workspace_id");
  const period = searchParams.get("period") || "30d";

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch sessions with ab_variant metadata
    const { data: sessions, error: sessErr } = await db
      .from("call_sessions")
      .select("id, metadata, duration_seconds, outcome, lead_id, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startDate.toISOString());

    if (sessErr) {
      log("error", "analytics.ab_comparison.query_failed", {
        error: sessErr.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    const allSessions = (sessions ?? []) as Array<{
      id: string;
      metadata?: Record<string, unknown> | null;
      duration_seconds?: number | null;
      outcome?: string | null;
      lead_id?: string | null;
      created_at?: string | null;
    }>;

    // Group by variant
    const streamingSessions = allSessions.filter((s) => {
      return s.metadata?.ab_variant === "streaming";
    });

    const twimlSessions = allSessions.filter((s) => {
      return s.metadata?.ab_variant === "twiml";
    });

    // Calculate metrics for each variant
    const calculateVariantMetrics = (
      variantSessions: typeof allSessions
    ): VariantMetrics => {
      const totalCalls = variantSessions.length;

      // Average duration
      const durations = variantSessions
        .filter((s) => s.duration_seconds && s.duration_seconds > 0)
        .map((s) => s.duration_seconds!);
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

      // Conversion rate
      const conversions = variantSessions.filter((s) => {
        const outcome = s.outcome || (s.metadata?.outcome as string);
        return outcome && (outcome.includes("signup") || outcome.includes("converted") || outcome.includes("qualified"));
      }).length;
      const conversionRate =
        totalCalls > 0 ? Math.round((conversions / totalCalls) * 100) / 100 : 0;

      // Average turns (demo_history array length)
      const turns = variantSessions
        .map((s) => {
          const history = s.metadata?.demo_history as unknown[];
          return Array.isArray(history) ? history.length : 0;
        })
        .filter((t) => t > 0);
      const avgTurns =
        turns.length > 0
          ? Math.round(turns.reduce((a, b) => a + b, 0) / turns.length)
          : 0;

      // Sentiment score
      const sentimentScores = variantSessions
        .map((s) => {
          const meta = s.metadata ?? {};
          return (meta.sentiment_score as number) || 0.5;
        })
        .filter((s) => s > 0);
      const avgSentimentScore =
        sentimentScores.length > 0
          ? Math.round((sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length) * 100) / 100
          : 0.5;

      return {
        total_calls: totalCalls,
        avg_duration_seconds: avgDuration,
        conversion_rate: conversionRate,
        avg_turns: avgTurns,
        avg_sentiment_score: avgSentimentScore,
      };
    };

    const streamingMetrics = calculateVariantMetrics(streamingSessions);
    const twimlMetrics = calculateVariantMetrics(twimlSessions);

    // Determine winner
    const minSampleSize = 30;
    let winner: "streaming" | "twiml" | "inconclusive";
    let recommendation: string;

    if (
      streamingMetrics.total_calls < minSampleSize ||
      twimlMetrics.total_calls < minSampleSize
    ) {
      winner = "inconclusive";
      recommendation = `Insufficient sample size. Streaming: ${streamingMetrics.total_calls}, TwiML: ${twimlMetrics.total_calls}. Need at least ${minSampleSize} calls per variant.`;
    } else {
      if (streamingMetrics.conversion_rate > twimlMetrics.conversion_rate) {
        winner = "streaming";
        const diff = (
          ((streamingMetrics.conversion_rate - twimlMetrics.conversion_rate) /
            twimlMetrics.conversion_rate) *
          100
        ).toFixed(1);
        recommendation = `Streaming variant wins with ${streamingMetrics.conversion_rate * 100}% conversion rate (+${diff}% vs TwiML). Recommend rolling out streaming.`;
      } else if (
        twimlMetrics.conversion_rate > streamingMetrics.conversion_rate
      ) {
        winner = "twiml";
        const diff = (
          ((twimlMetrics.conversion_rate - streamingMetrics.conversion_rate) /
            streamingMetrics.conversion_rate) *
          100
        ).toFixed(1);
        recommendation = `TwiML variant wins with ${twimlMetrics.conversion_rate * 100}% conversion rate (+${diff}% vs Streaming). Continue with TwiML approach.`;
      } else {
        winner = "inconclusive";
        recommendation = `Both variants have equal conversion rates (${streamingMetrics.conversion_rate * 100}%). Consider other metrics or extend test period.`;
      }
    }

    // Confidence: min sample size / 100
    const confidence = Math.min(
      1,
      Math.min(streamingMetrics.total_calls, twimlMetrics.total_calls) / 100
    );

    const response: AbComparisonResponse = {
      period,
      streaming: streamingMetrics,
      twiml: twimlMetrics,
      winner,
      confidence,
      recommendation,
    };

    return NextResponse.json(response);
  } catch (err) {
    log("error", "analytics.ab_comparison.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Conversation Analytics & A/B Test Tracking
 *
 * Tracks performance metrics for the Call Intelligence Engine,
 * enabling data-driven optimization of sales call strategies.
 *
 * Features:
 * - Per-phase conversion tracking (how many calls progress through each phase)
 * - Strategy effectiveness scoring (which strategy hints lead to closes)
 * - A/B test: Intelligence Engine ON vs OFF
 * - Battlecard effectiveness (which competitor responses work best)
 * - Objection resolution rate tracking
 * - Time-to-close analysis
 * - Agent performance benchmarking
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import type { CallIntelligence, ConversationPhase } from "@/lib/voice/call-intelligence-engine";
import type { CallSummary } from "@/lib/voice/context-carryover";

/* ── Types ───────────────────────────────────────────────────────── */

export interface ConversationAnalytics {
  call_session_id: string;
  workspace_id: string;
  intelligence_enabled: boolean;
  phases_reached: ConversationPhase[];
  max_phase: ConversationPhase;
  phase_durations: Record<string, number>; // phase -> seconds
  strategy_hints_used: string[];
  battlecard_used?: string;
  objections_detected: string[];
  objections_resolved: string[];
  engagement_trajectory: number[]; // engagement scores per turn
  sentiment_trajectory: string[]; // sentiment per turn
  close_attempted: boolean;
  close_successful: boolean;
  total_turns: number;
  agent_talk_ratio: number;
  avg_response_length: number;
  time_to_value_seconds: number; // How quickly we got to value proposition
  outcome: string;
  duration_seconds: number;
  recorded_at: string;
}

export interface ABTestResult {
  period: string; // "2026-03-27"
  workspace_id: string;
  variant_a: VariantMetrics; // Intelligence OFF
  variant_b: VariantMetrics; // Intelligence ON
  winner?: "a" | "b" | "tie";
  confidence: number; // Statistical confidence 0-1
  sample_size: number;
}

export interface VariantMetrics {
  calls: number;
  avg_duration_seconds: number;
  conversion_rate: number;
  avg_engagement_score: number;
  avg_turns: number;
  close_rate: number;
  objection_resolution_rate: number;
  positive_sentiment_rate: number;
  avg_time_to_value_seconds: number;
}

export interface PhaseFlowMetrics {
  phase: ConversationPhase;
  entered: number;
  completed: number;
  dropped: number;
  avg_duration_seconds: number;
  conversion_to_next: number;
}

export interface StrategyEffectiveness {
  strategy_hint: string;
  times_used: number;
  close_rate_when_used: number;
  avg_engagement_delta: number;
  avg_sentiment_improvement: number;
}

/* ── Core Analytics ──────────────────────────────────────────────── */

/**
 * Record analytics for a completed call.
 * Called from post-call automation after summarization.
 */
export async function recordCallAnalytics(
  callSessionId: string,
  workspaceId: string,
  summary: CallSummary,
  intelligence: CallIntelligence | null,
  intelligenceEnabled: boolean,
  history: Array<{ role: string; content: string }>,
): Promise<void> {
  const db = getDb();

  try {
    const totalTurns = history.length;
    const agentTurns = history.filter(h => h.role === "assistant");
    const callerTurns = history.filter(h => h.role === "user");

    const agentWords = agentTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);
    const callerWords = callerTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);
    const totalWords = agentWords + callerWords;

    const analytics: ConversationAnalytics = {
      call_session_id: callSessionId,
      workspace_id: workspaceId,
      intelligence_enabled: intelligenceEnabled,
      phases_reached: intelligence ? [intelligence.phase] : [],
      max_phase: intelligence?.phase ?? "opening",
      phase_durations: {},
      strategy_hints_used: intelligence?.strategyHints ?? [],
      battlecard_used: intelligence?.battlecard?.competitor ?? undefined,
      objections_detected: intelligence?.objectionPatterns ?? [],
      objections_resolved: summary.objections_raised?.length
        ? summary.objections_raised.filter(() => summary.outcome !== "objection_unresolved")
        : [],
      engagement_trajectory: intelligence ? [intelligence.engagementScore] : [],
      sentiment_trajectory: [summary.sentiment],
      close_attempted: intelligence?.shouldAttemptClose ?? false,
      close_successful: ["demo_completed", "signup_initiated"].includes(summary.outcome),
      total_turns: totalTurns,
      agent_talk_ratio: totalWords > 0 ? agentWords / totalWords : 0.5,
      avg_response_length: agentTurns.length > 0
        ? agentWords / agentTurns.length
        : 0,
      time_to_value_seconds: estimateTimeToValue(history, summary.duration_seconds),
      outcome: summary.outcome,
      duration_seconds: summary.duration_seconds,
      recorded_at: new Date().toISOString(),
    };

    // Store in call_session metadata
    const { data: session } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", callSessionId)
      .maybeSingle();

    const meta = ((session as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;

    await db.from("call_sessions").update({
      metadata: {
        ...meta,
        conversation_analytics: analytics,
      },
    }).eq("id", callSessionId);

    // Update workspace-level A/B test aggregation
    await updateABTestAggregation(workspaceId, analytics);

    log("info", "conversation_analytics.recorded", {
      callSessionId,
      intelligenceEnabled,
      outcome: summary.outcome,
      engagement: intelligence?.engagementScore,
      maxPhase: analytics.max_phase,
    });
  } catch (err) {
    log("warn", "conversation_analytics.record_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Estimate how many seconds into the call we reached the value proposition.
 */
function estimateTimeToValue(
  history: Array<{ role: string; content: string }>,
  totalDuration: number,
): number {
  const valueKeywords = /\b(save|recover|revenue|missed calls|roi|automat|convert|leads)\b/i;

  for (let i = 0; i < history.length; i++) {
    if (history[i].role === "assistant" && valueKeywords.test(history[i].content)) {
      // Estimate time based on turn position
      return Math.round((i / Math.max(history.length, 1)) * totalDuration);
    }
  }

  return totalDuration; // Never reached value prop
}

/* ── A/B Test Aggregation ────────────────────────────────────────── */

/**
 * Update workspace-level A/B test metrics.
 */
async function updateABTestAggregation(
  workspaceId: string,
  analytics: ConversationAnalytics,
): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const abTests = (meta.ab_test_results ?? {}) as Record<string, {
      variant_a: VariantAccumulator;
      variant_b: VariantAccumulator;
    }>;

    // Initialize today's bucket if needed
    if (!abTests[today]) {
      abTests[today] = {
        variant_a: emptyAccumulator(),
        variant_b: emptyAccumulator(),
      };
    }

    const bucket = analytics.intelligence_enabled ? abTests[today].variant_b : abTests[today].variant_a;

    bucket.calls += 1;
    bucket.total_duration += analytics.duration_seconds;
    bucket.total_engagement += (analytics.engagement_trajectory[0] ?? 50);
    bucket.total_turns += analytics.total_turns;
    bucket.total_time_to_value += analytics.time_to_value_seconds;
    if (analytics.close_attempted) bucket.close_attempts += 1;
    if (analytics.close_successful) bucket.close_successes += 1;
    if (analytics.sentiment_trajectory.includes("positive")) bucket.positive_sentiment += 1;
    const detected = analytics.objections_detected.length;
    const resolved = analytics.objections_resolved.length;
    bucket.objections_detected += detected;
    bucket.objections_resolved += resolved;

    // Keep last 30 days of data
    const keys = Object.keys(abTests).sort();
    if (keys.length > 30) {
      for (const oldKey of keys.slice(0, keys.length - 30)) {
        delete abTests[oldKey];
      }
    }

    await db.from("workspaces").update({
      metadata: {
        ...meta,
        ab_test_results: abTests,
        ab_test_last_updated: new Date().toISOString(),
      },
    }).eq("id", workspaceId);
  } catch (err) {
    log("warn", "conversation_analytics.ab_update_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

interface VariantAccumulator {
  calls: number;
  total_duration: number;
  total_engagement: number;
  total_turns: number;
  total_time_to_value: number;
  close_attempts: number;
  close_successes: number;
  positive_sentiment: number;
  objections_detected: number;
  objections_resolved: number;
}

function emptyAccumulator(): VariantAccumulator {
  return {
    calls: 0,
    total_duration: 0,
    total_engagement: 0,
    total_turns: 0,
    total_time_to_value: 0,
    close_attempts: 0,
    close_successes: 0,
    positive_sentiment: 0,
    objections_detected: 0,
    objections_resolved: 0,
  };
}

/* ── Reporting ───────────────────────────────────────────────────── */

/**
 * Generate A/B test results for a date range.
 */
export async function getABTestResults(
  workspaceId: string,
  days: number = 7,
): Promise<ABTestResult | null> {
  const db = getDb();

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const abTests = (meta.ab_test_results ?? {}) as Record<string, {
      variant_a: VariantAccumulator;
      variant_b: VariantAccumulator;
    }>;

    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

    const aggregatedA = emptyAccumulator();
    const aggregatedB = emptyAccumulator();

    for (const [date, data] of Object.entries(abTests)) {
      if (date < cutoff) continue;
      mergeAccumulators(aggregatedA, data.variant_a);
      mergeAccumulators(aggregatedB, data.variant_b);
    }

    const totalSample = aggregatedA.calls + aggregatedB.calls;
    if (totalSample === 0) return null;

    const variantA = accumulatorToMetrics(aggregatedA);
    const variantB = accumulatorToMetrics(aggregatedB);

    // Simple statistical significance check
    const pooledRate = (aggregatedA.close_successes + aggregatedB.close_successes) / Math.max(totalSample, 1);
    const seDiff = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / Math.max(aggregatedA.calls, 1) + 1 / Math.max(aggregatedB.calls, 1)));
    const zScore = seDiff > 0 ? Math.abs(variantA.close_rate - variantB.close_rate) / seDiff : 0;
    const confidence = Math.min(0.99, 1 - Math.exp(-0.5 * zScore * zScore)); // Approximate p-value

    let winner: "a" | "b" | "tie" = "tie";
    if (confidence >= 0.90) {
      winner = variantB.close_rate > variantA.close_rate ? "b" : "a";
    }

    return {
      period: `${cutoff} to ${new Date().toISOString().slice(0, 10)}`,
      workspace_id: workspaceId,
      variant_a: variantA,
      variant_b: variantB,
      winner,
      confidence,
      sample_size: totalSample,
    };
  } catch (err) {
    log("error", "conversation_analytics.ab_results_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function mergeAccumulators(target: VariantAccumulator, source: VariantAccumulator): void {
  target.calls += source.calls;
  target.total_duration += source.total_duration;
  target.total_engagement += source.total_engagement;
  target.total_turns += source.total_turns;
  target.total_time_to_value += source.total_time_to_value;
  target.close_attempts += source.close_attempts;
  target.close_successes += source.close_successes;
  target.positive_sentiment += source.positive_sentiment;
  target.objections_detected += source.objections_detected;
  target.objections_resolved += source.objections_resolved;
}

function accumulatorToMetrics(acc: VariantAccumulator): VariantMetrics {
  const calls = Math.max(acc.calls, 1);
  return {
    calls: acc.calls,
    avg_duration_seconds: Math.round(acc.total_duration / calls),
    conversion_rate: acc.close_successes / calls,
    avg_engagement_score: Math.round(acc.total_engagement / calls),
    avg_turns: Math.round(acc.total_turns / calls),
    close_rate: acc.close_attempts > 0 ? acc.close_successes / acc.close_attempts : 0,
    objection_resolution_rate: acc.objections_detected > 0 ? acc.objections_resolved / acc.objections_detected : 1,
    positive_sentiment_rate: acc.positive_sentiment / calls,
    avg_time_to_value_seconds: Math.round(acc.total_time_to_value / calls),
  };
}

/**
 * Get phase flow funnel metrics for a workspace.
 */
export async function getPhaseFlowMetrics(
  workspaceId: string,
  days: number = 7,
): Promise<PhaseFlowMetrics[]> {
  const db = getDb();
  const phases: ConversationPhase[] = [
    "opening", "rapport", "discovery", "value_proposition",
    "proof", "objection_handling", "pricing", "closing", "post_close",
  ];

  try {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: sessions } = await db
      .from("call_sessions")
      .select("metadata, duration_seconds")
      .eq("workspace_id", workspaceId)
      .gte("created_at", cutoff)
      .not("metadata->>conversation_analytics", "is", null)
      .limit(500);

    const sessionList = (sessions ?? []) as Array<{
      metadata?: Record<string, unknown>;
      duration_seconds?: number;
    }>;

    const phaseCounts = new Map<string, { entered: number; durations: number[] }>();
    for (const p of phases) {
      phaseCounts.set(p, { entered: 0, durations: [] });
    }

    for (const sess of sessionList) {
      const analytics = sess.metadata?.conversation_analytics as ConversationAnalytics | undefined;
      if (!analytics) continue;

      // Count which phase this call reached
      const phaseIdx = phases.indexOf(analytics.max_phase);
      for (let i = 0; i <= phaseIdx; i++) {
        const p = phaseCounts.get(phases[i])!;
        p.entered += 1;
        p.durations.push(analytics.duration_seconds / Math.max(phaseIdx + 1, 1));
      }
    }

    return phases.map((phase, idx) => {
      const data = phaseCounts.get(phase)!;
      const nextData = idx < phases.length - 1 ? phaseCounts.get(phases[idx + 1])! : null;
      const avgDuration = data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0;

      return {
        phase,
        entered: data.entered,
        completed: nextData?.entered ?? 0,
        dropped: data.entered - (nextData?.entered ?? 0),
        avg_duration_seconds: Math.round(avgDuration),
        conversion_to_next: data.entered > 0
          ? (nextData?.entered ?? 0) / data.entered
          : 0,
      };
    });
  } catch (err) {
    log("error", "conversation_analytics.phase_flow_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

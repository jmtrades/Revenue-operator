/**
 * Voice quality monitoring — tracks per-call metrics and flags degradation.
 */

import { getDb } from "@/lib/db/queries";

export interface CallQualityMetrics {
  call_session_id: string;
  answer_latency_ms: number;
  avg_response_latency_ms: number;
  interruption_count: number;
  fallback_events: Array<{
    component: string;
    reason: string;
    timestamp: string;
    latency_added_ms: number;
  }>;
  cost_cents: number;
  stt_model: string;
  tts_model: string;
  llm_model: string;
}

export interface QualityScore {
  score: number; // 0-100
  flags: string[];
}

const THRESHOLDS = {
  answer_latency_critical: 5000, // >5s = critical
  answer_latency_warning: 3000, // >3s = warning
  response_latency_critical: 2000, // >2s = critical
  response_latency_warning: 1200, // >1.2s = warning
  max_fallback_events: 3,
  max_interruptions_warning: 5,
} as const;

export function calculateQualityScore(metrics: CallQualityMetrics): QualityScore {
  let score = 100;
  const flags: string[] = [];

  // Answer latency
  if (metrics.answer_latency_ms > THRESHOLDS.answer_latency_critical) {
    score -= 30;
    flags.push("answer_latency_critical");
  } else if (metrics.answer_latency_ms > THRESHOLDS.answer_latency_warning) {
    score -= 15;
    flags.push("answer_latency_warning");
  }

  // Response latency
  if (metrics.avg_response_latency_ms > THRESHOLDS.response_latency_critical) {
    score -= 25;
    flags.push("response_latency_critical");
  } else if (metrics.avg_response_latency_ms > THRESHOLDS.response_latency_warning) {
    score -= 10;
    flags.push("response_latency_warning");
  }

  // Fallback events
  if (metrics.fallback_events.length > THRESHOLDS.max_fallback_events) {
    score -= 20;
    flags.push("excessive_fallbacks");
  } else if (metrics.fallback_events.length > 0) {
    score -= 5 * metrics.fallback_events.length;
    flags.push("fallback_triggered");
  }

  // Interruptions
  if (metrics.interruption_count > THRESHOLDS.max_interruptions_warning) {
    score -= 10;
    flags.push("high_interruption_count");
  }

  return { score: Math.max(0, score), flags };
}

export async function recordCallQuality(
  metrics: CallQualityMetrics,
): Promise<void> {
  const db = getDb();
  const quality = calculateQualityScore(metrics);

  // Update call_sessions with quality data
  await db
    .from("call_sessions")
    .update({
      answer_latency_ms: metrics.answer_latency_ms,
      avg_response_latency_ms: metrics.avg_response_latency_ms,
      interruption_count: metrics.interruption_count,
      fallback_events: metrics.fallback_events,
      cost_cents: metrics.cost_cents,
      stt_model: metrics.stt_model,
      tts_model: metrics.tts_model,
      llm_model: metrics.llm_model,
    })
    .eq("id", metrics.call_session_id);

  // Log quality score for analytics
  if (quality.score < 50) {
    console.error(
      `[voice/quality] Low quality call ${metrics.call_session_id}: score=${quality.score}, flags=${quality.flags.join(",")}`,
    );
  }
}

export function shouldAlertOnQuality(
  recentScores: number[],
  threshold = 5,
): boolean {
  // Alert if more than threshold calls in the recent window scored below 50
  const lowQualityCalls = recentScores.filter((s) => s < 50).length;
  return lowQualityCalls >= threshold;
}

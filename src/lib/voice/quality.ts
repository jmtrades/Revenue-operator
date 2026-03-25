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

/**
 * Enhanced quality thresholds — per-phase latency budgets.
 * Each call phase has a maximum acceptable latency.
 * Exceeding the budget is logged as a quality event.
 */
export const LATENCY_BUDGETS = {
  /** First response after call connects — critical for first impression */
  greeting: { target: 500, warning: 800, critical: 1200 },
  /** Response to simple yes/no or confirmation question */
  simple_response: { target: 300, warning: 600, critical: 1000 },
  /** Normal conversational response */
  normal_response: { target: 600, warning: 900, critical: 1500 },
  /** Complex response requiring tool call or reasoning */
  complex_response: { target: 1000, warning: 1500, critical: 2500 },
  /** Booking confirmation readback */
  booking_confirmation: { target: 800, warning: 1200, critical: 2000 },
  /** Transfer initiation */
  transfer: { target: 500, warning: 1000, critical: 2000 },
} as const;

export type LatencyPhase = keyof typeof LATENCY_BUDGETS;

/**
 * Check if a specific call phase exceeded its latency budget.
 */
export function checkLatencyBudget(
  phase: LatencyPhase,
  actualMs: number,
): { status: "ok" | "warning" | "critical"; budgetMs: number; actualMs: number } {
  const budget = LATENCY_BUDGETS[phase];
  if (actualMs > budget.critical) {
    return { status: "critical", budgetMs: budget.critical, actualMs };
  }
  if (actualMs > budget.warning) {
    return { status: "warning", budgetMs: budget.warning, actualMs };
  }
  return { status: "ok", budgetMs: budget.target, actualMs };
}

/**
 * Comprehensive per-call quality report including human-likeness score.
 */
export interface DetailedQualityReport {
  /** Overall quality score 0-100 */
  overallScore: number;
  /** Breakdown by category */
  categories: {
    latency: number;       // 0-25 points
    naturalness: number;    // 0-25 points
    accuracy: number;       // 0-25 points
    outcome: number;        // 0-25 points
  };
  /** Specific issues detected */
  issues: QualityIssue[];
  /** Recommendation for improvement */
  recommendation: string | null;
}

export interface QualityIssue {
  category: "latency" | "naturalness" | "accuracy" | "outcome";
  severity: "info" | "warning" | "critical";
  description: string;
}

/**
 * Calculate a detailed quality report from call metrics and transcript.
 */
export function calculateDetailedQuality(
  metrics: CallQualityMetrics,
  transcript?: Array<{ speaker: string; text: string }>,
  callOutcome?: "completed" | "abandoned" | "transferred" | "voicemail",
): DetailedQualityReport {
  const issues: QualityIssue[] = [];
  let latencyScore = 25;
  let naturalnessScore = 25;
  let accuracyScore = 25;
  let outcomeScore = 25;

  // === LATENCY ===
  if (metrics.answer_latency_ms > 3000) {
    latencyScore -= 15;
    issues.push({ category: "latency", severity: "critical", description: `First response took ${(metrics.answer_latency_ms / 1000).toFixed(1)}s (target: <0.5s)` });
  } else if (metrics.answer_latency_ms > 1200) {
    latencyScore -= 8;
    issues.push({ category: "latency", severity: "warning", description: `First response took ${(metrics.answer_latency_ms / 1000).toFixed(1)}s` });
  }

  if (metrics.avg_response_latency_ms > 1500) {
    latencyScore -= 10;
    issues.push({ category: "latency", severity: "critical", description: `Average response latency ${(metrics.avg_response_latency_ms / 1000).toFixed(1)}s` });
  } else if (metrics.avg_response_latency_ms > 900) {
    latencyScore -= 5;
    issues.push({ category: "latency", severity: "warning", description: `Average response latency ${(metrics.avg_response_latency_ms / 1000).toFixed(1)}s` });
  }

  // === NATURALNESS ===
  if (metrics.interruption_count > 8) {
    naturalnessScore -= 12;
    issues.push({ category: "naturalness", severity: "critical", description: `${metrics.interruption_count} interruptions — agent may be talking over caller` });
  } else if (metrics.interruption_count > 4) {
    naturalnessScore -= 5;
    issues.push({ category: "naturalness", severity: "warning", description: `${metrics.interruption_count} interruptions detected` });
  }

  // Check transcript for repetition patterns
  if (transcript && transcript.length > 6) {
    const agentResponses = transcript.filter((t) => t.speaker === "assistant").map((t) => t.text);
    const openingWords = agentResponses.map((r) => r.split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
    // Check if same opening word used 3+ times in a row
    for (let i = 0; i < openingWords.length - 2; i++) {
      if (openingWords[i] === openingWords[i + 1] && openingWords[i + 1] === openingWords[i + 2]) {
        naturalnessScore -= 6;
        issues.push({ category: "naturalness", severity: "warning", description: `Repeated opener "${openingWords[i]}" 3x in a row` });
        break;
      }
    }
  }

  // === ACCURACY ===
  if (metrics.fallback_events.length > 3) {
    accuracyScore -= 15;
    issues.push({ category: "accuracy", severity: "critical", description: `${metrics.fallback_events.length} tool failures during call` });
  } else if (metrics.fallback_events.length > 0) {
    accuracyScore -= 3 * metrics.fallback_events.length;
    issues.push({ category: "accuracy", severity: "info", description: `${metrics.fallback_events.length} tool fallback(s)` });
  }

  // === OUTCOME ===
  if (callOutcome === "abandoned") {
    outcomeScore -= 15;
    issues.push({ category: "outcome", severity: "critical", description: "Caller abandoned the call" });
  } else if (callOutcome === "transferred") {
    outcomeScore -= 5;
    issues.push({ category: "outcome", severity: "info", description: "Call transferred to human" });
  }

  latencyScore = Math.max(0, latencyScore);
  naturalnessScore = Math.max(0, naturalnessScore);
  accuracyScore = Math.max(0, accuracyScore);
  outcomeScore = Math.max(0, outcomeScore);

  const overallScore = latencyScore + naturalnessScore + accuracyScore + outcomeScore;

  // Generate recommendation
  let recommendation: string | null = null;
  const criticalIssues = issues.filter((i) => i.severity === "critical");
  if (criticalIssues.length > 0) {
    const topIssue = criticalIssues[0];
    recommendation = `Priority fix: ${topIssue.description}`;
  }

  return {
    overallScore,
    categories: { latency: latencyScore, naturalness: naturalnessScore, accuracy: accuracyScore, outcome: outcomeScore },
    issues,
    recommendation,
  };
}

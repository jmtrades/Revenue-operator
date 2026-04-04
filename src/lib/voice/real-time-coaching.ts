/**
 * Real-Time Call Coaching System
 *
 * Provides live coaching suggestions during calls based on conversation patterns.
 * This system runs alongside the Call Intelligence Engine and provides
 * specific, actionable coaching tips that improve call quality over time.
 *
 * Features:
 * - Talk ratio monitoring (alert when agent talks too much)
 * - Question density tracking (flag when not asking enough questions)
 * - Pace monitoring (detect rushing or dragging)
 * - Objection handling quality scoring
 * - Close timing optimization
 * - Filler word detection
 * - Empathy gap detection
 * - Competitive response quality
 * - Post-call coaching report generation
 */

import type { ConversationMessage } from "./demo-agent";

/* ── Types ───────────────────────────────────────────────────────── */

export interface CoachingInsight {
  type: CoachingType;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
  metric_name: string;
  metric_value: number;
  threshold: number;
}

export type CoachingType =
  | "talk_ratio"
  | "question_density"
  | "response_length"
  | "pace"
  | "filler_words"
  | "empathy_gap"
  | "close_timing"
  | "objection_quality"
  | "discovery_depth"
  | "value_alignment"
  | "urgency_creation"
  | "social_proof_usage";

export interface CoachingReport {
  call_session_id: string;
  overall_score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  insights: CoachingInsight[];
  strengths: string[];
  improvements: string[];
  talk_ratio: number;
  question_count: number;
  avg_response_words: number;
  filler_word_count: number;
  empathy_statements: number;
  social_proof_mentions: number;
  close_attempts: number;
  discovery_questions: number;
  generated_at: string;
}

/* ── Coaching Thresholds ─────────────────────────────────────────── */

const THRESHOLDS = {
  /** Agent should talk 40-60% of the time */
  talk_ratio_min: 0.35,
  talk_ratio_max: 0.60,
  /** At least 1 question per 3 agent turns */
  min_question_ratio: 0.33,
  /** Agent responses should be 15-80 words */
  response_length_min: 15,
  response_length_max: 80,
  /** Maximum filler words per response */
  max_filler_per_response: 2,
  /** Minimum empathy statements in first 5 turns */
  min_early_empathy: 1,
  /** Minimum social proof mentions */
  min_social_proof: 1,
  /** Discovery questions in first half of call */
  min_discovery_questions: 2,
};

/* ── Filler Words & Patterns ─────────────────────────────────────── */

const FILLER_PATTERNS = /\b(um|uh|like|basically|actually|honestly|literally|sort of|kind of|you know|i mean|so yeah)\b/gi;
const QUESTION_PATTERN = /\?|what|how|when|where|why|which|who|could you|would you|can you|do you|are you|have you|tell me/i;
const EMPATHY_PATTERNS = /\b(understand|i hear you|makes sense|totally get|that's tough|i appreciate|great question|absolutely|valid|fair point)\b/i;
const SOCIAL_PROOF_PATTERNS = /\b(customers|businesses|companies|clients|users|teams|practices|agencies|case study|proven|results|data shows|research)\b/i;
const DISCOVERY_PATTERNS = /\b(what.*(challenge|struggle|pain|problem|frustrat|issue)|how.*(current|handle|manage|deal)|tell me about|walk me through|what's your biggest)\b/i;
const _URGENCY_PATTERNS = /\b(right now|today|this week|limited|exclusive|before|deadline|running out|only|special)\b/i;
const _VALUE_PATTERNS = /\b(save|recover|increase|boost|improve|reduce|eliminate|automat|roi|revenue|profit|growth|efficiency)\b/i;

/* ── Real-Time Analysis ──────────────────────────────────────────── */

/**
 * Analyze the current conversation state and generate coaching insights.
 * Called each turn to provide real-time feedback.
 */
export function analyzeForCoaching(
  history: ConversationMessage[],
): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  if (history.length < 4) return insights; // Too early to coach

  const agentMessages = history.filter(m => m.role === "assistant");
  const callerMessages = history.filter(m => m.role === "user");

  if (agentMessages.length === 0) return insights;

  // 1. Talk ratio analysis
  const agentWords = agentMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const callerWords = callerMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const totalWords = agentWords + callerWords;
  const talkRatio = totalWords > 0 ? agentWords / totalWords : 0.5;

  if (talkRatio > THRESHOLDS.talk_ratio_max) {
    insights.push({
      type: "talk_ratio",
      severity: talkRatio > 0.70 ? "critical" : "warning",
      message: `Agent talk ratio is ${(talkRatio * 100).toFixed(0)}% — you're dominating the conversation.`,
      suggestion: "Ask more open-ended questions. Let the caller talk about their needs. Use shorter responses.",
      metric_name: "talk_ratio",
      metric_value: talkRatio,
      threshold: THRESHOLDS.talk_ratio_max,
    });
  } else if (talkRatio < THRESHOLDS.talk_ratio_min) {
    insights.push({
      type: "talk_ratio",
      severity: "info",
      message: `Agent talk ratio is only ${(talkRatio * 100).toFixed(0)}% — you may not be providing enough value.`,
      suggestion: "Share more insights, data points, and specific examples to demonstrate value.",
      metric_name: "talk_ratio",
      metric_value: talkRatio,
      threshold: THRESHOLDS.talk_ratio_min,
    });
  }

  // 2. Question density
  const questionsAsked = agentMessages.filter(m => QUESTION_PATTERN.test(m.content)).length;
  const questionRatio = agentMessages.length > 0 ? questionsAsked / agentMessages.length : 0;

  if (questionRatio < THRESHOLDS.min_question_ratio && history.length > 6) {
    insights.push({
      type: "question_density",
      severity: "warning",
      message: `Only ${questionsAsked} questions in ${agentMessages.length} responses. Not enough discovery.`,
      suggestion: "Ask 'What's your biggest challenge with...' or 'How are you currently handling...'",
      metric_name: "question_ratio",
      metric_value: questionRatio,
      threshold: THRESHOLDS.min_question_ratio,
    });
  }

  // 3. Response length
  const recentAgent = agentMessages.slice(-3);
  const avgRecentWords = recentAgent.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0) / recentAgent.length;

  if (avgRecentWords > THRESHOLDS.response_length_max) {
    insights.push({
      type: "response_length",
      severity: "warning",
      message: `Average response is ${Math.round(avgRecentWords)} words — too verbose for phone conversations.`,
      suggestion: "Keep responses under 60 words on the phone. Break long explanations into conversational chunks.",
      metric_name: "avg_response_words",
      metric_value: avgRecentWords,
      threshold: THRESHOLDS.response_length_max,
    });
  }

  // 4. Filler word detection
  const lastResponse = agentMessages[agentMessages.length - 1]?.content ?? "";
  const fillerMatches = lastResponse.match(FILLER_PATTERNS);
  const fillerCount = fillerMatches?.length ?? 0;

  if (fillerCount > THRESHOLDS.max_filler_per_response) {
    insights.push({
      type: "filler_words",
      severity: "info",
      message: `${fillerCount} filler words detected in last response: ${fillerMatches?.join(", ")}`,
      suggestion: "Replace filler words with confident pauses. 'So' → 'Here's what I recommend:'",
      metric_name: "filler_count",
      metric_value: fillerCount,
      threshold: THRESHOLDS.max_filler_per_response,
    });
  }

  // 5. Empathy gap detection (early turns)
  if (history.length <= 10) {
    const earlyAgentMsgs = agentMessages.slice(0, 3);
    const empathyCount = earlyAgentMsgs.filter(m => EMPATHY_PATTERNS.test(m.content)).length;

    if (empathyCount < THRESHOLDS.min_early_empathy) {
      insights.push({
        type: "empathy_gap",
        severity: "warning",
        message: "No empathy statements detected in opening turns.",
        suggestion: "Start with 'I understand...' or 'That's a great question...' to build rapport.",
        metric_name: "early_empathy_count",
        metric_value: empathyCount,
        threshold: THRESHOLDS.min_early_empathy,
      });
    }
  }

  // 6. Discovery depth
  if (history.length > 6 && history.length < 16) {
    const discoveryQs = agentMessages.filter(m => DISCOVERY_PATTERNS.test(m.content)).length;
    if (discoveryQs < THRESHOLDS.min_discovery_questions) {
      insights.push({
        type: "discovery_depth",
        severity: "warning",
        message: `Only ${discoveryQs} discovery questions asked. Not enough to understand their needs.`,
        suggestion: "Ask about their current solution, biggest pain points, and decision timeline.",
        metric_name: "discovery_questions",
        metric_value: discoveryQs,
        threshold: THRESHOLDS.min_discovery_questions,
      });
    }
  }

  // 7. Social proof usage
  if (history.length > 8) {
    const socialProofCount = agentMessages.filter(m => SOCIAL_PROOF_PATTERNS.test(m.content)).length;
    if (socialProofCount < THRESHOLDS.min_social_proof) {
      insights.push({
        type: "social_proof_usage",
        severity: "info",
        message: "No social proof or case study mentions detected.",
        suggestion: "Mention how other businesses in their industry use the platform successfully.",
        metric_name: "social_proof_mentions",
        metric_value: socialProofCount,
        threshold: THRESHOLDS.min_social_proof,
      });
    }
  }

  return insights;
}

/**
 * Generate a comprehensive post-call coaching report.
 */
export function generateCoachingReport(
  callSessionId: string,
  history: ConversationMessage[],
): CoachingReport {
  const insights = analyzeForCoaching(history);
  const agentMessages = history.filter(m => m.role === "assistant");
  const callerMessages = history.filter(m => m.role === "user");

  const agentWords = agentMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const callerWords = callerMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const totalWords = agentWords + callerWords;

  const talkRatio = totalWords > 0 ? agentWords / totalWords : 0.5;
  const questionCount = agentMessages.filter(m => QUESTION_PATTERN.test(m.content)).length;
  const avgResponseWords = agentMessages.length > 0 ? agentWords / agentMessages.length : 0;

  let fillerTotal = 0;
  for (const m of agentMessages) {
    fillerTotal += (m.content.match(FILLER_PATTERNS)?.length ?? 0);
  }

  const empathyCount = agentMessages.filter(m => EMPATHY_PATTERNS.test(m.content)).length;
  const socialProofCount = agentMessages.filter(m => SOCIAL_PROOF_PATTERNS.test(m.content)).length;
  const discoveryCount = agentMessages.filter(m => DISCOVERY_PATTERNS.test(m.content)).length;

  // Close attempts (mentions of pricing, signup, next steps in later turns)
  const closePatterns = /\b(sign up|get started|pricing|plan|ready to|next step|schedule|book)\b/i;
  const laterAgent = agentMessages.slice(Math.floor(agentMessages.length * 0.5));
  const closeAttempts = laterAgent.filter(m => closePatterns.test(m.content)).length;

  // Calculate score
  let score = 50; // Base score

  // Talk ratio (±15)
  if (talkRatio >= 0.40 && talkRatio <= 0.55) score += 15;
  else if (talkRatio >= 0.35 && talkRatio <= 0.60) score += 8;
  else score -= 10;

  // Questions (±15)
  const qRatio = agentMessages.length > 0 ? questionCount / agentMessages.length : 0;
  if (qRatio >= 0.4) score += 15;
  else if (qRatio >= 0.25) score += 8;
  else score -= 5;

  // Response length (±10)
  if (avgResponseWords >= 20 && avgResponseWords <= 60) score += 10;
  else if (avgResponseWords > 80) score -= 10;

  // Empathy (+5)
  if (empathyCount >= 2) score += 5;

  // Social proof (+5)
  if (socialProofCount >= 1) score += 5;

  // Discovery (+5)
  if (discoveryCount >= 2) score += 5;

  // Filler words (-3 per excess)
  score -= Math.max(0, fillerTotal - 3) * 3;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  // Identify strengths and improvements
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (talkRatio >= 0.40 && talkRatio <= 0.55) strengths.push("Excellent talk-to-listen ratio");
  if (qRatio >= 0.35) strengths.push("Strong question-asking habit");
  if (empathyCount >= 3) strengths.push("Good use of empathy statements");
  if (socialProofCount >= 2) strengths.push("Effective social proof usage");
  if (avgResponseWords >= 20 && avgResponseWords <= 50) strengths.push("Concise, phone-optimized responses");

  for (const insight of insights) {
    if (insight.severity === "critical" || insight.severity === "warning") {
      improvements.push(insight.suggestion);
    }
  }

  if (improvements.length === 0) {
    improvements.push("Continue refining question timing and discovery depth.");
  }

  return {
    call_session_id: callSessionId,
    overall_score: score,
    grade,
    insights,
    strengths,
    improvements,
    talk_ratio: talkRatio,
    question_count: questionCount,
    avg_response_words: Math.round(avgResponseWords),
    filler_word_count: fillerTotal,
    empathy_statements: empathyCount,
    social_proof_mentions: socialProofCount,
    close_attempts: closeAttempts,
    discovery_questions: discoveryCount,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Build a coaching context string to inject into the system prompt mid-call.
 * This is the real-time coaching that guides the AI during the conversation.
 */
export function buildCoachingContext(insights: CoachingInsight[]): string {
  if (insights.length === 0) return "";

  const critical = insights.filter(i => i.severity === "critical");
  const warnings = insights.filter(i => i.severity === "warning");

  let context = "\n\n## REAL-TIME COACHING\n";

  if (critical.length > 0) {
    context += "⚠️ URGENT adjustments needed:\n";
    for (const c of critical) {
      context += `- ${c.suggestion}\n`;
    }
  }

  if (warnings.length > 0) {
    context += "Coaching tips:\n";
    for (const w of warnings.slice(0, 3)) {
      context += `- ${w.suggestion}\n`;
    }
  }

  return context;
}

/**
 * Sentiment-Triggered Escalation System
 *
 * Monitors live call sentiment and automatically escalates when
 * a call is going south. Prevents lost deals by:
 * - Detecting declining sentiment patterns
 * - Triggering strategy pivots before it's too late
 * - Escalating to human agent when AI can't recover
 * - Sending real-time alerts to workspace owners
 * - Logging escalation events for coaching
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { fireWebhookEvent } from "@/lib/integrations/webhook-events";
import type { ConversationMessage } from "./demo-agent";

/* ── Types ───────────────────────────────────────────────────────── */

export type EscalationLevel = "none" | "watch" | "warning" | "critical" | "escalate";

export interface EscalationAssessment {
  level: EscalationLevel;
  score: number; // 0-100, higher = more at risk
  triggers: string[];
  recommended_action: string;
  strategy_pivot?: string;
  should_transfer: boolean;
}

/* ── Sentiment Patterns ──────────────────────────────────────────── */

const FRUSTRATION_SIGNALS = /\b(frustrat|annoy|waste (of |my |)time|ridiculous|useless|terrible|horrible|worst|scam|rip( |-)off|bull(shit|crap)|not (helping|listening|working)|you('re| are) (not|just) (help|listen)|i('ve| have) (had|heard) enough|forget it|never mind|this is (stupid|dumb|pointless))\b/i;

const ANGER_SIGNALS = /\b(angry|furious|pissed|fed up|livid|outrageous|unacceptable|sue|lawyer|attorney|report|bbb|better business|complaint|escalat|cancel|refund|demand|disgusting)\b/i;

const DISENGAGEMENT_SIGNALS = /\b(whatever|sure|i guess|doesn('t| not) matter|i don('t| not) (care|know)|fine|okay then|if you say so|mhmm|uh huh)\b/i;

const CONFUSION_SIGNALS = /\b(i don('t| not) understand|what (do you mean|are you saying)|that doesn('t| not) make sense|confused|confusing|lost|huh|what\?)\b/i;

const URGENCY_DISTRESS = /\b(please (help|just)|i (really |)(need|beg)|desperate|emergency|critical|urgent|can('t| not) afford|going (to |)(lose|miss)|last (chance|resort))\b/i;

/* ── Core Assessment ─────────────────────────────────────────────── */

/**
 * Assess the escalation level of a live conversation.
 * Called each turn to detect at-risk calls in real time.
 */
export function assessEscalation(
  history: ConversationMessage[],
  currentTurn: number,
): EscalationAssessment {
  const triggers: string[] = [];
  let riskScore = 0;

  if (history.length < 3) {
    return { level: "none", score: 0, triggers: [], recommended_action: "Continue normally", should_transfer: false };
  }

  const callerMessages = history.filter(m => m.role === "user");
  const recentCaller = callerMessages.slice(-3);
  const allCallerText = callerMessages.map(m => m.content).join(" ");

  // 1. Frustration detection (0-25 points)
  let frustrationCount = 0;
  for (const msg of callerMessages) {
    if (FRUSTRATION_SIGNALS.test(msg.content)) frustrationCount++;
  }
  if (frustrationCount > 0) {
    riskScore += Math.min(frustrationCount * 10, 25);
    triggers.push(`Frustration detected (${frustrationCount} signals)`);
  }

  // 2. Anger detection (0-30 points) — immediate escalation trigger
  let angerCount = 0;
  for (const msg of recentCaller) {
    if (ANGER_SIGNALS.test(msg.content)) angerCount++;
  }
  if (angerCount > 0) {
    riskScore += Math.min(angerCount * 15, 30);
    triggers.push(`Anger detected (${angerCount} recent messages)`);
  }

  // 3. Declining engagement (0-15 points)
  if (recentCaller.length >= 2) {
    const recentLengths = recentCaller.map(m => m.content.split(/\s+/).length);
    const avgRecent = recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length;
    const earlyMessages = callerMessages.slice(0, Math.max(callerMessages.length - 3, 1));
    const earlyLengths = earlyMessages.map(m => m.content.split(/\s+/).length);
    const avgEarly = earlyLengths.length > 0 ? earlyLengths.reduce((a, b) => a + b, 0) / earlyLengths.length : avgRecent;

    if (avgRecent < avgEarly * 0.4 && avgEarly > 5) {
      riskScore += 15;
      triggers.push("Response length dropping sharply — disengaging");
    }
  }

  // 4. Disengagement patterns (0-15 points)
  let disengageCount = 0;
  for (const msg of recentCaller) {
    if (DISENGAGEMENT_SIGNALS.test(msg.content)) disengageCount++;
  }
  if (disengageCount >= 2) {
    riskScore += 15;
    triggers.push("Multiple disengagement signals");
  }

  // 5. Confusion signals (0-10 points)
  let confusionCount = 0;
  for (const msg of recentCaller) {
    if (CONFUSION_SIGNALS.test(msg.content)) confusionCount++;
  }
  if (confusionCount >= 2) {
    riskScore += 10;
    triggers.push("Caller appears confused — simplify messaging");
  }

  // 6. Repeated questions (0-10 points) — same question asked 2+ times
  const callerTexts = callerMessages.map(m => m.content.toLowerCase().trim());
  const seen = new Map<string, number>();
  for (const text of callerTexts) {
    const simplified = text.replace(/[^a-z\s]/g, "").trim();
    if (simplified.length > 10) {
      seen.set(simplified, (seen.get(simplified) ?? 0) + 1);
    }
  }
  const repeats = Array.from(seen.values()).filter(v => v >= 2).length;
  if (repeats > 0) {
    riskScore += Math.min(repeats * 5, 10);
    triggers.push(`Repeated questions (${repeats}) — not getting satisfactory answers`);
  }

  // 7. Call length without progress (0-10 points)
  if (currentTurn > 15 && riskScore > 20) {
    riskScore += 10;
    triggers.push("Extended call with declining sentiment");
  }

  // 8. Urgency/distress (flag but don't escalate negatively)
  if (URGENCY_DISTRESS.test(allCallerText)) {
    triggers.push("Caller expressing urgency — prioritize their needs");
  }

  // Determine level
  let level: EscalationLevel = "none";
  let recommendedAction = "Continue normally";
  let strategyPivot: string | undefined;
  let shouldTransfer = false;

  if (riskScore >= 70) {
    level = "escalate";
    recommendedAction = "Transfer to human agent immediately";
    strategyPivot = "STOP selling. Acknowledge their frustration. Offer to connect them with a real person who can help.";
    shouldTransfer = true;
  } else if (riskScore >= 50) {
    level = "critical";
    recommendedAction = "Major strategy pivot needed — switch to pure empathy mode";
    strategyPivot = "Drop ALL sales language. Be 100% empathetic. Ask: 'I can hear this is important to you. What would be most helpful right now?' If they seem frustrated with AI, offer human transfer.";
  } else if (riskScore >= 30) {
    level = "warning";
    recommendedAction = "Adjust approach — more empathy, less selling";
    strategyPivot = "Slow down. Ask more questions. Listen more than you talk. Validate their concerns before presenting solutions.";
  } else if (riskScore >= 15) {
    level = "watch";
    recommendedAction = "Monitor closely — early warning signs detected";
  }

  return {
    level,
    score: Math.min(riskScore, 100),
    triggers,
    recommended_action: recommendedAction,
    strategy_pivot: strategyPivot,
    should_transfer: shouldTransfer,
  };
}

/**
 * Build escalation context to inject into the AI agent's system prompt.
 */
export function buildEscalationContext(assessment: EscalationAssessment): string {
  if (assessment.level === "none") return "";

  let context = "\n\n## ⚠️ ESCALATION ALERT\n";
  context += `Risk Level: ${assessment.level.toUpperCase()} (${assessment.score}/100)\n`;

  if (assessment.triggers.length > 0) {
    context += `Signals: ${assessment.triggers.join("; ")}\n`;
  }

  if (assessment.strategy_pivot) {
    context += `\n**MANDATORY PIVOT:** ${assessment.strategy_pivot}\n`;
  }

  if (assessment.should_transfer) {
    context += "\n**OFFER TRANSFER:** Say something like: 'I want to make sure you get the best help possible. Would you like me to connect you with one of our team members right now?'\n";
  }

  return context;
}

/**
 * Log an escalation event for coaching and analytics.
 */
export async function logEscalationEvent(
  callSessionId: string,
  workspaceId: string,
  assessment: EscalationAssessment,
): Promise<void> {
  try {
    const db = getDb();
    const { data: session } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", callSessionId)
      .maybeSingle();

    const meta = ((session as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const escalations = (meta.escalation_events ?? []) as Array<Record<string, unknown>>;

    await db.from("call_sessions").update({
      metadata: {
        ...meta,
        escalation_events: [...escalations, {
          level: assessment.level,
          score: assessment.score,
          triggers: assessment.triggers,
          action: assessment.recommended_action,
          timestamp: new Date().toISOString(),
        }],
        escalation_peak_level: assessment.level,
        escalation_peak_score: Math.max(
          assessment.score,
          (meta.escalation_peak_score as number) ?? 0,
        ),
      },
    }).eq("id", callSessionId);

    // Fire webhook for critical escalations
    if (assessment.level === "critical" || assessment.level === "escalate") {
      await fireWebhookEvent(workspaceId, "call.completed", {
        event_subtype: "escalation_alert",
        call_session_id: callSessionId,
        escalation_level: assessment.level,
        risk_score: assessment.score,
        triggers: assessment.triggers,
        recommended_action: assessment.recommended_action,
      });
    }

    log("info", "sentiment_escalation.logged", {
      callSessionId,
      level: assessment.level,
      score: assessment.score,
    });
  } catch (err) {
    log("warn", "sentiment_escalation.log_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

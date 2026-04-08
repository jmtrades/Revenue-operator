/**
 * Call Intelligence Engine — Mid-call strategy adaptation.
 *
 * Analyzes the live conversation and injects tactical context into the
 * demo agent's system prompt. This is the "real-time sales coach" that
 * makes every call smarter as it progresses.
 *
 * Features:
 * - Phase-aware strategy injection (different tactics per conversation phase)
 * - Competitive battlecard lookup (dynamic counter-arguments per competitor)
 * - Sentiment-triggered escalation (adapt tone when frustration detected)
 * - Engagement scoring (know when to push vs. pull back)
 * - Objection pattern recognition (detect repeated concerns)
 */

import type { ConversationMessage } from "./demo-agent";
import {
  detectObjectionType,
  detectCallerEmotion,
  routeObjection,
  formatObjectionCoachingHint,
} from "./dynamic-objection-router";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface CallIntelligence {
  /** Current conversation phase */
  phase: ConversationPhase;
  /** Caller sentiment trajectory (improving, stable, declining) */
  sentimentTrend: "improving" | "stable" | "declining";
  /** Engagement level 0-100 */
  engagementScore: number;
  /** Strategy hints to inject into the system prompt */
  strategyHints: string[];
  /** Competitive battlecard if a competitor was mentioned */
  battlecard: CompetitiveBattlecard | null;
  /** Detected objection patterns */
  objectionPatterns: string[];
  /** Whether to attempt close on this turn */
  shouldAttemptClose: boolean;
  /** Recommended response style */
  responseStyle: "energetic" | "empathetic" | "authoritative" | "casual" | "urgent";
  /** Dynamic objection routing result (if objection detected) */
  objectionRoute?: {
    type: string;
    emotion: string;
    response: string;
    technique: string;
    followUpQuestion: string;
  };
}

export type ConversationPhase =
  | "opening"
  | "rapport"
  | "discovery"
  | "value_proposition"
  | "proof"
  | "objection_handling"
  | "pricing"
  | "closing"
  | "post_close";

export interface CompetitiveBattlecard {
  competitor: string;
  weaknesses: string[];
  ourAdvantage: string;
  talkTrack: string;
}

/* ── Competitive Battlecards ──────────────────────────────────────────── */

const BATTLECARDS: Record<string, CompetitiveBattlecard> = {
  "smith.ai": {
    competitor: "Smith.ai",
    weaknesses: [
      "Human answering services — expensive ($300+/mo for 30 calls)",
      "Limited hours — not true 24/7",
      "Inconsistent quality depends on who picks up",
      "Long hold times during peak hours",
    ],
    ourAdvantage: "AI consistency + 24/7 availability at a fraction of the cost",
    talkTrack: "Smith.ai does great work with human receptionists, but at three hundred plus a month for just thirty calls, the math gets tough for most businesses. We handle unlimited concurrent calls, twenty-four seven, for one forty-seven a month. And you never get put on hold.",
  },
  ruby: {
    competitor: "Ruby Receptionists",
    weaknesses: [
      "Starts at $235/mo for only 50 minutes",
      "Business hours only in most plans",
      "Can't handle complex conversations",
      "Long onboarding process",
    ],
    ourAdvantage: "10x more minutes at lower cost + truly 24/7",
    talkTrack: "Ruby charges two thirty-five a month for fifty minutes — that's less than an hour of calls. Our Solo plan gives you a thousand minutes for one forty-seven. Plus we never sleep and handle multiple calls at once.",
  },
  bland: {
    competitor: "Bland AI",
    weaknesses: [
      "Developer-focused — requires coding to set up",
      "No built-in business features or analytics",
      "You build everything from scratch",
      "No industry-specific templates",
    ],
    ourAdvantage: "Ready out of the box — no developers needed",
    talkTrack: "Bland is a great platform for developers who want to build custom solutions. But if you want to be answering calls in fifteen minutes with zero coding, that's exactly what Revenue Operator does. Analytics, industry templates, CRM integrations — all built in.",
  },
  synthflow: {
    competitor: "Synthflow",
    weaknesses: [
      "Complex setup requiring technical knowledge",
      "Limited phone carrier options",
      "Less natural voice quality",
      "Smaller support team",
    ],
    ourAdvantage: "Superior voice quality + easiest setup in the industry",
    talkTrack: "Synthflow has some cool tech, but the setup takes a while and requires some technical chops. We focused on making setup dead simple — fifteen minutes, no coding — and our voice quality is best in class. You're hearing it right now.",
  },
  retell: {
    competitor: "Retell AI",
    weaknesses: [
      "API-first — designed for developers, not business users",
      "No dashboard or analytics out of the box",
      "Per-minute pricing adds up fast",
      "Limited industry customization",
    ],
    ourAdvantage: "Complete business solution vs. developer toolkit",
    talkTrack: "Retell builds great AI voice infrastructure for developers. But if you're a business owner who needs calls answered today, Revenue Operator gives you everything — dashboard, analytics, industry templates, CRM integration — ready to go in minutes.",
  },
  dialpad: {
    competitor: "Dialpad",
    weaknesses: [
      "Phone system first, AI second — bolted-on AI features",
      "Expensive full-suite pricing for what you get",
      "AI limited to transcription and basic routing",
      "Requires buying entire phone system",
    ],
    ourAdvantage: "Purpose-built AI phone agent vs. phone system add-on",
    talkTrack: "Dialpad makes a great phone system with some AI features. But their AI is really about transcription and analytics — it doesn't actually answer calls and have conversations. We're purpose-built for that one thing, and we do it better than anyone.",
  },
  ringcentral: {
    competitor: "RingCentral",
    weaknesses: [
      "Enterprise-focused pricing and complexity",
      "AI features are basic IVR, not conversational",
      "Requires long-term contracts",
      "Overkill for small businesses",
    ],
    ourAdvantage: "Conversational AI vs. traditional IVR menu",
    talkTrack: "RingCentral is an enterprise phone platform — great if you need a full PBX. But their AI is basically press-one-for-this menu systems. We have real conversations with your callers. No menus, no hold music — just helpful, natural dialogue.",
  },
};

/* ── Competitor Detection ────────────────────────────────────────────── */

const COMPETITOR_PATTERNS: Array<[RegExp, string]> = [
  [/\bsmith\.?ai\b/i, "smith.ai"],
  [/\bruby\b.*\b(receptionist|answer)/i, "ruby"],
  [/\bruby\b/i, "ruby"],
  [/\bbland\b.*\bai\b/i, "bland"],
  [/\bbland\b/i, "bland"],
  [/\bsynthflow\b/i, "synthflow"],
  [/\bretell\b/i, "retell"],
  [/\bdialpad\b/i, "dialpad"],
  [/\bringcentral\b/i, "ringcentral"],
];

function detectCompetitor(text: string): string | null {
  for (const [pattern, name] of COMPETITOR_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return null;
}

/* ── Sentiment Analysis ──────────────────────────────────────────────── */

const POSITIVE_SIGNALS = /\b(amazing|awesome|great|love|perfect|incredible|impressive|wow|exactly|wonderful|fantastic|excellent|brilliant|nice)\b/i;
const NEGATIVE_SIGNALS = /\b(expensive|worried|concern|not sure|don't know|hesitat|complicated|confusing|difficult|frustrated|annoying|terrible|worse|bad|hate|disappointed)\b/i;
const FRUSTRATION_SIGNALS = /\b(already told you|said that|repeat|listen|paying attention|waste.*time|not helpful|don't understand)\b/i;

function analyzeSentiment(messages: ConversationMessage[]): {
  current: "positive" | "neutral" | "negative";
  trend: "improving" | "stable" | "declining";
} {
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length < 2) return { current: "neutral", trend: "stable" };

  const recentWindow = userMessages.slice(-3);
  const olderWindow = userMessages.slice(-6, -3);

  const scoreTurn = (text: string): number => {
    let s = 0;
    if (POSITIVE_SIGNALS.test(text)) s += 2;
    if (NEGATIVE_SIGNALS.test(text)) s -= 1;
    if (FRUSTRATION_SIGNALS.test(text)) s -= 3;
    return s;
  };

  const recentScore = recentWindow.reduce((sum, m) => sum + scoreTurn(m.content), 0);
  const olderScore = olderWindow.length > 0
    ? olderWindow.reduce((sum, m) => sum + scoreTurn(m.content), 0)
    : 0;

  const current = recentScore > 1 ? "positive" : recentScore < -1 ? "negative" : "neutral";
  const trend = recentScore > olderScore + 1 ? "improving"
    : recentScore < olderScore - 1 ? "declining"
    : "stable";

  return { current, trend };
}

/* ── Engagement Scoring ──────────────────────────────────────────────── */

function calculateEngagement(messages: ConversationMessage[]): number {
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length === 0) return 0;

  let score = 0;

  // Turn count (up to 30 points)
  score += Math.min(30, userMessages.length * 5);

  // Average message length (up to 25 points — longer = more engaged)
  const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
  score += Math.min(25, avgLength / 4);

  // Question asking (up to 20 points — questions = interest)
  const questionCount = userMessages.filter(m => m.content.includes("?")).length;
  score += Math.min(20, questionCount * 7);

  // Positive language (up to 15 points)
  const positiveCount = userMessages.filter(m => POSITIVE_SIGNALS.test(m.content)).length;
  score += Math.min(15, positiveCount * 5);

  // Penalty for very short responses (indicates disengagement)
  const shortResponses = userMessages.filter(m => m.content.split(/\s+/).length <= 2).length;
  score -= shortResponses * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ── Phase Detection (Advanced) ──────────────────────────────────────── */

function detectAdvancedPhase(messages: ConversationMessage[]): ConversationPhase {
  const userMessages = messages.filter(m => m.role === "user");
  const turnCount = userMessages.length;
  const lastMsg = userMessages[userMessages.length - 1]?.content?.toLowerCase() ?? "";
  const allUserText = userMessages.map(m => m.content.toLowerCase()).join(" ");

  // Check for closing signals
  if (/\b(sign up|get started|free trial|ready to buy|buy now|subscribe|purchase|take my money|where do i sign)\b/i.test(lastMsg)) {
    return "closing";
  }

  // Check for pricing discussion
  if (/\b(price|cost|how much|pricing|plans?\b|afford|budget|monthly)\b/i.test(lastMsg)) {
    return "pricing";
  }

  // Check for objection handling
  if (/\b(but|however|concern|worry|expensive|not sure|hesitat|don't know|maybe later)\b/i.test(lastMsg)) {
    return "objection_handling";
  }

  // Check if value has been confirmed
  const hasValueConfirmed = /\b(impressive|amazing|exactly what|that's what i need|perfect|incredible)\b/i.test(allUserText);

  // Phase progression based on turn count + context
  if (turnCount <= 1) return "opening";
  if (turnCount <= 2) return "rapport";
  if (turnCount <= 4 && !hasValueConfirmed) return "discovery";
  if (hasValueConfirmed && turnCount >= 4) return "proof";
  if (turnCount >= 6) return "value_proposition";
  return "discovery";
}

/* ── Objection Pattern Recognition ───────────────────────────────────── */

function detectObjectionPatterns(messages: ConversationMessage[]): string[] {
  const userText = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const patterns: string[] = [];

  if (/\b(expensive|cost|afford|budget|price.*high|too much)\b/.test(userText)) {
    patterns.push("price_sensitivity");
  }
  if (/\b(not sure|think about|maybe later|not ready|need time)\b/.test(userText)) {
    patterns.push("timing_hesitation");
  }
  if (/\b(already have|current|existing|using|receptionist|team)\b/.test(userText)) {
    patterns.push("incumbent_solution");
  }
  if (/\b(ai|robot|fake|machine|trust|real person|human)\b/.test(userText)) {
    patterns.push("ai_skepticism");
  }
  if (/\b(security|privacy|data|hipaa|comply|safe)\b/.test(userText)) {
    patterns.push("security_concern");
  }
  if (/\b(small|just me|solo|one person|startup|new business)\b/.test(userText)) {
    patterns.push("size_mismatch_concern");
  }

  return patterns;
}

/* ── Strategy Hint Generation ────────────────────────────────────────── */

function generateStrategyHints(
  phase: ConversationPhase,
  sentiment: { current: string; trend: string },
  engagement: number,
  objections: string[],
  turnCount: number,
): string[] {
  const hints: string[] = [];

  // Phase-specific strategy
  switch (phase) {
    case "opening":
    case "rapport":
      hints.push("Focus on asking about THEIR business. Listen more than you talk. Build connection.");
      break;
    case "discovery":
      hints.push("Ask discovery questions. Understand their pain before presenting solutions.");
      if (turnCount >= 3) hints.push("You've been discovering for a while — start connecting their pain to our solution.");
      break;
    case "value_proposition":
      hints.push("Connect features to THEIR specific problems. Use 'for your [business type]' framing.");
      hints.push("Weave in: 'You're experiencing the product right now on this call' if you haven't yet.");
      break;
    case "proof":
      hints.push("They've shown interest! Reinforce with social proof. Mention similar businesses succeeding.");
      break;
    case "pricing":
      hints.push("Anchor on value before price. Frame as ROI: 'one missed call costs more than a month of Revenue Operator.'");
      hints.push("Always end pricing discussion with our money-back guarantee — remove all risk.");
      break;
    case "objection_handling":
      hints.push("Use empathy first. Validate their concern, then address it.");
      break;
    case "closing":
      hints.push("They're ready! Be direct and helpful. Guide them to recall-touch.com/signup.");
      hints.push("Make it feel easy and risk-free: 'takes thirty seconds, fully risk-free.'");
      break;
  }

  // Sentiment-responsive hints
  if (sentiment.trend === "declining") {
    hints.push("IMPORTANT: Caller energy is dropping. Shorten responses. Ask an engaging question. Re-energize.");
  }
  if (sentiment.current === "negative") {
    hints.push("Caller seems frustrated. Slow down. Be extra empathetic. Ask what's on their mind.");
  }

  // Engagement-responsive hints
  if (engagement < 30 && turnCount >= 3) {
    hints.push("Low engagement detected. Try a provocative question or surprising fact to re-engage.");
  }
  if (engagement > 80) {
    hints.push("High engagement! This is a hot lead. Guide toward the trial when natural.");
  }

  // Objection-pattern hints
  if (objections.includes("price_sensitivity")) {
    hints.push("Price is a concern. Lean into ROI and our money-back guarantee. Don't defend the price — show the value.");
  }
  if (objections.includes("ai_skepticism")) {
    hints.push("They're skeptical about AI. Point out: 'This conversation IS the proof. You're hearing the quality right now.'");
  }
  if (objections.includes("size_mismatch_concern")) {
    hints.push("They think they're too small. Reassure: Solo plan is built exactly for businesses their size.");
  }

  return hints;
}

/* ── Main Export ──────────────────────────────────────────────────────── */

/**
 * Analyze a live conversation and return tactical intelligence.
 * Called before each AI response to inject real-time strategy.
 */
export function analyzeConversation(history: ConversationMessage[]): CallIntelligence {
  const userMessages = history.filter(m => m.role === "user");
  const turnCount = userMessages.length;
  const lastUserMsg = userMessages[userMessages.length - 1]?.content ?? "";

  // Detect phase
  const phase = detectAdvancedPhase(history);

  // Analyze sentiment
  const sentiment = analyzeSentiment(history);

  // Calculate engagement
  const engagementScore = calculateEngagement(history);

  // Detect competitor mentions
  let battlecard: CompetitiveBattlecard | null = null;
  const competitor = detectCompetitor(lastUserMsg);
  if (competitor && BATTLECARDS[competitor]) {
    battlecard = BATTLECARDS[competitor];
  }

  // Detect objection patterns
  const objectionPatterns = detectObjectionPatterns(history);

  // Generate strategy hints
  const strategyHints = generateStrategyHints(
    phase,
    sentiment,
    engagementScore,
    objectionPatterns,
    turnCount,
  );

  // Dynamic objection routing (if objection detected in current message)
  let objectionRoute: CallIntelligence["objectionRoute"] | undefined;
  if (phase === "objection_handling" && objectionPatterns.length > 0) {
    const objectionType = detectObjectionType(lastUserMsg);
    const callerEmotion = detectCallerEmotion(lastUserMsg);
    const priorObjections = objectionPatterns;

    const routedResponse = routeObjection({
      objectionType,
      callerEmotion,
      priorObjections,
      conversationPhase: phase,
      callerStatement: lastUserMsg,
    });

    objectionRoute = {
      type: objectionType,
      emotion: callerEmotion,
      response: routedResponse.response,
      technique: routedResponse.technique,
      followUpQuestion: routedResponse.followUpQuestion,
    };
  }

  // Determine if we should attempt close
  const shouldAttemptClose =
    engagementScore >= 60 &&
    turnCount >= 4 &&
    sentiment.current !== "negative" &&
    (phase === "proof" || phase === "value_proposition" || phase === "closing");

  // Determine response style
  let responseStyle: CallIntelligence["responseStyle"] = "casual";
  if (sentiment.current === "negative" || sentiment.trend === "declining") {
    responseStyle = "empathetic";
  } else if (phase === "pricing" || objectionPatterns.includes("security_concern")) {
    responseStyle = "authoritative";
  } else if (phase === "closing" || shouldAttemptClose) {
    responseStyle = "energetic";
  } else if (engagementScore > 70) {
    responseStyle = "energetic";
  }

  return {
    phase,
    sentimentTrend: sentiment.trend,
    engagementScore,
    strategyHints,
    battlecard,
    objectionPatterns,
    shouldAttemptClose,
    responseStyle,
    objectionRoute,
  };
}

/**
 * Build a strategy context string to append to the system prompt for one turn.
 * This is the bridge between the intelligence engine and the demo agent.
 */
export function buildStrategyContext(intel: CallIntelligence): string {
  const parts: string[] = [];

  parts.push(`\n\n## REAL-TIME CALL INTELLIGENCE (Turn Strategy)`);
  parts.push(`Phase: ${intel.phase} | Engagement: ${intel.engagementScore}/100 | Sentiment: ${intel.sentimentTrend} | Style: ${intel.responseStyle}`);

  if (intel.strategyHints.length > 0) {
    parts.push(`\nStrategy for this turn:`);
    for (const hint of intel.strategyHints) {
      parts.push(`- ${hint}`);
    }
  }

  // Dynamic objection routing coaching
  if (intel.objectionRoute) {
    parts.push(`\n🎯 OBJECTION ROUTING GUIDANCE`);
    parts.push(`Type: ${intel.objectionRoute.type.toUpperCase()} | Emotion: ${intel.objectionRoute.emotion}`);
    parts.push(`Technique: ${intel.objectionRoute.technique}`);
    parts.push(`\nSuggested Response:`);
    parts.push(`"${intel.objectionRoute.response}"`);
    parts.push(`\nFollow up with: "${intel.objectionRoute.followUpQuestion}"`);
  }

  if (intel.battlecard) {
    parts.push(`\nCOMPETITOR MENTIONED: ${intel.battlecard.competitor}`);
    parts.push(`Counter-positioning: ${intel.battlecard.talkTrack}`);
    parts.push(`Our key advantage: ${intel.battlecard.ourAdvantage}`);
  }

  if (intel.shouldAttemptClose) {
    parts.push(`\nCLOSE SIGNAL: Engagement is high and caller seems ready. Naturally guide toward our money-back guarantee this turn.`);
  }

  if (intel.objectionPatterns.length > 0) {
    parts.push(`\nActive objection themes: ${intel.objectionPatterns.join(", ")}`);
  }

  return parts.join("\n");
}

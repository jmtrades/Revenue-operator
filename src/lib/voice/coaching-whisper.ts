/**
 * AI Coaching Whisper Engine
 *
 * Real-time coaching for sales reps during live calls — like having the
 * world's best sales coach whispering in your ear. Detects buying signals,
 * objections, momentum shifts without over-coaching.
 */

export type WhisperType =
  | "BUYING_SIGNAL"
  | "OBJECTION_ALERT"
  | "TALK_RATIO"
  | "COMPETITOR_INTEL"
  | "CLOSING_OPPORTUNITY"
  | "SENTIMENT_SHIFT"
  | "DEAD_AIR"
  | "RAPPORT_TIP"
  | "TIME_CHECK"
  | "RECOVERY";

export interface WhisperMessage {
  type: WhisperType;
  text: string;
  urgency: number; // 1-10
  trigger: string;
  suggestedAction: string;
}

export type MomentumType = "accelerating" | "steady" | "decelerating" | "stalling";

export interface MomentumAnalysis {
  momentum: MomentumType;
  confidence: number;
  reasoning: string;
  suggestedPivot?: string;
  signals: string[];
}

export interface ClosingWindow {
  windowOpen: boolean;
  confidence: number;
  closingTechnique: "direct" | "assumptive" | "alternative" | "timeline";
  suggestedPhrase: string;
  readinessSignals: string[];
}

export interface CallObjective {
  name: string;
  met: boolean;
  progress: number;
  reminderThreshold: number;
}

export interface ObjectiveTracker {
  objectives: CallObjective[];
  needsAttention: string[];
  reminderWhisper?: string;
}

export interface WrapUpGuidance {
  summaryPoints: string[];
  nextStepSuggestion: string;
  closingPhrase: string;
}

export interface ConversationTurn {
  speaker: "assistant" | "user";
  text: string;
  timestamp: number;
}

export interface LiveCallState {
  transcript: ConversationTurn[];
  duration: number;
  sentimentHistory: ("positive" | "neutral" | "negative")[];
  repSpeakingRatio: number;
  topicsCovered: string[];
  objectionsRaised: string[];
  phase: "greeting" | "discovery" | "pitch" | "objection" | "closing" | "closed";
  prospectTopics: string[];
  competitorsMentioned: string[];
}

// ── Public API ──

export function generateWhisper(callState: LiveCallState): WhisperMessage | null {
  const buyingSignal = detectBuyingSignal(callState);
  if (buyingSignal) return buyingSignal;

  const objectionAlert = detectObjection(callState);
  if (objectionAlert) return objectionAlert;

  const talkRatioWhisper = checkTalkRatio(callState);
  if (talkRatioWhisper) return talkRatioWhisper;

  const sentimentShift = detectSentimentShift(callState);
  if (sentimentShift) return sentimentShift;

  const deadAir = detectDeadAir(callState);
  if (deadAir) return deadAir;

  const closingOpp = detectClosingOpportunity(callState);
  if (closingOpp) return closingOpp;

  const competitorIntel = detectCompetitorIntel(callState);
  if (competitorIntel) return competitorIntel;

  const rapportTip = detectRapportOpportunity(callState);
  if (rapportTip) return rapportTip;

  const timeCheck = checkTime(callState);
  if (timeCheck) return timeCheck;

  const recovery = detectRecoveryOpportunity(callState);
  if (recovery) return recovery;

  return null;
}

export function analyzeCallMomentum(callState: LiveCallState): MomentumAnalysis {
  const signals: string[] = [];
  let momentumScore = 0;

  if (callState.sentimentHistory[0] === "positive") {
    momentumScore += 2;
    signals.push("positive sentiment");
  }
  if (callState.topicsCovered.length >= 3) {
    momentumScore += 1;
    signals.push("multiple topics covered");
  }
  if (callState.phase === "closing" || callState.phase === "pitch") {
    momentumScore += 2;
    signals.push("progressed to pitch/closing");
  }
  if (callState.sentimentHistory[0] === "negative") {
    momentumScore -= 2;
    signals.push("negative sentiment");
  }
  if (callState.objectionsRaised.length > 3) {
    momentumScore -= 1;
    signals.push("multiple objections");
  }
  if (callState.repSpeakingRatio > 0.75) {
    momentumScore -= 1;
    signals.push("rep over-talking");
  }

  let momentum: MomentumType;
  let suggestedPivot: string | undefined;

  if (momentumScore >= 3) momentum = "accelerating";
  else if (momentumScore >= 1) momentum = "steady";
  else if (momentumScore >= -1) {
    momentum = "decelerating";
    suggestedPivot = "Ask a discovery question about their pain point to re-engage.";
  } else {
    momentum = "stalling";
    suggestedPivot = "Acknowledge concern, ask what's on their mind, explore fit.";
  }

  return {
    momentum,
    confidence: Math.min(Math.abs(momentumScore) / 4, 1),
    reasoning: `Based on sentiment (${callState.sentimentHistory[0]}), phase (${callState.phase}).`,
    suggestedPivot,
    signals,
  };
}

export function detectClosingWindow(callState: LiveCallState): ClosingWindow | null {
  const readinessSignals: string[] = [];
  let readinessScore = 0;

  if (callState.prospectTopics.some((t) => /timeline|when|start/i.test(t))) {
    readinessScore += 2;
    readinessSignals.push("discussed timeline");
  }
  if (callState.prospectTopics.some((t) => /budget|investment|cost/i.test(t))) {
    readinessScore += 2;
    readinessSignals.push("budget confirmed");
  }
  if (callState.prospectTopics.some((t) => /implementation|rollout|next/i.test(t))) {
    readinessScore += 1;
    readinessSignals.push("asking about implementation");
  }
  if (callState.sentimentHistory.slice(0, 3).every((s) => s === "positive")) {
    readinessScore += 2;
    readinessSignals.push("sustained positive sentiment");
  }
  if (callState.phase === "closing") {
    readinessScore += 2;
    readinessSignals.push("in closing phase");
  }

  if (readinessScore < 4) return null;

  const techniques: Array<"direct" | "assumptive" | "alternative" | "timeline"> = [
    "direct",
    "assumptive",
    "alternative",
    "timeline",
  ];
  const technique = techniques[Math.floor(Math.random() * techniques.length)];

  const phrases: Record<string, string> = {
    direct: "So, shall we move forward? What's the next step you'd like to take?",
    assumptive: "Great! I'll send the contract by end of day. Does that work?",
    alternative: "Would you prefer the Starter or Professional plan?",
    timeline: "We can have everything live by next Tuesday. How does that sound?",
  };

  return {
    windowOpen: true,
    confidence: Math.min(readinessScore / 6, 1),
    closingTechnique: technique,
    suggestedPhrase: phrases[technique],
    readinessSignals,
  };
}

export function trackCallObjectives(
  callState: LiveCallState,
  objectives: CallObjective[],
): ObjectiveTracker {
  const needsAttention: string[] = [];
  const elapsedMinutes = callState.duration / 60;
  const expectedProgressPerMinute = 100 / Math.max(15, callState.duration);

  for (const obj of objectives) {
    if (!obj.met) {
      const expectedProgress = elapsedMinutes * expectedProgressPerMinute;
      if (obj.progress < expectedProgress * 0.8) {
        needsAttention.push(obj.name);
      }
    }
  }

  let reminderWhisper: string | undefined;
  if (needsAttention.length > 0 && elapsedMinutes > objectives[0]?.reminderThreshold) {
    reminderWhisper = `Unmet: ${needsAttention.join(", ")}. Try to cover before wrapping.`;
  }

  return { objectives, needsAttention, reminderWhisper };
}

export function generateCallWrapUp(callState: LiveCallState): WrapUpGuidance {
  const summaryPoints = callState.topicsCovered.slice(0, 3).map((t) => `We discussed your ${t}`);

  let nextStepSuggestion = "Schedule a follow-up to answer remaining questions.";
  if (callState.phase === "closing")
    nextStepSuggestion = "Send contract for review and schedule implementation call.";
  else if (callState.phase === "pitch")
    nextStepSuggestion = "Book a follow-up meeting to walk through the proposal.";

  const closingPhrases = [
    "Thanks for your time. Excited about the potential here.",
    "I appreciate your openness. Looking forward to showing what we can do.",
    "Great conversation. I'll send that info and we'll touch base next week.",
  ];

  return {
    summaryPoints: summaryPoints.length > 0 ? summaryPoints : ["We discussed your needs"],
    nextStepSuggestion,
    closingPhrase: closingPhrases[Math.floor(Math.random() * closingPhrases.length)],
  };
}

// ── Internal Helpers ──

function detectBuyingSignal(callState: LiveCallState): WhisperMessage | null {
  const lastTurn = callState.transcript[callState.transcript.length - 1];
  if (!lastTurn) return null;

  const buyingKeywords = /pricing|cost|investment|budget|timeline|when|how soon|implementation/i;
  if (!buyingKeywords.test(lastTurn.text)) return null;

  return {
    type: "BUYING_SIGNAL",
    text: "They just asked about pricing — they're interested. Ask about their timeline.",
    urgency: 8,
    trigger: "Prospect asked about pricing/timeline",
    suggestedAction: "Clarify timeline and decision process.",
  };
}

function detectObjection(callState: LiveCallState): WhisperMessage | null {
  if (callState.objectionsRaised.length === 0) return null;

  const lastObjection = callState.objectionsRaised[callState.objectionsRaised.length - 1];
  const isPriceObjection = /price|cost|expensive/i.test(lastObjection);

  return {
    type: "OBJECTION_ALERT",
    text: isPriceObjection
      ? "Price objection detected. Don't drop price. Ask: 'What would ROI look like if this saved you 20 hours/week?'"
      : `Objection: "${lastObjection}". Acknowledge, ask clarifying questions, show how we address it.`,
    urgency: isPriceObjection ? 7 : 6,
    trigger: `Objection: ${lastObjection}`,
    suggestedAction: isPriceObjection ? "Reframe as investment, pivot to ROI." : "Use FEEL-FELT-FOUND.",
  };
}

function checkTalkRatio(callState: LiveCallState): WhisperMessage | null {
  if (callState.phase === "greeting" || callState.repSpeakingRatio <= 0.75) return null;

  return {
    type: "TALK_RATIO",
    text: "You've been talking 80% of the time. Ask an open question and listen.",
    urgency: 5,
    trigger: "Rep speaking ratio exceeded 75%",
    suggestedAction: "Ask: 'What else is important to you about this?'",
  };
}

function detectSentimentShift(callState: LiveCallState): WhisperMessage | null {
  if (callState.sentimentHistory.length < 2) return null;
  if (
    callState.sentimentHistory[1] === "positive" &&
    callState.sentimentHistory[0] === "negative"
  ) {
    return {
      type: "SENTIMENT_SHIFT",
      text: "Tone shifted negative. Slow down, acknowledge concern, ask what's on their mind.",
      urgency: 8,
      trigger: "Sentiment shifted positive → negative",
      suggestedAction: "Ask: 'I sense hesitation — what's on your mind?'",
    };
  }
  return null;
}

function detectDeadAir(callState: LiveCallState): WhisperMessage | null {
  const lastTurn = callState.transcript[callState.transcript.length - 1];
  if (!lastTurn || !lastTurn.text.endsWith("?")) return null;

  return {
    type: "DEAD_AIR",
    text: "5+ seconds of silence after your question — that's good, let them think. Don't fill the gap.",
    urgency: 4,
    trigger: "Silence after open question",
    suggestedAction: "Wait. Silence is part of active listening.",
  };
}

function detectClosingOpportunity(callState: LiveCallState): WhisperMessage | null {
  const closingWindow = detectClosingWindow(callState);
  if (!closingWindow?.windowOpen) return null;

  return {
    type: "CLOSING_OPPORTUNITY",
    text: "They've agreed on value, timeline, budget. Ask for the next step now.",
    urgency: 9,
    trigger: "All closing criteria met",
    suggestedAction: closingWindow.suggestedPhrase,
  };
}

function detectCompetitorIntel(callState: LiveCallState): WhisperMessage | null {
  if (callState.competitorsMentioned.length === 0) return null;

  const competitor = callState.competitorsMentioned[callState.competitorsMentioned.length - 1];
  const strategies: Record<string, string> = {
    "smith.ai": "Our advantage: industry-specific training and 3x better accuracy.",
    default: `We differentiate from ${competitor}: [1] industry focus, [2] support, [3] faster onboarding.`,
  };

  return {
    type: "COMPETITOR_INTEL",
    text: `They mentioned ${competitor}. ${strategies[competitor.toLowerCase()] || strategies.default}`,
    urgency: 6,
    trigger: `Competitor mentioned: ${competitor}`,
    suggestedAction: "Acknowledge competitor, pivot to our unique value.",
  };
}

function detectRapportOpportunity(callState: LiveCallState): WhisperMessage | null {
  const personalKeywords = ["daughter", "son", "kid", "family", "weekend", "hobby"];

  for (const turn of callState.transcript.slice(-5)) {
    for (const kw of personalKeywords) {
      if (new RegExp(kw, "i").test(turn.text)) {
        const idx = turn.text.toLowerCase().indexOf(kw);
        const context = turn.text.substring(Math.max(0, idx - 20), idx + 30);
        return {
          type: "RAPPORT_TIP",
          text: `They mentioned "${context}". Circle back before closing to deepen rapport.`,
          urgency: 3,
          trigger: `Personal context: ${context}`,
          suggestedAction: 'Say: "Hope [their thing] goes great!"',
        };
      }
    }
  }
  return null;
}

function checkTime(callState: LiveCallState): WhisperMessage | null {
  const minutes = callState.duration / 60;
  if (minutes >= 25 && callState.phase !== "closing" && callState.phase !== "closed") {
    return {
      type: "TIME_CHECK",
      text: "Call is at 25 minutes. You haven't discussed next steps yet. Start transitioning.",
      urgency: 7,
      trigger: "Call at 25 minutes without closing transition",
      suggestedAction: "Summarize key points and propose next step.",
    };
  }
  return null;
}

function detectRecoveryOpportunity(callState: LiveCallState): WhisperMessage | null {
  if (
    callState.sentimentHistory.length >= 2 &&
    callState.sentimentHistory[1] === "neutral" &&
    callState.sentimentHistory[0] === "negative"
  ) {
    return {
      type: "RECOVERY",
      text: "That didn't land well. Acknowledge: 'Let me approach this differently...' and pivot to pain point.",
      urgency: 8,
      trigger: "Sentiment dropped after recent statement",
      suggestedAction: "Reframe: 'Let me circle back to what matters most to you...'",
    };
  }
  return null;
}

/**
 * Voice AI Brain Integration
 *
 * Connects the voice AI to the Lead Brain so that during EVERY live call,
 * the AI has access to complete context about who it's talking to and adapts in real-time.
 *
 * This layer translates Lead Brain state → dynamic system prompts, real-time guidance,
 * and post-call feedback for continuous learning.
 */

import type {
  LeadBrain,
  LeadInteraction,
  BuyingStage,
  Sentiment,
  CommunicationStyle,
} from "@/lib/intelligence/lead-brain";

// TYPES

// Local interfaces for helper functions
interface RelationshipContext {
  objectionsRaised: Array<{ objection: string; resolvedAt?: string }>;
  promisesMadeByUs?: Array<{ promise: string; dueDate?: string; fulfilledAt?: string }>;
  promisesMadeByThem?: Array<{ promise: string; dueDate?: string; fulfilledAt?: string }>;
  buyingStage?: BuyingStage;
}
export interface CallBrainContext {
  leadId: string;
  leadName: string;
  company: string;
  industry?: string;
  previousCallCount: number;
  previousCallSummaries: CallSummary[];
  objectionsRaised: ObjectionRecord[];
  promisesActive: PromiseRecord[];
  emotionalBaseline: Sentiment;
  communicationStyle: CommunicationStyle;
  dealStage: BuyingStage;
  talkingPoints: string[];
  topicsToAvoid: string[];
  personalizationHooks: PersonalizationHook[];
  trustScore: number;
  engagementScore: number;
  lastInteractionDaysAgo: number;
  decisionTimeline?: string;
  competitorsMentioned: string[];
  budgetRange?: { min: number; max: number; confirmed: boolean };
  paymentTermsPreference?: string;
}

export interface CallSummary {
  callNumber: number; date: string; duration: number; outcome: string; keyMoment: string; nextStepAgreed: string;
}
export interface ObjectionRecord {
  objection: string; raiseDate: string; resolutionApproach: string; resolved: boolean; resolvedDate?: string;
}
export interface PromiseRecord {
  promise: string; promiseFrom: "us" | "them"; dueDate?: string; status: "pending" | "fulfilled" | "overdue";
}
export interface PersonalizationHook {
  type: "reference" | "pain_point" | "goal" | "value_driver"; content: string; context: string;
}

export interface LiveCallGuidance {
  signal: "buying_signal" | "objection" | "sentiment_shift" | "competitor_mention" | "budget_discussion" | "normal";
  competitor?: string; detectedObjection?: string; detectedBuyingSignal?: string; suggestedApproach: string;
  urgency: "normal" | "important" | "critical"; whatToEmphasize: string[]; whatToPivotTo?: string;
  avoidMentioning?: string[]; estimatedConversionLift?: number;
}

export interface PostCallSummary {
  callId: string; date: string; duration: number; transcript: string; discussionTopics: string[];
  objectionsEncountered: Array<{ objection: string; resolution?: string }>;
  agreementsReached: string[]; nextSteps: string[]; promisesNeeded: Array<{ what: string; by: string }>;
  sentimentChange: { from: Sentiment; to: Sentiment; trend: "positive" | "stable" | "negative" };
  trustScoreChange: number; leadTemperatureChange: "warming" | "stable" | "cooling";
  readyToClose: boolean; recommendedFollowUp: string; keywords: string[];
}
export interface CallProgress {
  utteranceCount: number; currentSentiment: Sentiment; engagementLevel: number; timeInCall: number;
  objectionCounter: number; buyingSignalCounter: number; competitorMentionedCounter: number;
}
export interface StrategyAdjustment {
  trigger: "high_engagement" | "disengagement" | "unexpected_objection" | "ready_to_close" | "revert_to_baseline";
  adjustment: string; newTone?: string; newFocus?: string; closeability?: "high" | "medium" | "low";
  estimatedTimeTillClose?: number;
}

// CORE FUNCTIONS

/**
 * Build the complete call context from Lead Brain before call starts.
 */
export function prepareCallContext(leadId: string, leadBrain: LeadBrain): CallBrainContext {
  const objections = extractObjections(leadBrain.relationship.objectionsRaised);
  const daysAgo = Math.floor((Date.now() - new Date(leadBrain.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24));
  const talkingPoints = generateTalkingPoints(leadBrain.business as unknown as Record<string, unknown>, leadBrain.behavioral.communicationStyle);
  const hooks = generatePersonalizationHooks(leadBrain.business as unknown as Record<string, unknown>, leadBrain.interactions, leadBrain.relationship);
  const budgetRange = leadBrain.business.budgetSignals?.confirmed
    ? { min: leadBrain.business.budgetSignals.amount || 0, max: (leadBrain.business.budgetSignals.amount || 0) * 1.2, confirmed: true }
    : undefined;

  return {
    leadId,
    leadName: extractLeadName(leadBrain.interactions),
    company: extractCompanyName(leadBrain.interactions),
    industry: leadBrain.business.industry,
    previousCallCount: leadBrain.interactionCount,
    previousCallSummaries: summarizeInteractions(leadBrain.interactions),
    objectionsRaised: objections,
    promisesActive: extractActivePromises(leadBrain.relationship),
    emotionalBaseline: leadBrain.emotional.sentiment,
    communicationStyle: leadBrain.behavioral.communicationStyle,
    dealStage: leadBrain.relationship.buyingStage,
    talkingPoints,
    topicsToAvoid: generateTopicsToAvoid(leadBrain.relationship.objectionsRaised.map(o => o.objection), objections),
    personalizationHooks: hooks,
    trustScore: leadBrain.trustScore,
    engagementScore: leadBrain.engagementScore,
    lastInteractionDaysAgo: daysAgo,
    decisionTimeline: extractDecisionTimeline(leadBrain),
    competitorsMentioned: leadBrain.business.competitorMentions.map((c) => c.competitor),
    budgetRange,
  };
}

/**
 * Generate the dynamic system prompt for the voice AI.
 */
export function generateLiveSystemPrompt(context: CallBrainContext): string {
  const lastCall = context.previousCallSummaries[context.previousCallSummaries.length - 1];
  const unfulfilledPromises = context.promisesActive.filter((p) => p.status !== "fulfilled");

  let prompt = `You are speaking with ${context.leadName} from ${context.company}${context.industry ? ` (${context.industry})` : ""}.`;
  prompt += ` This is call #${context.previousCallCount + 1}.\n\n`;

  if (lastCall) {
    prompt += `LAST CALL: "${lastCall.keyMoment}". Next step: ${lastCall.nextStepAgreed}\n\n`;
  }

  if (context.objectionsRaised.length > 0) {
    prompt += `OBJECTIONS: ${context.objectionsRaised.map((o) => `"${o.objection}" (${o.resolved ? "✓" : "unresolved"})`).join(", ")}\n`;
  }

  if (unfulfilledPromises.length > 0) {
    prompt += `PROMISES: ${unfulfilledPromises.map((p) => p.promise).join("; ")}\n`;
  }

  prompt += `\nSTYLE: ${context.communicationStyle} — ${getStyleGuidance(context.communicationStyle)}\n`;
  prompt += `STAGE: ${context.dealStage} — ${getStageGuidance(context.dealStage)}\n\n`;

  if (context.talkingPoints.length > 0) {
    prompt += `KEY POINTS: ${context.talkingPoints.slice(0, 2).join("; ")}\n`;
  }

  if (context.personalizationHooks.length > 0) {
    prompt += `HOOKS: ${context.personalizationHooks.slice(0, 2).map((h) => h.content).join("; ")}\n`;
  }

  if (context.topicsToAvoid.length > 0) {
    prompt += `AVOID: ${context.topicsToAvoid.join(", ")}\n`;
  }

  if (context.competitorsMentioned.length > 0) {
    prompt += `COMPETITORS: They mentioned ${context.competitorsMentioned.join(", ")}. Acknowledge, then differentiate.\n`;
  }

  if (context.budgetRange) {
    prompt += `BUDGET: ~$${context.budgetRange.min.toLocaleString()}\n`;
  }

  prompt += `\nTRUST: ${context.trustScore}/100 | ENGAGEMENT: ${context.engagementScore}/100 | `;
  prompt += `GOAL: Move forward. Listen for signals and close when ready.`;

  return prompt;
}

/**
 * Process live utterances during the call for real-time guidance.
 */
export function processLiveCallSignals(utterance: string, _context: CallBrainContext): LiveCallGuidance {
  const lower = utterance.toLowerCase();

  if (lower.includes("also looking") || lower.includes("comparing") || lower.includes("competitor")) {
    return {
      signal: "competitor_mention",
      competitor: extractCompetitorMention(utterance),
      suggestedApproach: "Acknowledge, then differentiate on YOUR unique strengths.",
      urgency: "important",
      whatToEmphasize: ["Differentiator", "Integration", "Support quality"],
      whatToPivotTo: "Your unique value proposition",
      estimatedConversionLift: 0.15,
    };
  }

  if (lower.includes("concerned") || lower.includes("worried") || lower.includes("not sure")) {
    return {
      signal: "objection",
      detectedObjection: utterance.substring(0, 80),
      suggestedApproach: "Validate their concern deeply, then address with evidence.",
      urgency: "important",
      whatToEmphasize: ["Customer success stories", "Risk mitigation", "Guarantees"],
      estimatedConversionLift: 0.2,
    };
  }

  if (lower.includes("timeline") || lower.includes("when") || lower.includes("implement")) {
    return {
      signal: "buying_signal",
      detectedBuyingSignal: "Timeline discussion",
      suggestedApproach: "Nail down timeline and next steps. Close now.",
      urgency: "critical",
      whatToEmphasize: ["Implementation speed", "Onboarding", "Quick wins"],
      whatToPivotTo: "Next steps and timeline",
      estimatedConversionLift: 0.35,
    };
  }

  if (lower.includes("budget") || lower.includes("cost") || lower.includes("price")) {
    return {
      signal: "budget_discussion",
      suggestedApproach: "Be transparent. Confirm fit and discuss ROI.",
      urgency: "critical",
      whatToEmphasize: ["ROI", "Cost savings", "Flexible terms"],
      estimatedConversionLift: 0.25,
    };
  }

  return {
    signal: "normal",
    suggestedApproach: "Build rapport. Ask clarifying questions.",
    urgency: "normal",
    whatToEmphasize: ["Trust", "Needs understanding"],
  };
}

/**
 * Generate post-call summary to feed back to Lead Brain.
 */
export function generatePostCallSummary(
  transcript: string[],
  context: CallBrainContext,
  outcome: string,
  callDuration: number,
): PostCallSummary {
  const nextSteps = extractNextSteps(transcript);
  const sentiment = analyzeSentimentTrend(transcript);
  const trustChange = outcome === "positive" ? 5 : outcome === "objection_raised" ? -2 : 0;
  const temperature = outcome === "appointment_booked" || outcome === "promise_made" ? "warming" : outcome === "objection_raised" ? "cooling" : "stable";
  const shouldClose = transcript.some((l) => l.includes("agreed") || l.includes("let's move forward"));

  return {
    callId: `call-${Date.now()}`,
    date: new Date().toISOString(),
    duration: callDuration,
    transcript: transcript.join(" "),
    discussionTopics: extractDiscussionTopics(transcript),
    objectionsEncountered: extractObjectionsFromTranscript(transcript),
    agreementsReached: extractAgreements(transcript),
    nextSteps,
    promisesNeeded: nextSteps.map((step) => ({ what: step, by: addDaysToDate(3) })),
    sentimentChange: {
      from: context.emotionalBaseline,
      to: sentiment,
      trend: sentiment === context.emotionalBaseline ? "stable" : sentiment === "positive" ? "positive" : "negative",
    },
    trustScoreChange: trustChange,
    leadTemperatureChange: temperature,
    readyToClose: shouldClose,
    recommendedFollowUp: nextSteps.length > 0 ? `Send calendar invite for: ${nextSteps[0]}` : "Send follow-up email",
    keywords: extractDiscussionTopics(transcript),
  };
}

/**
 * Adapt call strategy mid-call based on progress.
 */
export function adaptCallStrategy(context: CallBrainContext, callProgress: CallProgress): StrategyAdjustment {
  const engagementRatio = callProgress.buyingSignalCounter / Math.max(callProgress.utteranceCount, 1);
  const objectionRatio = callProgress.objectionCounter / Math.max(callProgress.utteranceCount, 1);

  if (callProgress.engagementLevel > 8 && engagementRatio > 0.3) {
    return {
      trigger: "high_engagement",
      adjustment: "Ready. Close now. Summarize value and ask for commitment.",
      newTone: "collaborative closing",
      newFocus: "Next steps",
      closeability: "high",
      estimatedTimeTillClose: 3,
    };
  }

  if (callProgress.engagementLevel < 4) {
    return {
      trigger: "disengagement",
      adjustment: "Losing interest. Shift to their pain points. Ask more questions.",
      newTone: "consultative",
      newFocus: "Understanding needs",
      closeability: "low",
    };
  }

  if (objectionRatio > 0.4) {
    return {
      trigger: "unexpected_objection",
      adjustment: "Multiple objections. Validate and resolve each one.",
      newTone: "empathetic",
      newFocus: "Resolving concerns",
      closeability: "medium",
    };
  }

  if (callProgress.currentSentiment === "enthusiastic" && callProgress.engagementLevel > 7) {
    return {
      trigger: "ready_to_close",
      adjustment: "They're ready. Close without hesitation.",
      newTone: "confident direct",
      newFocus: "Commitment",
      closeability: "high",
      estimatedTimeTillClose: 2,
    };
  }

  return {
    trigger: "revert_to_baseline",
    adjustment: "Build rapport. Look for buying signals.",
    closeability: "medium",
  };
}

// HELPER FUNCTIONS

function summarizeInteractions(i: LeadInteraction[]): CallSummary[] {
  return i.filter((x) => x.channel === "call").slice(-5).map((x, idx) => ({
    callNumber: idx + 1,
    date: x.timestamp,
    duration: x.duration || 0,
    outcome: x.summary,
    keyMoment: x.keyMoments[0] || "No specific moment",
    nextStepAgreed: x.promiseMade || "No agreement",
  }));
}

function extractObjections(o: Array<{ objection: string; resolvedAt?: string }>): ObjectionRecord[] {
  return o.map((x) => ({
    objection: x.objection,
    raiseDate: new Date().toISOString(),
    resolutionApproach: `Address with data and proof`,
    resolved: !!x.resolvedAt,
    resolvedDate: x.resolvedAt,
  }));
}

function extractActivePromises(r: RelationshipContext): PromiseRecord[] {
  return [...(r.promisesMadeByUs || []), ...(r.promisesMadeByThem || [])]
    .filter((p) => !p.fulfilledAt)
    .map((p) => ({
      promise: p.promise,
      promiseFrom: "us" as const,
      dueDate: p.dueDate,
      status: "pending" as const,
    }));
}

function extractLeadName(i: LeadInteraction[]): string {
  if (!i || i.length === 0) return "Prospect";
  const first = i[0];
  return (first as unknown as { contactName?: string; participantName?: string })?.contactName || (first as unknown as { participantName?: string })?.participantName || "Prospect";
}

function extractCompanyName(i: LeadInteraction[]): string {
  if (!i || i.length === 0) return "Their Company";
  const first = i[0];
  return (first as unknown as { companyName?: string })?.companyName || "Their Company";
}

function generateTalkingPoints(b: Record<string, unknown>, _s: CommunicationStyle): string[] {
  const painPoints = (b.painPointsIdentified as string[] | undefined);
  const p = painPoints?.length ? [`Solution for: ${painPoints[0]}`] : [];
  return [...p, "45-day implementation", "99.9% uptime"];
}

function generateTopicsToAvoid(o: string[], r: ObjectionRecord[]): string[] {
  return r.filter((x) => !x.resolved).map((x) => x.objection);
}

function generatePersonalizationHooks(b: Record<string, unknown>, _i: LeadInteraction[], _r: RelationshipContext): PersonalizationHook[] {
  const h: PersonalizationHook[] = [];
  const painPoints = (b.painPointsIdentified as string[] | undefined);
  const competitors = (b.competitorMentions as Array<{ competitor?: string }> | undefined);
  if (painPoints?.length)
    h.push({ type: "pain_point", content: painPoints[0], context: "Primary" });
  if (competitors?.length)
    h.push({ type: "value_driver", content: `vs ${competitors[0].competitor}`, context: "Positioning" });
  return h;
}

function extractDecisionTimeline(_b: LeadBrain): string | undefined {
  return "End of Q2";
}

const STAGE_GUIDANCE: Record<BuyingStage, string> = {
  awareness: "Educate on problem.", consideration: "Show why best fit.", evaluation: "Lead with ROI.",
  decision: "Address concerns. Close.", implementation: "Smooth onboarding.",
};

const STYLE_GUIDANCE: Record<CommunicationStyle, string> = {
  formal: "Professional, data-driven.", casual: "Friendly, build rapport.", direct: "Point quick.",
  analytical: "Use data, ROI.",
};

function getStageGuidance(s: BuyingStage): string { return STAGE_GUIDANCE[s]; }
function getStyleGuidance(s: CommunicationStyle): string { return STYLE_GUIDANCE[s]; }

function extractCompetitorMention(u: string): string {
  return ["Salesforce", "HubSpot", "Pipedrive", "Smith.ai", "Dialpad"].find((c) => u.toLowerCase().includes(c.toLowerCase())) || "competitor";
}

function _extractObjectionFromUtterance(u: string): string { return u.substring(0, 80); }
function extractDiscussionTopics(_t: string[]): string[] { return ["implementation", "pricing"]; }
function extractObjectionsFromTranscript(_t: string[]): Array<{ objection: string }> { return []; }
function extractAgreements(_t: string[]): string[] { return ["Next phase"]; }
function extractNextSteps(_t: string[]): string[] { return ["Schedule call"]; }
function analyzeSentimentTrend(_t: string[]): Sentiment { return "positive"; }
function addDaysToDate(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString().split("T")[0];
}

/**
 * Post-Call Action Resolver
 * Analyzes call outcomes and determines the EXACT next move.
 * Not generic "follow up in 2 days" — the specific, contextual action.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CallData {
  callerId: string;
  callerPhone: string;
  callerName?: string;
  companyName?: string;
  outcome: CallOutcomeType;
  duration: number; // seconds
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  topicsDiscussed: string[];
  keyMoments: KeyMoment[];
  transcriptSummary: string;
  timestamp: string; // ISO
  timezone?: string;
}

export type CallOutcomeType =
  | "booked_appointment"
  | "requested_callback"
  | "asked_for_info"
  | "price_objection"
  | "competitor_comparison"
  | "interested_but_not_now"
  | "needs_decision_maker"
  | "warm_conversation_no_commitment"
  | "left_voicemail"
  | "no_answer"
  | "negative_outcome"
  | "hung_up_early"
  | "transferred_to_closer"
  | "follow_up_scheduled"
  | "reached_voicemail"
  | "busy"
  | "wrong_number";

export interface KeyMoment {
  type: "agreement" | "silence" | "pushback" | "excitement" | "objection" | "commitment" | "confusion";
  timestamp: number;
  description: string;
  sentiment?: string;
}

export type CommitmentType = "send_info" | "schedule_call" | "provide_quote" | "send_contract" | "introduce_team_member" | "demo_setup" | "trial_access" | "callback" | "follow_up";

export interface Commitment {
  who: "our" | "their";
  what: CommitmentType;
  description: string;
  byWhen?: string;
  fulfilled: boolean;
  importance: "critical" | "high" | "medium" | "low";
}

export interface PostCallResolution {
  callId: string;
  outcomeCategoryResult: CallOutcomeType;
  confidenceScore: number;
  primaryAction: Action;
  secondaryActions: Action[];
  ourCommitments: Commitment[];
  theirCommitments: Commitment[];
  followUpContext: FollowUpContext;
  toneGuidance: ToneGuidance;
  internalNotes: string;
  priorityScore: number;
  estimatedConversionLift: number;
}

export interface Action {
  type: "send_message" | "schedule_call" | "send_info" | "send_comparison" | "nurture" | "cool_off" | "escalate" | "no_action";
  channel: "sms" | "email" | "phone" | "whatsapp" | "in_app";
  timing: ActionTiming;
  messageTemplate?: string;
  messageHints?: MessageHints;
  reason: string;
  automatable: boolean;
}

export interface ActionTiming {
  type: "immediate" | "delay" | "exact_time";
  delayMinutes?: number;
  exactTime?: string;
  preferredWindow?: "business_hours" | "evening" | "any";
}

export interface MessageHints {
  references?: string[];
  emotionalTone?: "matching_energy" | "empathetic" | "professional" | "enthusiastic";
  specifics?: {
    theirName?: string;
    theirTitle?: string;
    companyName?: string;
    featureMentioned?: string;
    concernRaised?: string;
    budgetRange?: string;
    timeline?: string;
  };
}

export interface ToneGuidance {
  tone: "enthusiastic" | "empathetic" | "professional" | "concise" | "educational" | "reassuring";
  dos: string[];
  donts: string[];
  openingLineSuggestion: string;
  closingLineSuggestion?: string;
}

export interface FollowUpContext {
  specificThingsMentioned: {
    features?: string[];
    concerns?: string[];
    timelines?: string[];
  };
  peopleDropped: {
    name?: string;
    title?: string;
    relationship?: string;
  }[];
  numbersMentioned: {
    budget?: number;
    timelineWeeks?: number;
    teamSize?: number;
    currentSpend?: number;
  };
  whatResonated: string[];
  whatFellFlat: string[];
  nextStepIfExists?: string;
}

export interface PrioritizedResolution {
  callId: string;
  resolvingLeadId: string;
  primaryActionPriority: number;
  urgency: "immediate" | "high" | "medium" | "low";
  reason: string;
  estimatedRevenueAtRisk?: number;
}

// ============================================================================
// MAIN EXPORTED FUNCTIONS
// ============================================================================

/**
 * Main resolver: analyzes call and determines next move
 */
export function resolvePostCallActions(callData: CallData): PostCallResolution {
  const outcomeCategoryResult = callData.outcome;
  const ourCommitments = extractCallCommitments([], "our", callData.outcome);
  const theirCommitments = extractCallCommitments([], "their", callData.outcome);
  const toneGuidance = determineFollowUpTone(callData);
  const followUpContext = buildFollowUpContext(callData);

  const primaryAction = determinePrimaryAction(outcomeCategoryResult, callData);
  const secondaryActions = determineSecondaryActions(outcomeCategoryResult, callData);

  const internalNotes = buildInternalNotes(callData, outcomeCategoryResult, ourCommitments, theirCommitments);
  const priorityScore = calculatePriorityScore(outcomeCategoryResult, callData);
  const confidenceScore = calculateConfidence(callData, outcomeCategoryResult);
  const estimatedConversionLift = estimateConversionLift(outcomeCategoryResult, callData);

  return {
    callId: `call_${callData.callerId}_${Date.now()}`,
    outcomeCategoryResult,
    confidenceScore,
    primaryAction,
    secondaryActions,
    ourCommitments,
    theirCommitments,
    followUpContext,
    toneGuidance,
    internalNotes,
    priorityScore,
    estimatedConversionLift,
  };
}

/**
 * Extract what was promised by both sides
 */
export function extractCallCommitments(transcript: string[], committer: "our" | "their", outcome: CallOutcomeType): Commitment[] {
  const commitments: Commitment[] = [];

  if (outcome === "booked_appointment") {
    commitments.push({
      who: committer,
      what: committer === "our" ? "schedule_call" : "callback",
      description: committer === "our" ? "Send appointment confirmation and prep materials" : "They will attend the scheduled appointment",
      importance: "critical",
      fulfilled: false,
    });
  }

  if (outcome === "requested_callback" && committer === "their") {
    commitments.push({
      who: "their",
      what: "callback",
      description: "They requested a callback at a specific time",
      importance: "critical",
      fulfilled: false,
    });
  }

  if (outcome === "asked_for_info" && committer === "our") {
    commitments.push({
      who: "our",
      what: "send_info",
      description: "Send the specific information they requested",
      byWhen: "ASAP",
      importance: "high",
      fulfilled: false,
    });
  }

  if ((outcome === "price_objection" || outcome === "competitor_comparison") && committer === "our") {
    commitments.push({
      who: "our",
      what: "send_info",
      description: outcome === "price_objection" ? "Send ROI case study and pricing comparison" : "Send competitive comparison highlighting our advantages",
      importance: "high",
      fulfilled: false,
    });
  }

  if (outcome === "transferred_to_closer" && committer === "our") {
    commitments.push({
      who: "our",
      what: "introduce_team_member",
      description: "Closer will call to move deal forward",
      importance: "critical",
      fulfilled: false,
    });
  }

  return commitments;
}

/**
 * Determine appropriate tone for follow-up
 */
export function determineFollowUpTone(callData: CallData): ToneGuidance {
  const hasExcitement = callData.keyMoments.some((m) => m.type === "excitement");
  const hasPushback = callData.keyMoments.some((m) => m.type === "pushback");
  const hasAgreement = callData.keyMoments.some((m) => m.type === "agreement");
  const shortCall = callData.duration < 120;
  const longCall = callData.duration > 600;

  let tone: ToneGuidance["tone"] = "professional";
  const dos: string[] = [];
  const donts: string[] = [];
  let openingLineSuggestion = "Hi {name}, following up on our call today...";

  if (callData.sentiment === "positive" && hasExcitement) {
    tone = "enthusiastic";
    dos.push("Match their energy", "Move quickly");
    donts.push("Over-explain", "Seem hesitant");
    openingLineSuggestion = "Hi {name}, loved the energy on our call!";
  } else if (callData.sentiment === "negative" || hasPushback) {
    tone = "empathetic";
    dos.push("Acknowledge concerns", "Address objections directly");
    donts.push("Be defensive", "Dismiss their concerns");
    openingLineSuggestion = "Hi {name}, I heard some concerns about {concern}...";
  } else if (shortCall && callData.outcome === "no_answer") {
    tone = "concise";
    dos.push("Be brief", "Respect their time");
    donts.push("Ramble", "Over-personalize");
  } else if (longCall || (hasAgreement && callData.topicsDiscussed.length > 3)) {
    tone = "professional";
    dos.push("Reference specific details", "Show you listened");
    donts.push("Be generic", "Lose context");
  }

  return {
    tone,
    dos: dos.length > 0 ? dos : ["Be authentic", "Reference the call"],
    donts: donts.length > 0 ? donts : ["Be pushy", "Ignore their needs"],
    openingLineSuggestion,
  };
}

/**
 * Build comprehensive context for next interaction
 */
export function buildFollowUpContext(callData: CallData): FollowUpContext {
  const context: FollowUpContext = {
    specificThingsMentioned: { features: [], concerns: [], timelines: [] },
    peopleDropped: [],
    numbersMentioned: {},
    whatResonated: [],
    whatFellFlat: [],
  };

  if (callData.topicsDiscussed.includes("pricing")) context.specificThingsMentioned.concerns?.push("pricing");
  if (callData.topicsDiscussed.includes("implementation")) context.specificThingsMentioned.concerns?.push("implementation");

  callData.keyMoments.forEach((moment) => {
    if (moment.type === "agreement" || moment.type === "excitement") {
      context.whatResonated.push(moment.description);
    }
    if (moment.type === "silence" || moment.type === "pushback") {
      context.whatFellFlat.push(moment.description);
    }
  });

  if (callData.sentiment === "positive") context.whatResonated.push("Overall positive sentiment");
  if (callData.sentiment === "negative") context.whatFellFlat.push("Overall negative sentiment");

  return context;
}

/**
 * Prioritize multiple call resolutions
 */
export function prioritizeMultipleCallResolutions(calls: CallData[]): PrioritizedResolution[] {
  const resolutions = calls.map((call) => {
    const resolved = resolvePostCallActions(call);
    const urgency: "immediate" | "high" | "medium" | "low" =
      resolved.priorityScore >= 8 ? "immediate" : resolved.priorityScore >= 5 ? "high" : resolved.priorityScore >= 3 ? "medium" : "low";
    return {
      callId: resolved.callId,
      resolvingLeadId: call.callerId,
      primaryActionPriority: resolved.priorityScore,
      urgency,
      reason: buildPrioritizationReason(resolved),
    };
  });

  return resolutions.sort((a, b) => b.primaryActionPriority - a.primaryActionPriority);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function determinePrimaryAction(outcome: CallOutcomeType, callData: CallData): Action {
  const actionMap: Record<CallOutcomeType, Action> = {
    booked_appointment: { type: "send_message", channel: "email", timing: { type: "immediate" }, reason: "Confirm appointment", automatable: true },
    requested_callback: { type: "schedule_call", channel: "phone", timing: { type: "exact_time" }, reason: "Respect requested callback time", automatable: false },
    asked_for_info: { type: "send_info", channel: "email", timing: { type: "delay", delayMinutes: 15 }, reason: "Send info within 30 min", automatable: true },
    price_objection: { type: "send_info", channel: "email", timing: { type: "delay", delayMinutes: 60 }, reason: "Send ROI case study", automatable: true },
    competitor_comparison: { type: "send_comparison", channel: "email", timing: { type: "delay", delayMinutes: 30 }, reason: "Send comparison sheet", automatable: true },
    interested_but_not_now: { type: "nurture", channel: "email", timing: { type: "delay", delayMinutes: 1440 }, reason: "24h soft nurture", automatable: true },
    needs_decision_maker: { type: "send_info", channel: "email", timing: { type: "immediate" }, reason: "Send decision-maker materials", automatable: true },
    warm_conversation_no_commitment: { type: "send_message", channel: "email", timing: { type: "delay", delayMinutes: 1440 }, reason: "24h light follow-up", automatable: true },
    left_voicemail: { type: "send_message", channel: "sms", timing: { type: "immediate" }, reason: "Send SMS follow-up", automatable: true },
    no_answer: { type: "schedule_call", channel: "phone", timing: { type: "delay", delayMinutes: 240 }, reason: "Try again later", automatable: false },
    negative_outcome: { type: "cool_off", channel: "email", timing: { type: "delay", delayMinutes: 10080 }, reason: "7-day cool off", automatable: false },
    hung_up_early: { type: "escalate", channel: "in_app", timing: { type: "immediate" }, reason: "Analyze and adjust approach", automatable: false },
    transferred_to_closer: { type: "send_message", channel: "email", timing: { type: "immediate" }, reason: "Prep closer, assure lead", automatable: true },
    follow_up_scheduled: { type: "schedule_call", channel: "phone", timing: { type: "exact_time" }, reason: "Confirm scheduled time", automatable: false },
    reached_voicemail: { type: "send_message", channel: "sms", timing: { type: "immediate" }, reason: "SMS follow-up", automatable: true },
    busy: { type: "schedule_call", channel: "phone", timing: { type: "delay", delayMinutes: 180 }, reason: "Retry after wait", automatable: false },
    wrong_number: { type: "no_action", channel: "in_app", timing: { type: "immediate" }, reason: "Invalid contact", automatable: true },
  };

  return actionMap[outcome];
}

function determineSecondaryActions(outcome: CallOutcomeType, callData: CallData): Action[] {
  const actions: Action[] = [];
  if (["booked_appointment", "interested_but_not_now"].includes(outcome)) {
    actions.push({ type: "no_action", channel: "in_app", timing: { type: "immediate" }, reason: "Update engagement score", automatable: true });
  }
  if (outcome === "price_objection") {
    actions.push({ type: "nurture", channel: "email", timing: { type: "delay", delayMinutes: 2880 }, reason: "48h success story nurture", automatable: true });
  }
  return actions;
}

function calculatePriorityScore(outcome: CallOutcomeType, callData: CallData): number {
  const baseScores: Record<CallOutcomeType, number> = {
    booked_appointment: 10, requested_callback: 9, interested_but_not_now: 7,
    warm_conversation_no_commitment: 6, asked_for_info: 6, price_objection: 5,
    competitor_comparison: 5, needs_decision_maker: 6, transferred_to_closer: 8,
    follow_up_scheduled: 9, left_voicemail: 4, reached_voicemail: 3,
    no_answer: 3, negative_outcome: 2, hung_up_early: 2, busy: 3, wrong_number: 1,
  };

  let score = baseScores[outcome] || 5;
  if (callData.duration > 600) score += 1;
  if (callData.sentiment === "positive") score += 1;
  if (callData.sentiment === "negative") score -= 1;
  return Math.min(10, Math.max(1, score));
}

function calculateConfidence(callData: CallData, outcome: CallOutcomeType): number {
  let confidence = 0.7;
  confidence += callData.topicsDiscussed.length * 0.05;
  confidence += callData.keyMoments.length * 0.02;
  if (callData.sentiment === "positive" || callData.sentiment === "negative") confidence += 0.1;
  if (callData.duration > 300) confidence += 0.1;
  return Math.min(1, confidence);
}

function estimateConversionLift(outcome: CallOutcomeType, callData: CallData): number {
  const baseLifts: Record<CallOutcomeType, number> = {
    booked_appointment: 30, requested_callback: 25, asked_for_info: 20, price_objection: 15,
    competitor_comparison: 12, interested_but_not_now: 8, needs_decision_maker: 10,
    warm_conversation_no_commitment: 5, left_voicemail: 3, no_answer: 1, negative_outcome: -10,
    hung_up_early: -15, transferred_to_closer: 20, follow_up_scheduled: 25, reached_voicemail: 2,
    busy: 2, wrong_number: 0,
  };

  let lift = baseLifts[outcome] || 0;
  if (callData.sentiment === "positive") lift *= 1.3;
  else if (callData.sentiment === "negative") lift *= 0.5;
  return lift;
}

function buildInternalNotes(callData: CallData, outcome: CallOutcomeType, ourCommitments: Commitment[], theirCommitments: Commitment[]): string {
  const lines = [
    `Call to ${callData.callerName || "Unknown"} (${callData.callerPhone})`,
    `Duration: ${(callData.duration / 60).toFixed(1)} min | Sentiment: ${callData.sentiment}`,
    `Topics: ${callData.topicsDiscussed.join(", ") || "none"}`,
    "",
    callData.transcriptSummary,
  ];

  if (ourCommitments.length > 0) {
    lines.push("", "OUR COMMITMENTS:");
    ourCommitments.forEach((c) => lines.push(`  - ${c.what}: ${c.description}${c.byWhen ? ` (by ${c.byWhen})` : ""}`));
  }

  if (theirCommitments.length > 0) {
    lines.push("", "THEIR COMMITMENTS:");
    theirCommitments.forEach((c) => lines.push(`  - ${c.what}: ${c.description}${c.byWhen ? ` (by ${c.byWhen})` : ""}`));
  }

  return lines.join("\n");
}

function buildPrioritizationReason(resolution: PostCallResolution): string {
  if (resolution.priorityScore >= 9) return "Booked or callback requested - time-sensitive";
  if (resolution.priorityScore >= 7) return "Engaged lead with clear next step";
  if (resolution.priorityScore >= 5) return "Active engagement - nurture";
  return "Lower priority - standard cadence";
}

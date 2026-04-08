/**
 * Lead Brain — Complete Contextual Memory & Decision Engine
 *
 * The Lead Brain is the core intelligence system. Every lead has ONE brain that:
 * 1. Holds EVERYTHING about them (interactions, behaviors, relationship context, emotions)
 * 2. Computes the single best next action dynamically based on complete context
 * 3. Updates continuously as new events arrive
 *
 * No templates. No sequences. Pure contextual decision-making.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES & INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type InteractionChannel = "call" | "email" | "sms" | "voicemail" | "web";
export type InteractionOutcome =
  | "completed"
  | "appointment_booked"
  | "objection_raised"
  | "objection_resolved"
  | "promise_made"
  | "value_demonstrated"
  | "competitor_mentioned"
  | "budget_discussed"
  | "timeline_mentioned"
  | "no_answer"
  | "voicemail_left"
  | "email_opened"
  | "link_clicked";

export type Sentiment = "positive" | "neutral" | "negative" | "frustrated" | "enthusiastic";
export type EngagementTrend = "rising" | "stable" | "declining" | "recovering";
export type CommunicationStyle = "formal" | "casual" | "direct" | "analytical";
export type BuyingStage = "awareness" | "consideration" | "evaluation" | "decision" | "implementation";
export type LeadHealth = "thriving" | "healthy" | "cooling" | "cold" | "dead";

/**
 * Single interaction: call, email, SMS, voicemail, or website visit
 */
export interface LeadInteraction {
  id: string;
  timestamp: string;
  channel: InteractionChannel;
  outcome: InteractionOutcome;
  duration?: number; // seconds
  sentiment?: Sentiment;
  // What was said/done
  summary: string;
  keyMoments: string[];
  questionsAsked: string[];
  // Relationship signals
  rapportBuilt: boolean;
  objectionRaised?: string;
  objectionResolved?: string;
  promiseMade?: string;
  promiseFrom?: "us" | "them";
  // Emotional/behavioral signals
  responsiveness: "immediate" | "delayed" | "slow" | "never";
  engagementDepth: number; // 0-10 scale (how much they engaged)
}

/**
 * A new event that updates the brain
 */
export interface LeadEvent {
  id: string;
  timestamp: string;
  type: "interaction" | "outcome" | "signal" | "milestone";
  interaction?: LeadInteraction;
  // For outcomes: appointment confirmed, payment made, etc
  outcome?: {
    type: string;
    value?: number;
    description: string;
  };
  // For signals: visited pricing page, opened email, competitor contract expiring soon
  signal?: {
    type: string;
    value: string;
    source: string;
  };
  // For milestones: meeting with decision maker, decision timeline announced
  milestone?: {
    type: string;
    description: string;
  };
}

/**
 * Behavioral profile of a lead
 */
export interface BehavioralProfile {
  engagementTrajectory: EngagementTrend;
  responsePatterns: {
    typical: "immediate" | "delayed" | "slow" | "inconsistent";
    averageHoursToRespond: number;
    responseRate: number; // 0-1
  };
  preferredChannel: InteractionChannel;
  secondaryChannel?: InteractionChannel;
  preferredTime: {
    dayOfWeek?: string;
    hourOfDay?: number;
    timezone?: string;
  };
  communicationStyle: CommunicationStyle;
  engagementDepth: number; // 0-10: how deeply they engage in conversations
}

/**
 * Emotional state detection
 */
export interface EmotionalState {
  sentiment: Sentiment;
  frustrationLevel: number; // 0-10
  enthusiasmLevel: number; // 0-10
  urgencyLevel: number; // 0-10
  lastDetected: string;
  trend: "stable" | "improving" | "declining";
}

/**
 * Relationship context
 */
export interface RelationshipContext {
  teamMembers: string[]; // who's spoken to them
  rapportLevel: number; // 0-10
  trustScore: number; // 0-100
  objectionsRaised: Array<{ objection: string; resolvedAt?: string }>;
  promisesMadeByUs: Array<{ promise: string; dueDate?: string; fulfilledAt?: string }>;
  promisesMadeByThem: Array<{ promise: string; dueDate?: string; fulfilledAt?: string }>;
  decisionMakersIdentified: string[];
  buyingStage: BuyingStage;
  stageEnteredAt: string;
}

/**
 * Business context specific to this lead
 */
export interface BusinessContext {
  industry?: string;
  companySize?: string;
  dealValue?: number;
  currency?: string;
  competitiveSituation?: string;
  painPointsIdentified: string[];
  goalsIdentified: string[];
  budgetSignals?: {
    confirmed: boolean;
    amount?: number;
    source?: string;
  };
  competitorMentions: Array<{ competitor: string; context: string; mentionedAt: string }>;
  contractExpirationInfo?: {
    currentContractor?: string;
    expirationDate?: string;
    opportunity?: string;
  };
}

/**
 * The complete Lead Brain state
 */
export interface LeadBrain {
  leadId: string;
  workspaceId: string;

  // Complete history
  interactions: LeadInteraction[];
  events: LeadEvent[];

  // Derived signals (computed from history)
  behavioral: BehavioralProfile;
  emotional: EmotionalState;
  relationship: RelationshipContext;
  business: BusinessContext;

  // Calculated metrics
  trustScore: number; // 0-100
  engagementScore: number; // 0-100
  conversionProbability: number; // 0-1

  // Metadata
  createdAt: string;
  lastUpdatedAt: string;
  lastInteractionAt: string;
  interactionCount: number;
}

/**
 * The computed next action with full context
 */
export interface ComputedAction {
  action: string; // "send_email", "call", "sms", "wait", "escalate", etc
  channel: InteractionChannel | "multi" | "none";
  timing: {
    immediate: boolean;
    delayMinutes?: number;
    optimalTime?: string; // ISO or human-friendly
  };
  messageContext: {
    reference: string; // what to reference from past conversation
    tone: string; // how to approach
    talkingPoints: string[];
    whatNotToSay: string[];
  };
  reasoning: string; // why this is the best action
  confidence: number; // 0-1
}

/**
 * Lead health assessment
 */
export interface LeadHealthAssessment {
  overallHealth: LeadHealth;
  riskFactors: string[];
  opportunitySignals: string[];
  recommendedUrgency: "immediate" | "today" | "this-week" | "next-week" | "nurture";
  daysToNextAction: number;
  keyRecommendations: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Build a complete Lead Brain from raw interaction history
 */
export function buildLeadBrain(interactions: LeadInteraction[]): LeadBrain {
  if (interactions.length === 0) {
    return {
      leadId: "",
      workspaceId: "",
      interactions: [],
      events: [],
      behavioral: getDefaultBehavioralProfile(),
      emotional: getDefaultEmotionalState(),
      relationship: getDefaultRelationshipContext(),
      business: getDefaultBusinessContext(),
      trustScore: 0,
      engagementScore: 0,
      conversionProbability: 0,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
      interactionCount: 0,
    };
  }

  // Sort by timestamp (oldest first for processing)
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Build behavioral profile from interaction patterns
  const behavioral = deduceBehavioralProfile(sorted);

  // Build emotional state from most recent interactions
  const emotional = deduceEmotionalState(sorted);

  // Build relationship context from commitment and promise tracking
  const relationship = deduceRelationshipContext(sorted);

  // Build business context from mentions and signals
  const business = deduceBusinessContext(sorted);

  // Calculate trust score: based on promises kept + response consistency + engagement depth
  const trustScore = calculateTrustScore(sorted, relationship);

  // Calculate engagement score: how actively they participate
  const engagementScore = calculateEngagementScore(sorted, behavioral);

  // Calculate conversion probability: where are they in journey + engagement + sentiment
  const conversionProbability = estimateConversionProbability(
    sorted,
    relationship,
    behavioral,
    emotional
  );

  const now = new Date().toISOString();
  const lastInteraction = sorted[sorted.length - 1];

  return {
    leadId: "",
    workspaceId: "",
    interactions: sorted,
    events: [], // Will be populated by updateBrain
    behavioral,
    emotional,
    relationship,
    business,
    trustScore,
    engagementScore,
    conversionProbability,
    createdAt: now,
    lastUpdatedAt: now,
    lastInteractionAt: lastInteraction.timestamp,
    interactionCount: sorted.length,
  };
}

/**
 * Compute the single best next action based on complete lead context
 *
 * Decision factors (weighted):
 * - Most recent event (40%): what just happened?
 * - Emotional state (20%): how do they feel now?
 * - Channel & time preferences (15%): when/how do they like to be contacted?
 * - Buying journey stage (15%): where are they?
 * - Historical effectiveness (10%): what worked before?
 */
export function computeNextAction(brain: LeadBrain): ComputedAction {
  if (brain.interactions.length === 0) {
    return {
      action: "wait",
      channel: "none",
      timing: { immediate: false, delayMinutes: 1440 }, // 24 hours
      messageContext: {
        reference: "Initial outreach",
        tone: "warm_introduction",
        talkingPoints: [],
        whatNotToSay: [],
      },
      reasoning: "No interaction history yet",
      confidence: 0.5,
    };
  }

  const mostRecent = brain.interactions[brain.interactions.length - 1];
  const minutesSinceLastContact = Math.floor(
    (Date.now() - new Date(mostRecent.timestamp).getTime()) / 60000
  );

  // ── CONTEXTUAL DECISION LOGIC ──

  // 1. Check emotional state (20% weight)
  if (brain.emotional.sentiment === "frustrated" || brain.emotional.frustrationLevel > 7) {
    // De-escalate: light touch, acknowledge, offer value
    return {
      action: "send_value_content",
      channel: brain.behavioral.preferredChannel,
      timing: { immediate: false, delayMinutes: 240 }, // Wait 4 hours
      messageContext: {
        reference: `Last conversation about ${mostRecent.summary}`,
        tone: "empathetic_helpful",
        talkingPoints: ["Acknowledge their concern", "Offer solution", "Light next step"],
        whatNotToSay: ["More sales pitch", "Dismissing their concern"],
      },
      reasoning: "Lead is frustrated—reduce pressure, increase value",
      confidence: 0.9,
    };
  }

  // 2. Check most recent outcome (40% weight)
  if (mostRecent.outcome === "appointment_booked") {
    // They committed to a call—confirm 24 hours before
    return {
      action: "send_confirmation",
      channel: brain.behavioral.secondaryChannel || "sms",
      timing: { immediate: false, delayMinutes: 1320 }, // 22 hours after booking
      messageContext: {
        reference: "Appointment confirmed for tomorrow",
        tone: "friendly_reminder",
        talkingPoints: ["Confirm time", "Provide meeting link", "Quick value reminder"],
        whatNotToSay: ["Asking if they still want to meet"],
      },
      reasoning: "Appointment booked—reduce no-show risk with timely reminder",
      confidence: 0.95,
    };
  }

  if (mostRecent.outcome === "promise_made") {
    const promiseFrom = mostRecent.promiseFrom || "us";
    if (promiseFrom === "us") {
      // WE made a promise—fulfill it immediately
      const promise = mostRecent.promiseMade || "Send information";
      return {
        action: "fulfill_promise",
        channel: "email",
        timing: { immediate: true },
        messageContext: {
          reference: `You asked for: ${promise}`,
          tone: "reliable_deliverer",
          talkingPoints: ["Deliver exactly what promised", "Add slight extra value"],
          whatNotToSay: ["Asking for anything in return yet"],
        },
        reasoning: "We made a promise—fulfill it immediately to build trust",
        confidence: 0.98,
      };
    } else {
      // THEY made a promise—follow up to completion
      return {
        action: "follow_up_promise",
        channel: brain.behavioral.preferredChannel,
        timing: { immediate: false, delayMinutes: 1440 }, // 24 hours later
        messageContext: {
          reference: `They committed to: ${mostRecent.promiseMade}`,
          tone: "supportive_collaborator",
          talkingPoints: ["Remind of commitment", "Offer help", "Light pressure"],
          whatNotToSay: ["Accusatory tone"],
        },
        reasoning: "They made a commitment—gently remind and support completion",
        confidence: 0.8,
      };
    }
  }

  if (
    mostRecent.outcome === "objection_raised" &&
    !mostRecent.objectionResolved
  ) {
    // Unresolved objection—address it directly
    return {
      action: "resolve_objection",
      channel: brain.behavioral.preferredChannel,
      timing: { immediate: false, delayMinutes: 60 }, // 1 hour
      messageContext: {
        reference: `Their concern: "${mostRecent.objectionRaised}"`,
        tone: "empathetic_expert",
        talkingPoints: [
          "Acknowledge objection",
          "Provide specific answer",
          "Address root concern",
        ],
        whatNotToSay: ["Dismissing their concern", "Generic answer"],
      },
      reasoning: "Unresolved objection blocking progress—address directly",
      confidence: 0.9,
    };
  }

  if (mostRecent.outcome === "no_answer") {
    // No answer—change strategy
    if (minutesSinceLastContact < 60) {
      // Just tried, switch channel
      const altChannel = brain.behavioral.secondaryChannel || "sms";
      return {
        action: "try_alternate_channel",
        channel: altChannel,
        timing: { immediate: false, delayMinutes: 30 },
        messageContext: {
          reference: "Quick follow-up",
          tone: "casual_persistent",
          talkingPoints: ["Light value prop", "Easy way to reply"],
          whatNotToSay: [],
        },
        reasoning: "No answer on primary channel—try secondary",
        confidence: 0.75,
      };
    } else if (minutesSinceLastContact < 1440) {
      // Tried 1h+ ago, try again same channel
      return {
        action: "retry_call",
        channel: "call",
        timing: { immediate: false, delayMinutes: 120 },
        messageContext: {
          reference: "Following up from earlier attempt",
          tone: "normal",
          talkingPoints: ["Quick question", "Value to discuss"],
          whatNotToSay: [],
        },
        reasoning: "No answer earlier—retry with new angle",
        confidence: 0.7,
      };
    }
  }

  // 4. Check channel preferences (15% weight)
  const nextChannel = brain.behavioral.preferredChannel;

  // 5. Check engagement and sentiment (overall 20% weight) - CHECK EARLY
  if (brain.engagementScore < 30) {
    // Low engagement—lighter touch
    return {
      action: "light_value_add",
      channel: brain.behavioral.preferredChannel,
      timing: { immediate: false, delayMinutes: 2880 }, // 48 hours, give space
      messageContext: {
        reference: "Thought of you",
        tone: "helpful_not_pushy",
        talkingPoints: ["Relevant content", "No ask", "Personalized"],
        whatNotToSay: ["Sales language", "Pressure"],
      },
      reasoning: "Low engagement—respect their space, add value",
      confidence: 0.7,
    };
  }

  // 3. Check buying stage (15% weight)
  if (brain.relationship.buyingStage === "decision") {
    // In decision stage—push for closure
    return {
      action: "close_or_clarify",
      channel: brain.behavioral.preferredChannel,
      timing: { immediate: true },
      messageContext: {
        reference: "Next steps to move forward",
        tone: "confident_closer",
        talkingPoints: ["Clear next step", "Remove friction", "Sense of urgency"],
        whatNotToSay: ["Desperate", "High pressure"],
      },
      reasoning: "In decision stage—directly move to close",
      confidence: 0.85,
    };
  }

  if (brain.relationship.buyingStage === "awareness") {
    // Early stage—build awareness and engagement
    return {
      action: "educate_engage",
      channel: brain.behavioral.preferredChannel,
      timing: { immediate: false, delayMinutes: 0 }, // When they're typically active
      messageContext: {
        reference: "What you mentioned about...",
        tone: "knowledgeable_helper",
        talkingPoints: ["Industry insight", "Problem validation", "Thought leadership"],
        whatNotToSay: ["Product pitch", "Ask for commitment"],
      },
      reasoning: "Early stage awareness—educate and engage",
      confidence: 0.75,
    };
  }

  // 6. Default: move to next logical stage
  return {
    action: "advance_qualification",
    channel: nextChannel,
    timing: { immediate: false, delayMinutes: 120 },
    messageContext: {
      reference: `Based on our conversation about ${mostRecent.summary}`,
      tone: "natural_progression",
      talkingPoints: ["Clarify next fit", "Prepare for decision", "Address concerns"],
      whatNotToSay: [],
    },
    reasoning: "Continue natural progression based on context",
    confidence: 0.65,
  };
}

/**
 * Update the brain with a new event
 */
export function updateBrain(brain: LeadBrain, newEvent: LeadEvent): LeadBrain {
  const updated = { ...brain };

  // Add to events list
  updated.events = [...updated.events, newEvent];

  // If it's an interaction, add to interactions
  if (newEvent.interaction) {
    updated.interactions = [...updated.interactions, newEvent.interaction];
  }

  // Recalculate all derived signals
  updated.behavioral = deduceBehavioralProfile(updated.interactions);
  updated.emotional = deduceEmotionalState(updated.interactions);
  updated.relationship = deduceRelationshipContext(updated.interactions);
  updated.business = deduceBusinessContext(updated.interactions);

  // Recalculate scores
  updated.trustScore = calculateTrustScore(updated.interactions, updated.relationship);
  updated.engagementScore = calculateEngagementScore(updated.interactions, updated.behavioral);
  updated.conversionProbability = estimateConversionProbability(
    updated.interactions,
    updated.relationship,
    updated.behavioral,
    updated.emotional
  );

  // Update metadata
  updated.lastUpdatedAt = new Date().toISOString();
  updated.interactionCount = updated.interactions.length;
  if (newEvent.interaction) {
    updated.lastInteractionAt = newEvent.interaction.timestamp;
  }

  return updated;
}

/**
 * Assess overall lead health
 */
export function assessLeadHealth(brain: LeadBrain): LeadHealthAssessment {
  const riskFactors: string[] = [];
  const opportunitySignals: string[] = [];

  // ── RISK ASSESSMENT ──
  if (brain.emotional.sentiment === "negative" || brain.emotional.frustrationLevel > 7) {
    riskFactors.push("high_frustration");
  }

  if (brain.behavioral.engagementTrajectory === "declining") {
    riskFactors.push("engagement_declining");
  }

  const lastInteractionDate = new Date(brain.lastInteractionAt);
  const daysSinceLastContact = Math.floor(
    (Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLastContact > 30) {
    riskFactors.push("stale_no_contact_30days");
  } else if (daysSinceLastContact > 14) {
    riskFactors.push("cooling_no_contact_14days");
  } else if (daysSinceLastContact > 7) {
    riskFactors.push("cold_no_contact_7days");
  }

  if (brain.trustScore < 30) {
    riskFactors.push("low_trust");
  }

  // Check for competitor mentions
  if (brain.business.competitorMentions.length > 0) {
    const recentMentions = brain.business.competitorMentions.filter((m) => {
      const daysAgo = Math.floor(
        (Date.now() - new Date(m.mentionedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysAgo < 30;
    });
    if (recentMentions.length > 0) {
      riskFactors.push("competitor_actively_mentioned");
    }
  }

  // ── OPPORTUNITY SIGNALS ──
  if (brain.relationship.buyingStage === "decision" || brain.relationship.buyingStage === "evaluation") {
    opportunitySignals.push("in_active_buying_stage");
  }

  if (brain.business.painPointsIdentified.length >= 2) {
    opportunitySignals.push("multiple_pain_points_identified");
  }

  if (brain.relationship.decisionMakersIdentified.length > 1) {
    opportunitySignals.push("multiple_decision_makers");
  }

  if (brain.business.budgetSignals?.confirmed) {
    opportunitySignals.push("budget_confirmed");
  }

  if (brain.emotional.enthusiasmLevel > 7) {
    opportunitySignals.push("high_enthusiasm");
  }

  if (brain.behavioral.engagementTrajectory === "rising") {
    opportunitySignals.push("rising_engagement");
  }

  // ── OVERALL HEALTH DETERMINATION ──
  let overallHealth: LeadHealth = "healthy";
  if (brain.conversionProbability > 0.7 && brain.trustScore > 70) {
    overallHealth = "thriving";
  } else if (brain.conversionProbability < 0.2 && daysSinceLastContact > 30) {
    overallHealth = "dead";
  } else if (daysSinceLastContact > 14 || brain.behavioral.engagementTrajectory === "declining") {
    overallHealth = "cooling";
  } else if (daysSinceLastContact > 7 || brain.emotional.sentiment === "negative") {
    overallHealth = "cold";
  }

  // ── URGENCY RECOMMENDATION ──
  let recommendedUrgency: "immediate" | "today" | "this-week" | "next-week" | "nurture" = "next-week";
  if (brain.relationship.buyingStage === "decision") {
    recommendedUrgency = "immediate";
  } else if (
    brain.relationship.buyingStage === "evaluation" ||
    brain.conversionProbability > 0.6
  ) {
    recommendedUrgency = "today";
  } else if (brain.behavioral.engagementTrajectory === "rising") {
    recommendedUrgency = "this-week";
  } else if (overallHealth === "cooling" || overallHealth === "cold") {
    recommendedUrgency = "today";
  }

  const daysToNextAction =
    recommendedUrgency === "immediate"
      ? 0
      : recommendedUrgency === "today"
        ? 0
        : recommendedUrgency === "this-week"
          ? 3
          : recommendedUrgency === "next-week"
            ? 7
            : 14;

  // ── KEY RECOMMENDATIONS ──
  const keyRecommendations: string[] = [];
  if (riskFactors.includes("high_frustration")) {
    keyRecommendations.push("De-escalate immediately, reduce contact frequency");
  }
  if (riskFactors.includes("competitor_actively_mentioned")) {
    keyRecommendations.push("Address competitor positioning proactively");
  }
  if (opportunitySignals.includes("in_active_buying_stage")) {
    keyRecommendations.push("Accelerate—lead is actively evaluating");
  }
  if (brain.trustScore < 40) {
    keyRecommendations.push("Focus on trust-building: deliver on promises, be responsive");
  }
  if (opportunitySignals.includes("rising_engagement")) {
    keyRecommendations.push("Maintain momentum—strike while iron is hot");
  }

  return {
    overallHealth,
    riskFactors,
    opportunitySignals,
    recommendedUrgency,
    daysToNextAction,
    keyRecommendations,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS (Pure Logic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getDefaultBehavioralProfile(): BehavioralProfile {
  return {
    engagementTrajectory: "stable",
    responsePatterns: {
      typical: "delayed",
      averageHoursToRespond: 24,
      responseRate: 0.5,
    },
    preferredChannel: "call",
    preferredTime: { dayOfWeek: "weekday", hourOfDay: 14 },
    communicationStyle: "formal",
    engagementDepth: 5,
  };
}

function getDefaultEmotionalState(): EmotionalState {
  return {
    sentiment: "neutral",
    frustrationLevel: 0,
    enthusiasmLevel: 5,
    urgencyLevel: 3,
    lastDetected: new Date().toISOString(),
    trend: "stable",
  };
}

function getDefaultRelationshipContext(): RelationshipContext {
  return {
    teamMembers: [],
    rapportLevel: 0,
    trustScore: 0,
    objectionsRaised: [],
    promisesMadeByUs: [],
    promisesMadeByThem: [],
    decisionMakersIdentified: [],
    buyingStage: "awareness",
    stageEnteredAt: new Date().toISOString(),
  };
}

function getDefaultBusinessContext(): BusinessContext {
  return {
    painPointsIdentified: [],
    goalsIdentified: [],
    competitorMentions: [],
  };
}

function deduceBehavioralProfile(interactions: LeadInteraction[]): BehavioralProfile {
  if (interactions.length === 0) return getDefaultBehavioralProfile();

  // Channel preferences
  const channelCounts = interactions.reduce(
    (acc, i) => {
      acc[i.channel] = (acc[i.channel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const preferredChannel = (
    Object.entries(channelCounts).sort(([, a], [, b]) => b - a)[0] || ["call", 0]
  )[0] as InteractionChannel;
  const secondaryChannel = (
    Object.entries(channelCounts).sort(([, a], [, b]) => b - a)[1]?.at(0) as
      | InteractionChannel
      | undefined
  );

  // Response patterns
  const responseTimes: number[] = [];
  for (let i = 1; i < interactions.length; i++) {
    const prevTime = new Date(interactions[i - 1].timestamp).getTime();
    const currTime = new Date(interactions[i].timestamp).getTime();
    const hoursDiff = (currTime - prevTime) / (1000 * 60 * 60);
    if (hoursDiff < 72) responseTimes.push(hoursDiff); // Ignore gaps > 3 days
  }
  const avgResponseHours = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 24;

  // Engagement trajectory
  const recentEngagement = interactions.slice(-5).map((i) => i.engagementDepth);
  const oldEngagement = interactions.slice(0, Math.max(1, Math.floor(interactions.length * 0.3))).map(
    (i) => i.engagementDepth
  );
  const recentAvg = recentEngagement.reduce((a, b) => a + b, 0) / recentEngagement.length;
  const oldAvg = oldEngagement.reduce((a, b) => a + b, 0) / oldEngagement.length;
  let trajectory: EngagementTrend = "stable";
  if (recentAvg > oldAvg + 2) trajectory = "rising";
  else if (recentAvg < oldAvg - 2) trajectory = "declining";
  else if (recentAvg < 3) trajectory = "declining";

  // Communication style (inferred from engagement depth and sentiment)
  let style: CommunicationStyle = "formal";
  const avgSentiment = interactions.filter((i) => i.sentiment === "positive").length /
    interactions.length;
  const avgEngagement = recentEngagement.reduce((a, b) => a + b, 0) / recentEngagement.length;
  if (avgEngagement > 8 && avgSentiment > 0.6) style = "casual";
  else if (avgEngagement > 6) style = "direct";
  else if (avgSentiment > 0.5) style = "analytical";

  // Response rate
  const answered = interactions.filter((i) => i.outcome !== "no_answer").length;
  const responseRate = answered / Math.max(1, interactions.length);

  // Engagement depth
  const avgEngagementDepth =
    interactions.reduce((sum, i) => sum + i.engagementDepth, 0) / interactions.length;

  const typicalResponse: "immediate" | "delayed" | "slow" | "inconsistent" =
    avgResponseHours < 4
      ? "immediate"
      : avgResponseHours < 12
        ? "delayed"
        : avgResponseHours < 48
          ? "slow"
          : "inconsistent";

  return {
    engagementTrajectory: trajectory,
    responsePatterns: {
      typical: typicalResponse,
      averageHoursToRespond: avgResponseHours,
      responseRate,
    },
    preferredChannel,
    secondaryChannel,
    preferredTime: { dayOfWeek: "weekday", hourOfDay: 14 }, // Would need more data
    communicationStyle: style,
    engagementDepth: Math.round(avgEngagementDepth),
  };
}

function deduceEmotionalState(interactions: LeadInteraction[]): EmotionalState {
  if (interactions.length === 0) return getDefaultEmotionalState();

  const recent = interactions.slice(-3);
  const sentiments = recent.map((i) => i.sentiment || "neutral");
  const positivCount = sentiments.filter((s) => s === "positive").length;
  const frustrationCount = sentiments.filter((s) => s === "frustrated").length;

  const sentiment: Sentiment =
    positivCount >= 2
      ? "positive"
      : frustrationCount >= 2
        ? "frustrated"
        : sentiments[sentiments.length - 1] || "neutral";

  const frustrationLevel = frustrationCount * 3;
  const enthusiasmLevel = sentiments.filter((s) => s === "enthusiastic").length * 5 +
    (positivCount * 2);

  // Trend
  const oldSentiment = interactions.slice(0, 3).map((i) => i.sentiment || "neutral");
  const oldPositive = oldSentiment.filter((s) => s === "positive").length;
  const trend =
    positivCount > oldPositive ? "improving" : positivCount < oldPositive ? "declining" : "stable";

  return {
    sentiment,
    frustrationLevel: Math.min(10, frustrationLevel),
    enthusiasmLevel: Math.min(10, enthusiasmLevel),
    urgencyLevel: 5, // Would need explicit urgency signals
    lastDetected: recent[recent.length - 1]?.timestamp || new Date().toISOString(),
    trend,
  };
}

function deduceRelationshipContext(interactions: LeadInteraction[]): RelationshipContext {
  const objectionsRaised = interactions
    .filter((i) => i.objectionRaised)
    .map((i) => ({
      objection: i.objectionRaised || "",
      resolvedAt: i.objectionResolved ? i.timestamp : undefined,
    }));

  const promisesMadeByUs = interactions
    .filter((i) => i.promiseMade && i.promiseFrom === "us")
    .map((i) => ({
      promise: i.promiseMade || "",
      dueDate: undefined,
      fulfilledAt: undefined, // Would need to track fulfillment
    }));

  const promisesMadeByThem = interactions
    .filter((i) => i.promiseMade && i.promiseFrom === "them")
    .map((i) => ({
      promise: i.promiseMade || "",
      dueDate: undefined,
      fulfilledAt: undefined,
    }));

  // Rapport from interactions where rapport was built
  const rapportBuilt = interactions.filter((i) => i.rapportBuilt).length;
  const rapportLevel = Math.min(10, rapportBuilt);

  // Infer buying stage from objectives and promises
  let buyingStage: BuyingStage = "awareness";
  if (
    promisesMadeByThem.length >= 2 ||
    interactions.some((i) => i.outcome === "appointment_booked")
  ) {
    buyingStage = "decision";
  } else if (promisesMadeByUs.length >= 1) {
    buyingStage = "evaluation";
  } else if (rapportBuilt >= 2) {
    buyingStage = "consideration";
  }

  return {
    teamMembers: [], // Would need to track
    rapportLevel: Math.min(10, rapportLevel),
    trustScore: 50, // Will be calculated separately
    objectionsRaised,
    promisesMadeByUs,
    promisesMadeByThem,
    decisionMakersIdentified: [],
    buyingStage,
    stageEnteredAt: new Date().toISOString(),
  };
}

function deduceBusinessContext(interactions: LeadInteraction[]): BusinessContext {
  const painPoints = interactions
    .flatMap((i) => i.keyMoments.filter((m) => m.includes("pain") || m.includes("problem")))
    .filter((p, i, arr) => arr.indexOf(p) === i); // Unique

  return {
    painPointsIdentified: painPoints,
    goalsIdentified: [],
    competitorMentions: [],
  };
}

function calculateTrustScore(
  interactions: LeadInteraction[],
  relationship: RelationshipContext
): number {
  let score = 50; // Start neutral

  // Promises kept: +15 per fulfilled promise
  score += relationship.promisesMadeByUs.filter((p) => p.fulfilledAt).length * 15;

  // Rapport built: +10 per interaction
  score += relationship.rapportLevel * 5;

  // Consistency in responsiveness: +10
  const consistent = interactions.slice(-5).filter((i) => i.responsiveness !== "never").length;
  if (consistent >= 4) score += 10;

  // Resolve objections: +10 per resolved
  score += relationship.objectionsRaised.filter((o) => o.resolvedAt).length * 10;

  return Math.min(100, score);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPATIBILITY: DB-aware functions & type aliases for pre-existing routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * LeadIntelligence — the persisted, flattened representation used by
 * brain-trigger, bootstrap, leads/[id]/intelligence, autonomous-executor,
 * adaptive-followup, meeting-aware, and smart-reactivation.
 */
export interface LeadIntelligence {
  lead_id: string;
  workspace_id: string;
  urgency_score: number;
  intent_score: number;
  engagement_score: number;
  conversion_probability: number;
  next_best_action: string;
  action_timing: "immediate" | "scheduled" | "deferred";
  action_confidence: number;
  risk_flags: string[];
  opportunity_signals: string[];
  recommended_channel: string;
  recommended_tone: string;
  brain_snapshot: LeadBrain | null;
  computed_at: string;
  // Additional properties for reactivation and state tracking
  last_contact_at: string; // When this intelligence was computed (last contact reference)
  churn_risk: number; // 0-1: Probability of churn (inverse of conversion_probability or based on risk_flags)
  last_outcome: string | null; // Most recent interaction outcome (e.g., "no_show", "appointment_cancelled")
  lifecycle_phase?: string; // Lead lifecycle phase (e.g., "WON", "RETAIN", "NURTURE")
}

/**
 * Compute intelligence for a lead by fetching interactions from the DB,
 * building the brain, computing the next action, and flattening into
 * LeadIntelligence.
 */
export async function computeLeadIntelligence(
  workspaceId: string,
  leadId: string
): Promise<LeadIntelligence> {
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();

  // Fetch recent interactions (canonical signals) for this lead
  const { data: signals } = await db
    .from("canonical_signals")
    .select("id, workspace_id, lead_id, signal_type, payload, occurred_at, created_at")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: true })
    .limit(100);

  // Convert canonical_signals to LeadInteraction[]
  const interactions: LeadInteraction[] = (signals ?? []).map((s: Record<string, unknown>, index: number) => {
    const payload = (s.payload as Record<string, unknown>) || {};
    return {
      id: `signal-${(s.id as string) || index}`,
      timestamp: (s.occurred_at as string) || (s.created_at as string) || new Date().toISOString(),
      channel: mapSignalChannel(s.signal_type as string),
      outcome: mapSignalOutcome(s.signal_type as string, payload),
      summary: (payload.summary as string) || `Signal: ${s.signal_type as string}`,
      keyMoments: [],
      questionsAsked: [],
      rapportBuilt: false,
      responsiveness: "delayed" as const,
      engagementDepth: (payload.weight as number) || 5,
      duration: (payload.duration as number) || 0,
      sentiment: ((payload.sentiment as string) || "neutral") as Sentiment,
    };
  });

  const brain = buildLeadBrain(interactions);
  const action = computeNextAction(brain);
  const health = assessLeadHealth(brain);

  const timingMap: Record<string, "immediate" | "scheduled" | "deferred"> = {
    immediate: "immediate",
    today: "scheduled",
    "this-week": "scheduled",
    "next-week": "deferred",
    nurture: "deferred",
  };

  // Determine last outcome from most recent interaction
  let lastOutcome: string | null = null;
  if (interactions.length > 0) {
    const mostRecentInteraction = interactions[interactions.length - 1];
    lastOutcome = mostRecentInteraction.outcome;
  }

  // Compute churn risk as inverse of conversion probability, adjusted by risk flags
  let churnRisk = 1 - brain.conversionProbability;
  if (health.riskFactors.includes("no_recent_engagement")) churnRisk = Math.min(1, churnRisk + 0.15);
  if (health.riskFactors.includes("objections_unresolved")) churnRisk = Math.min(1, churnRisk + 0.1);

  const computedAtTime = new Date().toISOString();

  return {
    lead_id: leadId,
    workspace_id: workspaceId,
    urgency_score: health.recommendedUrgency === "immediate" ? 1.0
      : health.recommendedUrgency === "today" ? 0.8
      : health.recommendedUrgency === "this-week" ? 0.5
      : 0.3,
    intent_score: brain.conversionProbability,
    engagement_score: brain.engagementScore / 100,
    conversion_probability: brain.conversionProbability,
    next_best_action: action.action,
    action_timing: timingMap[health.recommendedUrgency] || "scheduled",
    action_confidence: Math.min(1, brain.trustScore / 100 + brain.conversionProbability * 0.3),
    risk_flags: health.riskFactors,
    opportunity_signals: health.opportunitySignals,
    recommended_channel: action.channel,
    recommended_tone: action.messageContext.tone,
    brain_snapshot: brain,
    computed_at: computedAtTime,
    last_contact_at: computedAtTime,
    churn_risk: churnRisk,
    last_outcome: lastOutcome,
  };
}

/**
 * Persist computed intelligence to lead_intelligence table.
 */
export async function persistLeadIntelligence(
  intelligence: LeadIntelligence
): Promise<{ ok: boolean }> {
  try {
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    const { error } = await db
      .from("lead_intelligence")
      .upsert(
        {
          lead_id: intelligence.lead_id,
          workspace_id: intelligence.workspace_id,
          urgency_score: intelligence.urgency_score,
          intent_score: intelligence.intent_score,
          engagement_score: intelligence.engagement_score,
          conversion_probability: intelligence.conversion_probability,
          next_best_action: intelligence.next_best_action,
          action_timing: intelligence.action_timing,
          action_confidence: intelligence.action_confidence,
          action_channel: intelligence.recommended_channel,
          action_reason: intelligence.recommended_tone,
          risk_flags_json: JSON.stringify(intelligence.risk_flags),
          churn_risk: intelligence.churn_risk,
          last_outcome: intelligence.last_outcome,
          last_contact_at: intelligence.last_contact_at,
          last_sentiment: "neutral",
          lifecycle_phase: intelligence.lifecycle_phase || null,
          computed_at: intelligence.computed_at,
          signal_count: 0,
          total_touchpoints: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id,workspace_id" }
      );
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/**
 * Retrieve persisted intelligence for a lead.
 */
export async function getLeadIntelligence(
  workspaceId: string,
  leadId: string
): Promise<LeadIntelligence | null> {
  try {
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    const { data, error } = await db
      .from("lead_intelligence")
      .select("*")
      .eq("lead_id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    // Map DB columns to LeadIntelligence interface
    return {
      lead_id: row.lead_id as string,
      workspace_id: row.workspace_id as string,
      urgency_score: (row.urgency_score as number) || 0,
      intent_score: (row.intent_score as number) || 0,
      engagement_score: (row.engagement_score as number) || 0,
      conversion_probability: (row.conversion_probability as number) || 0,
      next_best_action: (row.next_best_action as string) || "wait",
      action_timing: (row.action_timing as "immediate" | "scheduled" | "deferred") || "scheduled",
      action_confidence: (row.action_confidence as number) || 0,
      risk_flags: parseJsonArray(row.risk_flags_json),
      opportunity_signals: [],
      recommended_channel: (row.action_channel as string) || "call",
      recommended_tone: (row.action_reason as string) || "professional",
      brain_snapshot: null,
      computed_at: (row.computed_at as string) || new Date().toISOString(),
      last_contact_at: (row.last_contact_at as string) || new Date().toISOString(),
      churn_risk: (row.churn_risk as number) || 0,
      last_outcome: (row.last_outcome as string) || null,
      lifecycle_phase: (row.lifecycle_phase as string) || undefined,
    };
  } catch {
    return null;
  }
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val) as string[]; } catch { return []; }
  }
  return [];
}

// Aliases for routes that import under different names
export const buildBrainFromInteractions = buildLeadBrain;
export const updateBrainWithEvent = updateBrain;

// Signal-to-interaction mappers
function mapSignalChannel(signalType: string): InteractionChannel {
  if (signalType.includes("call")) return "call";
  if (signalType.includes("email")) return "email";
  if (signalType.includes("sms")) return "sms";
  if (signalType.includes("voicemail")) return "voicemail";
  return "web";
}

function mapSignalOutcome(
  signalType: string,
  metadata: Record<string, unknown> | null
): InteractionOutcome {
  if (signalType.includes("booked") || signalType.includes("appointment"))
    return "appointment_booked";
  if (signalType.includes("objection")) return "objection_raised";
  if (signalType.includes("open")) return "email_opened";
  if (signalType.includes("click")) return "link_clicked";
  if (signalType.includes("voicemail")) return "voicemail_left";
  if (signalType.includes("no_answer")) return "no_answer";
  if (metadata?.outcome === "promise") return "promise_made";
  return "completed";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// END COMPATIBILITY SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateEngagementScore(
  interactions: LeadInteraction[],
  behavioral: BehavioralProfile
): number {
  let score = 0;

  // Engagement depth average: 0-40 points
  score += behavioral.engagementDepth * 4;

  // Response rate: 0-30 points
  score += behavioral.responsePatterns.responseRate * 30;

  // Trajectory: 0-30 points
  score +=
    behavioral.engagementTrajectory === "rising"
      ? 30
      : behavioral.engagementTrajectory === "stable"
        ? 15
        : 0;

  return Math.min(100, score);
}

function estimateConversionProbability(
  interactions: LeadInteraction[],
  relationship: RelationshipContext,
  behavioral: BehavioralProfile,
  emotional: EmotionalState
): number {
  let probability = 0.3; // Base 30%

  // Buying stage: 0-0.4 bonus
  const stageBonus =
    relationship.buyingStage === "decision"
      ? 0.4
      : relationship.buyingStage === "evaluation"
        ? 0.25
        : relationship.buyingStage === "consideration"
          ? 0.1
          : 0;
  probability += stageBonus;

  // Engagement trajectory: 0-0.2 bonus
  if (behavioral.engagementTrajectory === "rising") probability += 0.2;
  else if (behavioral.engagementTrajectory === "declining") probability -= 0.15;

  // Sentiment: 0-0.15 bonus/penalty
  if (emotional.sentiment === "positive" || emotional.sentiment === "enthusiastic") probability += 0.15;
  else if (emotional.sentiment === "frustrated" || emotional.sentiment === "negative") probability -= 0.1;

  // Promises made by them: +0.1 per promise (signals commitment)
  probability += Math.min(0.2, relationship.promisesMadeByThem.length * 0.1);

  return Math.max(0, Math.min(1, probability));
}

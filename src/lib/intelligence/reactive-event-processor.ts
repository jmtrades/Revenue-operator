/**
 * Reactive Event Processor — Real-Time Nervous System
 * Instantly determines the right reaction when ANY event happens with a lead.
 * Not on a schedule — immediately when the event occurs.
 */

/**
 * Core event types that trigger reactions
 */
export type LeadEventType =
  // Inbound events (lead does something)
  | "lead_callback"
  | "email_reply"
  | "sms_reply"
  | "pricing_page_visit"
  | "demo_page_visit"
  | "email_open"
  | "email_click"
  | "form_fill"
  | "social_mention"
  | "job_posting_detected"
  | "competitor_contract_expiring"
  | "referral_received"
  // Internal events (system events)
  | "call_attempt_failed"
  | "email_bounced"
  | "sms_delivery_failed"
  | "lead_score_changed"
  | "lead_assigned"
  | "campaign_ended"
  | "payment_event";

export type EventUrgencyLevel = "immediate" | "within-hour" | "same-day" | "next-day" | "next-week";

export type EventChainType = "heating" | "cooling" | "stalling" | "converting" | "churning";

export type LeadActionChannel = "call" | "email" | "sms" | "voicemail" | "manual";

export type ReactivationSignalStrength = "weak" | "moderate" | "strong";

/**
 * Core event data structure
 */
export interface LeadEvent {
  id: string;
  type: LeadEventType;
  timestamp: string; // ISO 8601
  leadId: string;
  channel?: LeadActionChannel;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Lead context for making reactions
 */
export interface LeadContext {
  leadId: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  lifecyclePhase: string; // NEW, ENGAGED, QUALIFIED, BOOKED, WON, LOST
  daysSinceFirstContact: number;
  daysSinceDark: number; // Days since last activity
  leadScore: number; // 0-100
  conversionProbability: number; // 0-1
  lastActivityAt: string; // ISO 8601
  lastTouchChannel: LeadActionChannel;
  totalTouchpoints: number;
  recentEvents: LeadEvent[]; // Last 10 events
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  hasOptedOut: boolean;
  isHighValue: boolean;
}

/**
 * Immediate action to take
 */
export interface ImmediateAction {
  type: "call" | "sms" | "email" | "voicemail" | "note";
  priority: "critical" | "high" | "normal" | "low";
  message?: string;
  delay?: number; // milliseconds
  templateKey?: string;
  skipIfNoContact?: boolean;
}

/**
 * Delayed actions to queue
 */
export interface DelayedAction {
  type: "call" | "sms" | "email" | "voicemail";
  delay: number; // milliseconds
  templateKey: string;
  priority: "high" | "normal" | "low";
  condition?: string; // e.g., "if_no_reply"
}

/**
 * Rep notification
 */
export interface RepNotification {
  notify: boolean;
  message: string;
  priority: "urgent" | "high" | "normal";
  actionItems: string[];
}

/**
 * Lead score update
 */
export interface ScoreDelta {
  delta: number; // -100 to +100
  reason: string;
  newScore?: number; // if we have context to calculate
}

/**
 * Stage/lifecycle update
 */
export interface StageUpdate {
  newStage: string;
  reason: string;
}

/**
 * Internal note to log
 */
export interface InternalNote {
  content: string;
  visibility: "private" | "team" | "all";
}

/**
 * Complete reaction to an event
 */
export interface EventReaction {
  eventId: string;
  leadId: string;
  immediateActions: ImmediateAction[];
  delayedActions: DelayedAction[];
  notifyRep: RepNotification;
  scoreDelta: ScoreDelta;
  stageUpdate: StageUpdate | null;
  internalNotes: InternalNote[];
  confidence: number; // 0-1, how confident we are in this reaction
  reasoning: string;
}

/**
 * Event urgency classification
 */
export interface EventUrgency {
  level: EventUrgencyLevel;
  reason: string;
  maxResponseTime: number; // milliseconds
  recommendedChannel: LeadActionChannel;
}

/**
 * Event chain pattern
 */
export interface EventChain {
  chainType: EventChainType;
  events: LeadEvent[];
  sentiment: "positive" | "negative" | "neutral";
  strength: number; // 0-100, how strong is this pattern
  interpretation: string;
  recommendedNextStep: string;
}

/**
 * Reactivation signal for dormant leads
 */
export interface ReactivationSignal {
  detected: true;
  strength: ReactivationSignalStrength;
  signalType: string;
  lastSignal: LeadEvent;
  recommendedApproach: string;
  urgency: EventUrgencyLevel;
  confidence: number; // 0-1
}

/**
 * Event impact on lead understanding
 */
export interface EventImpact {
  scoreDelta: number;
  scoreConfidence: number; // How confident in this delta
  stageChangeRecommended: string | null;
  relationshipTemperatureShift: number; // -10 to +10
  confidenceAdjustment: number; // -0.2 to +0.2
  newUnderstanding: string;
}

/**
 * MAIN FUNCTION: Process any event and determine the right reaction
 * Takes event + lead context, returns what to do immediately and downstream
 */
export function processEvent(
  event: LeadEvent,
  leadContext: LeadContext
): EventReaction {
  const reaction: EventReaction = {
    eventId: event.id,
    leadId: leadContext.leadId,
    immediateActions: [],
    delayedActions: [],
    notifyRep: { notify: false, message: "", priority: "normal", actionItems: [] },
    scoreDelta: { delta: 0, reason: "" },
    stageUpdate: null,
    internalNotes: [],
    confidence: 0.8,
    reasoning: "",
  };

  // Opted out? Stop everything
  if (leadContext.hasOptedOut) {
    reaction.notifyRep = {
      notify: false,
      message: "Lead opted out. No action.",
      priority: "normal",
      actionItems: [],
    };
    return reaction;
  }

  switch (event.type) {
    case "lead_callback":
      return processCallback(event, leadContext, reaction);

    case "email_reply":
      return processEmailReply(event, leadContext, reaction);

    case "email_open":
      return processEmailOpen(event, leadContext, reaction);

    case "pricing_page_visit":
      return processPricingPageVisit(event, leadContext, reaction);

    case "form_fill":
      return processFormFill(event, leadContext, reaction);

    case "sms_reply":
      return processSmsReply(event, leadContext, reaction);

    case "email_bounced":
      return processEmailBounced(event, leadContext, reaction);

    case "lead_score_changed":
      return processScoreChanged(event, leadContext, reaction);

    case "referral_received":
      return processReferral(event, leadContext, reaction);

    case "lead_assigned":
      return processLeadAssigned(event, leadContext, reaction);

    case "demo_page_visit":
    case "job_posting_detected":
    case "competitor_contract_expiring":
    case "social_mention":
    case "call_attempt_failed":
    case "sms_delivery_failed":
    case "campaign_ended":
    case "payment_event":
      return processGenericSignal(event, leadContext, reaction);

    default:
      reaction.reasoning = `Unknown event type: ${event.type}`;
      return reaction;
  }
}

/**
 * Process callback: Lead called back
 * HIGHEST PRIORITY if after dark period (2+ weeks silent)
 */
function processCallback(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const daysSinceDark = leadContext.daysSinceDark;

  // After 14+ days dark: HIGHEST PRIORITY
  if (daysSinceDark >= 14) {
    reaction.immediateActions.push({
      type: "call",
      priority: "critical",
      message:
        `Hi ${leadContext.name}! Great to hear from you — really happy to reconnect. ` +
        `How can I help you today?`,
      delay: 0, // Answer immediately
    });

    reaction.notifyRep = {
      notify: true,
      message: `🔥 CALLBACK ALERT: ${leadContext.name} called back after ${daysSinceDark} days silent. ANSWER NOW. Warm, no guilt-tripping.`,
      priority: "urgent",
      actionItems: ["Answer/call back within 5 min", "Be warm and happy to reconnect"],
    };

    reaction.scoreDelta = {
      delta: +25,
      reason: "Lead re-engaged after dark period",
      newScore: Math.min(100, leadContext.leadScore + 25),
    };

    reaction.stageUpdate = {
      newStage: "ENGAGED",
      reason: "Lead re-initiated contact",
    };

    reaction.internalNotes.push({
      content: `Lead called back after ${daysSinceDark} days. Indicating strong interest or urgency. Treat as re-engagement opportunity.`,
      visibility: "team",
    });

    reaction.confidence = 0.95;
    reaction.reasoning = "Lead after long dark period = highest urgency re-engagement";
  } else {
    // Normal callback: still high priority
    reaction.immediateActions.push({
      type: "call",
      priority: "high",
      delay: 0,
    });

    reaction.scoreDelta = {
      delta: +15,
      reason: "Lead initiated callback",
    };

    reaction.notifyRep = {
      notify: true,
      message: `Lead called. Answer immediately.`,
      priority: "urgent",
      actionItems: ["Pick up now"],
    };

    reaction.confidence = 0.9;
  }

  return reaction;
}

/**
 * Process email reply
 */
function processEmailReply(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const reply = event.data.text as string | undefined;
  const isNegative = reply?.toLowerCase().includes("not interested") ?? false;

  if (isNegative) {
    // "Not interested" reply: Don't argue. Acknowledge. Ask ONE soft question.
    reaction.immediateActions.push({
      type: "email",
      priority: "normal",
      message:
        `Thanks for getting back to me, ${leadContext.name}. I appreciate the honesty. ` +
        `Out of curiosity, is there anything that would make this relevant for you down the road?`,
      delay: 1000 * 60 * 5, // 5 minutes
    });

    reaction.delayedActions.push({
      type: "email",
      delay: 1000 * 60 * 60 * 24 * 30, // 30 days
      templateKey: "soft_reengagement_30d",
      priority: "low",
    });

    reaction.scoreDelta = {
      delta: -10,
      reason: "Lead expressed disinterest",
    };

    reaction.internalNotes.push({
      content: "Lead said not interested. Soft follow-up sent. Back off for 30 days minimum.",
      visibility: "team",
    });

    reaction.confidence = 0.85;
    reaction.reasoning = "Negative reply: acknowledge, ask ONE question, respect decision";
  } else {
    // Positive/neutral reply: Lead engaged
    reaction.scoreDelta = {
      delta: +20,
      reason: "Lead replied to email",
    };

    reaction.immediateActions.push({
      type: "email",
      priority: "high",
      delay: 1000 * 60 * 5, // 5 minutes
      message: `Thanks for your reply! Happy to chat more. When would be a good time for a quick call?`,
    });

    reaction.notifyRep = {
      notify: true,
      message: `${leadContext.name} replied to your email. Follow up promptly.`,
      priority: "high",
      actionItems: ["Send next step email", "Be ready to book call"],
    };

    reaction.stageUpdate = {
      newStage: "QUALIFIED",
      reason: "Lead engaged in email conversation",
    };

    reaction.confidence = 0.9;
  }

  return reaction;
}

/**
 * Process email open
 */
function processEmailOpen(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const openTime = new Date(event.data.openedAt as string);
  const hour = openTime.getHours();

  reaction.scoreDelta = {
    delta: +5,
    reason: "Lead opened email",
  };

  // Late night open (10pm-7am) = they're researching on their time
  if (hour >= 22 || hour < 7) {
    reaction.delayedActions.push({
      type: "sms",
      delay: 1000 * 60 * 60 * 12, // 12 hours (morning)
      templateKey: "morning_soft_sms",
      priority: "normal",
    });

    reaction.internalNotes.push({
      content: `Lead opened email at ${hour}:00 (late/early). Researching on their time. Send soft SMS next morning.`,
      visibility: "private",
    });

    reaction.reasoning = "Email opened late night = soft follow-up in morning";
  } else {
    // Day-time open: slightly more aggressive
    reaction.delayedActions.push({
      type: "sms",
      delay: 1000 * 60 * 60 * 2, // 2 hours
      templateKey: "quick_sms_followup",
      priority: "normal",
    });

    reaction.reasoning = "Email opened during business hours = moderate follow-up";
  }

  reaction.confidence = 0.75;
  return reaction;
}

/**
 * Process pricing page visit (key conversion signal)
 */
function processPricingPageVisit(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const visitCount = (event.data.visitCountToday as number) || 1;

  reaction.scoreDelta = {
    delta: visitCount >= 3 ? +30 : +15,
    reason: `Pricing page visit${visitCount >= 3 ? " (3x today)" : ""}`,
  };

  // 3+ visits in one day: COMPARING. Call within 1 hour.
  if (visitCount >= 3) {
    reaction.immediateActions.push({
      type: "call",
      priority: "high",
      delay: 1000 * 60 * 30, // 30 minutes
      message: `Hi ${leadContext.name}, saw you were reviewing pricing. Happy to walk through options tailored to your situation.`,
    });

    reaction.notifyRep = {
      notify: true,
      message: `${leadContext.name} visited pricing 3x today. They're comparing. Call within 1 hour with value conversation.`,
      priority: "high",
      actionItems: [
        "Call within 1 hour",
        "Ask about their biggest challenge",
        "Position value, not price",
      ],
    };

    reaction.stageUpdate = {
      newStage: "QUALIFIED",
      reason: "Strong pricing page engagement",
    };

    reaction.confidence = 0.9;
    reaction.reasoning = "Multiple pricing visits = active comparison. High-touch call needed.";
  } else {
    // Single visit: nudge
    reaction.delayedActions.push({
      type: "sms",
      delay: 1000 * 60 * 60 * 4, // 4 hours
      templateKey: "pricing_followup_sms",
      priority: "normal",
    });

    reaction.confidence = 0.75;
  }

  return reaction;
}

/**
 * Process form fill (high intent signal)
 */
function processFormFill(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  reaction.scoreDelta = {
    delta: +35,
    reason: "Lead filled out form",
  };

  reaction.immediateActions.push({
    type: "call",
    priority: "critical",
    delay: 1000 * 60 * 5, // Call within 5 minutes (speed-to-lead)
    message: `Hi ${leadContext.name}, thanks for filling that out! I'd love to chat about what you're looking for.`,
  });

  reaction.notifyRep = {
    notify: true,
    message: `${leadContext.name} just filled out a form. CALL IMMEDIATELY. Speed-to-lead critical.`,
    priority: "urgent",
    actionItems: ["Call within 5 minutes", "Reference form submission"],
  };

  reaction.stageUpdate = {
    newStage: "QUALIFIED",
    reason: "High-intent form submission",
  };

  reaction.internalNotes.push({
    content: "Form submission is highest intent signal. Speed-to-lead is critical success factor.",
    visibility: "team",
  });

  reaction.confidence = 0.95;
  reaction.reasoning = "Form fill = expressed intent. Speed-to-lead is everything.";

  return reaction;
}

/**
 * Process SMS reply
 */
function processSmsReply(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const message = event.data.message as string | undefined;

  reaction.scoreDelta = {
    delta: +15,
    reason: "Lead replied via SMS",
  };

  // They're responsive on SMS: use SMS for follow-ups
  reaction.immediateActions.push({
    type: "sms",
    priority: "high",
    delay: 1000 * 60 * 5, // 5 minutes
    message: `Great! When would be a good time for a quick chat about your situation?`,
  });

  reaction.internalNotes.push({
    content: "Lead responsive on SMS. Prefer SMS cadence for this lead.",
    visibility: "private",
  });

  reaction.confidence = 0.8;
  return reaction;
}

/**
 * Process email bounced
 */
function processEmailBounced(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  reaction.scoreDelta = {
    delta: -10,
    reason: "Email bounced",
  };

  // Try alternate email or switch to SMS/call
  reaction.immediateActions.push({
    type: "sms",
    priority: "normal",
    delay: 1000 * 60 * 15, // 15 minutes
    message: `Hi ${leadContext.name}, having trouble reaching you via email. Is this the best number for a quick chat?`,
  });

  reaction.internalNotes.push({
    content: `Email bounced. Trying SMS. Update contact records. Look for alternate email if available.`,
    visibility: "team",
  });

  reaction.confidence = 0.85;
  reaction.reasoning = "Email failed: switch channels, update records";

  return reaction;
}

/**
 * Process lead score changed significantly
 */
function processScoreChanged(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const oldScore = event.data.oldScore as number;
  const newScore = event.data.newScore as number;
  const delta = newScore - oldScore;

  reaction.scoreDelta = {
    delta: 0,
    reason: "Score change processed",
    newScore,
  };

  // Score dropped below threshold: move to nurture
  if (newScore < 30 && oldScore >= 30) {
    reaction.stageUpdate = {
      newStage: "NURTURE",
      reason: "Score fell below engagement threshold",
    };

    reaction.delayedActions.push({
      type: "email",
      delay: 1000 * 60 * 60 * 24, // 1 day
      templateKey: "educational_nurture",
      priority: "low",
    });

    reaction.internalNotes.push({
      content: `Score dropped to ${newScore}. Auto-moved to nurture. Reduce frequency, shift to value/education.`,
      visibility: "team",
    });

    reaction.confidence = 0.9;
  }

  return reaction;
}

/**
 * Process referral received (PRIORITY: thank personally)
 */
function processReferral(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const referrerName = event.data.referrerName as string | undefined;

  reaction.scoreDelta = {
    delta: +50,
    reason: "Lead referred someone (high-value signal)",
    newScore: Math.min(100, leadContext.leadScore + 50),
  };

  reaction.immediateActions.push({
    type: "call",
    priority: "critical",
    delay: 0,
    message:
      `${leadContext.name}, I just wanted to personally thank you for the referral. ` +
      `That means the world to us, and I wanted to make sure you know how much we appreciate it.`,
  });

  reaction.notifyRep = {
    notify: true,
    message: `${leadContext.name} referred ${referrerName}. CALL TO THANK THEM PERSONALLY. They're a champion.`,
    priority: "urgent",
    actionItems: [
      "Call immediately to thank",
      "Offer referral incentive if available",
      "Make them feel valued",
    ],
  };

  reaction.stageUpdate = {
    newStage: "CHAMPION",
    reason: "Lead is actively referring business",
  };

  reaction.internalNotes.push({
    content: `Lead referred ${referrerName}. This is a champion. Nurture and reward the relationship.`,
    visibility: "team",
  });

  reaction.confidence = 0.98;
  reaction.reasoning = "Referral = champion signal. Personal thanks critical.";

  return reaction;
}

/**
 * Process lead assigned to new rep
 */
function processLeadAssigned(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  const newRepName = event.data.newRepName as string | undefined;
  const oldRepName = event.data.oldRepName as string | undefined;

  reaction.immediateActions.push({
    type: "email",
    priority: "high",
    delay: 1000 * 60 * 5, // 5 minutes
    message:
      `Hi ${leadContext.name}, I wanted to introduce myself. ${newRepName} is taking over your account. ` +
      `I've reviewed our conversations with ${oldRepName} and I'm ready to continue where you left off. ` +
      `Looking forward to working together!`,
  });

  reaction.notifyRep = {
    notify: true,
    message: `You've been assigned ${leadContext.name}. Send warm intro referencing past conversations. Ensure continuity.`,
    priority: "high",
    actionItems: [
      "Send intro email from new rep",
      "Reference past conversations",
      "Re-establish relationship trust",
    ],
  };

  reaction.internalNotes.push({
    content: `Ownership transferred from ${oldRepName} to ${newRepName}. New rep should immediately establish continuity.`,
    visibility: "team",
  });

  reaction.confidence = 0.85;
  reaction.reasoning = "Lead assignment: new rep intro + continuity message critical";

  return reaction;
}

/**
 * Process generic signals (demo visits, job postings, etc.)
 */
function processGenericSignal(
  event: LeadEvent,
  leadContext: LeadContext,
  reaction: EventReaction
): EventReaction {
  switch (event.type) {
    case "demo_page_visit":
      reaction.scoreDelta = { delta: +20, reason: "Lead visited demo page" };
      reaction.delayedActions.push({
        type: "sms",
        delay: 1000 * 60 * 60 * 2,
        templateKey: "demo_followup",
        priority: "normal",
      });
      break;

    case "job_posting_detected":
      // Company hiring = growth signal
      reaction.scoreDelta = {
        delta: +15,
        reason: "Company posted job (growth signal)",
      };
      reaction.immediateActions.push({
        type: "sms",
        priority: "normal",
        delay: 1000 * 60 * 60 * 4,
        message: `Saw ${leadContext.companyName} is hiring! Growth phase often means budget moving. Worth a conversation?`,
      });
      break;

    case "competitor_contract_expiring":
      reaction.scoreDelta = {
        delta: +25,
        reason: "Competitor contract expiring (switching window)",
      };
      reaction.notifyRep = {
        notify: true,
        message: `${leadContext.name}'s competitor contract expiring. Switching window opening. Call to explore.`,
        priority: "high",
        actionItems: ["Call to discuss transition", "Position solution as upgrade"],
      };
      break;

    case "social_mention":
      reaction.scoreDelta = { delta: +5, reason: "Lead mentioned on social" };
      break;

    case "call_attempt_failed":
      reaction.scoreDelta = { delta: 0, reason: "Call failed" };
      reaction.delayedActions.push({
        type: "sms",
        delay: 1000 * 60 * 10,
        templateKey: "call_failed_followup",
        priority: "normal",
      });
      break;

    case "sms_delivery_failed":
      reaction.scoreDelta = { delta: 0, reason: "SMS failed" };
      reaction.delayedActions.push({
        type: "email",
        delay: 1000 * 60 * 30,
        templateKey: "fallback_email",
        priority: "normal",
      });
      break;

    case "campaign_ended":
      reaction.scoreDelta = { delta: 0, reason: "Campaign ended" };
      break;

    case "payment_event":
      reaction.scoreDelta = { delta: +10, reason: "Payment processed" };
      break;
  }

  reaction.confidence = 0.7;
  return reaction;
}

/**
 * Classify event urgency
 */
export function classifyEventUrgency(event: LeadEvent): EventUrgency {
  switch (event.type) {
    case "lead_callback":
    case "form_fill":
      return {
        level: "immediate",
        reason: "Lead initiated high-intent action",
        maxResponseTime: 1000 * 60 * 5, // 5 minutes
        recommendedChannel: "call",
      };

    case "email_reply":
    case "sms_reply":
      return {
        level: "within-hour",
        reason: "Lead engaged in conversation",
        maxResponseTime: 1000 * 60 * 60, // 1 hour
        recommendedChannel: event.type === "email_reply" ? "email" : "sms",
      };

    case "pricing_page_visit":
      return {
        level: "within-hour",
        reason: "Lead comparing pricing (active consideration)",
        maxResponseTime: 1000 * 60 * 60 * 2, // 2 hours
        recommendedChannel: "call",
      };

    case "email_open":
      return {
        level: "same-day",
        reason: "Lead viewed content",
        maxResponseTime: 1000 * 60 * 60 * 24, // 24 hours
        recommendedChannel: "email",
      };

    case "lead_score_changed":
      return {
        level: "next-day",
        reason: "Scoring event (less urgent than lead action)",
        maxResponseTime: 1000 * 60 * 60 * 24, // 24 hours
        recommendedChannel: "email",
      };

    case "referral_received":
    case "demo_page_visit":
    case "job_posting_detected":
    case "competitor_contract_expiring":
      return {
        level: "within-hour",
        reason: "High-signal opportunity event",
        maxResponseTime: 1000 * 60 * 60 * 2,
        recommendedChannel: "sms",
      };

    default:
      return {
        level: "next-week",
        reason: "Standard system event",
        maxResponseTime: 1000 * 60 * 60 * 24 * 7,
        recommendedChannel: "email",
      };
  }
}

/**
 * Build event chain: connect related events into patterns
 */
export function buildEventChain(events: LeadEvent[]): EventChain {
  if (events.length === 0) {
    return {
      chainType: "stalling",
      events: [],
      sentiment: "neutral",
      strength: 0,
      interpretation: "No events",
      recommendedNextStep: "Monitor for activity",
    };
  }

  // Analyze event sequence for patterns
  const hasInbound = events.some((e) =>
    [
      "email_reply",
      "sms_reply",
      "lead_callback",
      "form_fill",
      "pricing_page_visit",
    ].includes(e.type)
  );

  const hasOpens = events.some((e) => e.type === "email_open");
  const hasFailures = events.some((e) =>
    ["email_bounced", "call_attempt_failed", "sms_delivery_failed"].includes(e.type)
  );

  // Determine chain type
  let chainType: EventChainType = "stalling";
  if (hasInbound && hasOpens && !hasFailures) {
    chainType = "heating"; // Engagement escalating
  } else if (hasFailures && !hasInbound) {
    chainType = "cooling"; // Delivery issues, no response
  } else if (hasInbound) {
    chainType = "converting"; // Active engagement
  }

  const strength = Math.min(
    100,
    events.length * 10 + (chainType === "converting" ? 40 : 0)
  );

  return {
    chainType,
    events,
    sentiment: hasInbound ? "positive" : hasFailures ? "negative" : "neutral",
    strength,
    interpretation: `Lead showing ${chainType} pattern. ${events.length} events, primarily ${events[0]?.type || "unknown"}.`,
    recommendedNextStep:
      chainType === "heating"
        ? "Escalate to call, high touch"
        : chainType === "cooling"
          ? "Switch channels, address failures"
          : chainType === "converting"
            ? "Move toward close"
            : "Monitor and nudge",
  };
}

/**
 * Detect reactivation signals for dormant leads
 */
export function detectReactivationSignals(
  events: LeadEvent[],
  dormantSinceDays: number
): ReactivationSignal | null {
  if (events.length === 0 || dormantSinceDays < 7) {
    return null;
  }

  const recentEvent = events[0];
  if (!recentEvent) return null;

  // Any signal of life is a reactivation signal for long-dormant lead
  const isSubtle = [
    "email_open",
    "pricing_page_visit",
    "demo_page_visit",
    "social_mention",
  ].includes(recentEvent.type);

  const isStrong = [
    "email_reply",
    "sms_reply",
    "lead_callback",
    "form_fill",
  ].includes(recentEvent.type);

  if (!isSubtle && !isStrong) {
    return null;
  }

  const strength: ReactivationSignalStrength = isStrong
    ? "strong"
    : dormantSinceDays > 60
      ? "strong"
      : "moderate";

  const urgency: EventUrgencyLevel =
    strength === "strong"
      ? "immediate"
      : dormantSinceDays > 60
        ? "within-hour"
        : "same-day";

  return {
    detected: true,
    strength,
    signalType: recentEvent.type,
    lastSignal: recentEvent,
    recommendedApproach:
      strength === "strong"
        ? "Immediate personal outreach. Lead is showing genuine interest."
        : "Soft re-engagement. Test waters before heavy contact.",
    urgency,
    confidence: strength === "strong" ? 0.9 : strength === "moderate" ? 0.7 : 0.5,
  };
}

/**
 * Calculate event impact on lead understanding
 */
export function calculateEventImpact(
  event: LeadEvent,
  leadContext: LeadContext
): EventImpact {
  let scoreDelta = 0;
  let stageChange: string | null = null;
  let tempShift = 0;
  let confidenceAdjustment = 0;

  switch (event.type) {
    case "form_fill":
    case "referral_received":
      scoreDelta = +35;
      stageChange = "QUALIFIED";
      tempShift = +8;
      confidenceAdjustment = +0.15;
      break;

    case "email_reply":
    case "sms_reply":
    case "lead_callback":
      scoreDelta = +20;
      stageChange = "ENGAGED";
      tempShift = +6;
      confidenceAdjustment = +0.1;
      break;

    case "pricing_page_visit":
      scoreDelta = +15;
      tempShift = +4;
      confidenceAdjustment = +0.08;
      break;

    case "email_open":
      scoreDelta = +5;
      tempShift = +2;
      confidenceAdjustment = +0.03;
      break;

    case "email_bounced":
    case "sms_delivery_failed":
      scoreDelta = -10;
      tempShift = -3;
      confidenceAdjustment = -0.05;
      break;

    case "lead_score_changed":
      // Already handled by score change itself
      confidenceAdjustment = 0.05;
      break;
  }

  return {
    scoreDelta,
    scoreConfidence: 0.8,
    stageChangeRecommended: stageChange,
    relationshipTemperatureShift: tempShift,
    confidenceAdjustment,
    newUnderstanding: `Based on ${event.type}, we now understand this lead is ${scoreDelta > 0 ? "more" : "less"} engaged.`,
  };
}

// ── Compatibility alias for pre-existing routes ──
export const classifyUrgency = classifyEventUrgency;

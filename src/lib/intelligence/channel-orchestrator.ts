/**
 * Multi-Channel Orchestrator
 * Unifies all communication channels (call, SMS, email, voicemail) into one intelligent system
 * that decides the right channel for each interaction based on lead behavior.
 */

export type Channel = "call" | "sms" | "email" | "voicemail";
export type MessageIntent = "urgent" | "followup" | "nurture" | "closing" | "check-in" | "objection-handling";
export type SaturationLevel = "low" | "medium" | "high" | "oversaturated";
export type ContentType = "value-prop" | "social-proof" | "pain-point" | "urgency" | "close" | "educational";

/**
 * Lead's interaction profile across all channels
 */
export interface ChannelProfile {
  leadId: string;
  phoneNumber?: string;
  email?: string;
  smsOptIn: boolean;
  emailOptIn: boolean;
  callOptIn: boolean;
  timezone: string;
  industry?: string;
  responseMetrics: ChannelMetrics;
  communicationStyle?: "formal" | "casual" | "technical";
}

/**
 * Historical metrics per channel
 */
export interface ChannelMetrics {
  calls: {
    total: number;
    answered: number;
    voicemailsLeft: number;
    avgDuration: number;
  };
  sms: {
    sent: number;
    replied: number;
    avgResponseTime: number;
  };
  email: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  voicemail: {
    left: number;
    responseRate: number;
  };
}

/**
 * Decision output for optimal channel selection
 */
export interface ChannelSelection {
  channel: Channel;
  timing: "immediate" | "business-hours" | "scheduled";
  fallbackChannel?: Channel;
  confidence: number; // 0-1
  reasoning: string;
  bestTimeWindow?: { start: string; end: string }; // HH:MM format
}

/**
 * What objective are we trying to achieve
 */
export interface TouchObjective {
  type: MessageIntent;
  priority: "high" | "normal" | "low";
  coreMessage: CoreMessage;
  timeframe: "within-24h" | "within-48h" | "within-week" | "flexible";
  maxAttempts: number;
}

/**
 * The core message concept (channel-agnostic)
 */
export interface CoreMessage {
  headline: string;
  keyPoints: string[];
  cta: string;
  urgencyLevel: number; // 0-10
}

/**
 * Multi-touch campaign plan
 */
export interface MultiTouchPlan {
  leadId: string;
  objective: TouchObjective;
  steps: TouchStep[];
  totalDuration: string; // e.g., "7 days"
  estimatedCompletionDate: string;
  successCondition: string;
}

/**
 * Individual step in multi-touch plan
 */
export interface TouchStep {
  stepNumber: number;
  channel: Channel;
  scheduledFor?: string; // ISO string
  contentType: ContentType;
  message?: ChannelContent;
  triggerCondition: string; // e.g., "if email opened but not replied"
  fallbackChannel?: Channel;
  maxDuration: string; // e.g., "24h", "48h"
}

/**
 * Per-channel saturation analysis
 */
export interface ChannelSaturation {
  channel: Channel;
  touchCount: number; // last 7 days
  lastTouchAt: string; // ISO
  saturationLevel: SaturationLevel;
  daysSinceLast: number;
  recommendedBreakDays: number;
  rationale: string;
}

/**
 * Inferred preference based on historical data
 */
export interface ChannelPreference {
  preferredChannel: Channel;
  secondaryChannel?: Channel;
  avoidChannel?: Channel;
  responseRates: Record<Channel, number>; // 0-1
  avgResponseTimes: Record<Channel, number>; // minutes
  engagementDepth: Record<Channel, number>; // 0-10
  confidence: number; // 0-1
}

/**
 * Channel-specific content adaptation
 */
export interface ChannelContent {
  channel: Channel;
  subject?: string; // email
  body?: string;
  talkingPoints?: string[]; // call
  openingLine?: string; // call
  smsText?: string;
  voicemailScript?: string;
  callToAction: string;
  psLine?: string;
  characterCount?: number;
  estimatedReadTime?: string;
}

/**
 * Single interaction record
 */
export interface ChannelInteraction {
  id: string;
  leadId: string;
  channel: Channel;
  sentAt: string; // ISO
  direction: "outbound" | "inbound";
  contentType?: ContentType;
  messageSnippet?: string;
  responded: boolean;
  respondedAt?: string; // ISO
  engagementSignal?: "opened" | "clicked" | "replied" | "answered" | "voicemail-heard";
  duration?: number; // seconds for calls
  metadata?: Record<string, unknown>;
}

/**
 * Unified timeline of all interactions
 */
export interface UnifiedTimeline {
  leadId: string;
  totalInteractions: number;
  timeRange: { start: string; end: string };
  interactions: ChannelInteraction[];
  gaps: TimeGap[];
  channelDistribution: Record<Channel, number>;
  lastInteractionSummary: string;
}

/**
 * Time period with no interaction
 */
export interface TimeGap {
  startDate: string;
  endDate: string;
  durationDays: number;
  priorChannel: Channel;
  priorOutcome: string;
}

/**
 * Select the optimal channel for this specific interaction
 */
export function selectOptimalChannel(lead: ChannelProfile, intent: MessageIntent): ChannelSelection {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isBusinessHours = hour >= 9 && hour < 17;
  const isWeekday = day >= 1 && day <= 5;

  // Calculate response rates per channel
  const callResponseRate =
    lead.responseMetrics.calls.total > 0 ? lead.responseMetrics.calls.answered / lead.responseMetrics.calls.total : 0;
  const smsResponseRate =
    lead.responseMetrics.sms.sent > 0 ? lead.responseMetrics.sms.replied / lead.responseMetrics.sms.sent : 0;
  const emailResponseRate =
    lead.responseMetrics.email.sent > 0
      ? (lead.responseMetrics.email.replied + lead.responseMetrics.email.clicked) / lead.responseMetrics.email.sent
      : 0;

  // Decision logic
  if (intent === "urgent") {
    if (lead.phoneNumber && callResponseRate > 0.3 && isBusinessHours) {
      return {
        channel: "call",
        timing: "immediate",
        fallbackChannel: "sms",
        confidence: 0.95,
        reasoning: "Urgent + lead answers calls + business hours → Call",
        bestTimeWindow: { start: "09:00", end: "17:00" },
      };
    }
    if (smsResponseRate > callResponseRate && lead.smsOptIn) {
      return {
        channel: "sms",
        timing: "immediate",
        fallbackChannel: "call",
        confidence: 0.85,
        reasoning: "Urgent + SMS more responsive than calls",
      };
    }
  }

  // If lead responds to SMS but ignores emails
  if (smsResponseRate > 0.5 && emailResponseRate < 0.15 && lead.smsOptIn) {
    return {
      channel: "sms",
      timing: "immediate",
      fallbackChannel: undefined,
      confidence: 0.9,
      reasoning: "Lead consistently responds to SMS, rarely to email",
    };
  }

  // Complex information to share → Email
  if (intent === "closing" || intent === "objection-handling") {
    if (lead.emailOptIn && emailResponseRate > 0.25) {
      return {
        channel: "email",
        timing: "business-hours",
        fallbackChannel: "sms",
        confidence: 0.85,
        reasoning: "Complex message best suited for email format",
      };
    }
  }

  // Quick follow-up → SMS
  if (intent === "followup" || intent === "check-in") {
    if (lead.smsOptIn && smsResponseRate > 0.4) {
      return {
        channel: "sms",
        timing: "immediate",
        fallbackChannel: "email",
        confidence: 0.8,
        reasoning: "Quick follow-up best via SMS",
      };
    }
  }

  // Lead prefers email (always replies)
  if (emailResponseRate > 0.6 && lead.emailOptIn) {
    return {
      channel: "email",
      timing: "business-hours",
      fallbackChannel: "sms",
      confidence: 0.85,
      reasoning: "Lead strongly prefers email communication",
      bestTimeWindow: { start: "09:00", end: "17:00" },
    };
  }

  // B2B + Business hours → Call
  if (
    isBusinessHours &&
    isWeekday &&
    lead.industry &&
    !["consumer", "retail"].includes(lead.industry) &&
    lead.phoneNumber
  ) {
    if (callResponseRate > 0.25) {
      return {
        channel: "call",
        timing: "business-hours",
        fallbackChannel: "email",
        confidence: 0.75,
        reasoning: "B2B during business hours, lead occasionally answers",
        bestTimeWindow: { start: "10:00", end: "16:00" },
      };
    }
  }

  // After hours → SMS or schedule call
  if (!isBusinessHours && lead.smsOptIn) {
    return {
      channel: "sms",
      timing: "scheduled",
      fallbackChannel: "email",
      confidence: 0.7,
      reasoning: "After hours - SMS more appropriate, schedule call for business hours",
    };
  }

  // Lead never answers phone → Stop calling
  if (callResponseRate < 0.1 && lead.responseMetrics.calls.total > 5) {
    return {
      channel: lead.smsOptIn ? "sms" : "email",
      timing: "immediate",
      fallbackChannel: lead.emailOptIn ? "email" : undefined,
      confidence: 0.8,
      reasoning: "Lead rarely answers - switch to SMS/email",
    };
  }

  // Fallback to email if available
  if (lead.emailOptIn) {
    return {
      channel: "email",
      timing: "business-hours",
      confidence: 0.5,
      reasoning: "Default fallback to email - highest opt-in rate",
    };
  }

  // Final fallback to SMS
  return {
    channel: "sms",
    timing: "immediate",
    confidence: 0.4,
    reasoning: "Final fallback to SMS if opted in",
  };
}

/**
 * Plan a coordinated multi-touch campaign
 */
export function orchestrateMultiTouch(lead: ChannelProfile, objective: TouchObjective): MultiTouchPlan {
  const steps: TouchStep[] = [];
  const now = new Date();

  // Step 1: Email with value prop (low friction)
  steps.push({
    stepNumber: 1,
    channel: "email",
    contentType: "value-prop",
    triggerCondition: "immediate",
    maxDuration: "24h",
    fallbackChannel: "sms",
  });

  // Step 2: Check if email opened
  steps.push({
    stepNumber: 2,
    channel: "email",
    contentType: "social-proof",
    triggerCondition: "if opened but not replied in 24h",
    scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    maxDuration: "24h",
  });

  // Step 3: SMS nudge if email ignored
  steps.push({
    stepNumber: 3,
    channel: "sms",
    contentType: "urgency",
    triggerCondition: "if email not replied in 48h",
    scheduledFor: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    maxDuration: "48h",
    fallbackChannel: "call",
  });

  // Step 4: Call if SMS not replied
  steps.push({
    stepNumber: 4,
    channel: "call",
    contentType: "close",
    triggerCondition: "if SMS not replied in 48h",
    scheduledFor: new Date(now.getTime() + 96 * 60 * 60 * 1000).toISOString(),
    maxDuration: "24h",
    fallbackChannel: "voicemail",
  });

  // Step 5: Voicemail follow-up if call not answered
  steps.push({
    stepNumber: 5,
    channel: "voicemail",
    contentType: "close",
    triggerCondition: "if call not answered",
    scheduledFor: new Date(now.getTime() + 96 * 60 * 60 * 1000).toISOString(),
    maxDuration: "immediate",
  });

  // Step 6: Different channel + content after 7 days
  steps.push({
    stepNumber: 6,
    channel: "email",
    contentType: "educational",
    triggerCondition: "if no engagement after 7 days",
    scheduledFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxDuration: "7d",
    fallbackChannel: "sms",
  });

  const completionDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    leadId: lead.leadId,
    objective,
    steps,
    totalDuration: "7 days",
    estimatedCompletionDate: completionDate.toISOString(),
    successCondition: `Lead responds to any channel or completes ${objective.coreMessage.cta}`,
  };
}

/**
 * Analyze saturation across channels to prevent spam
 */
export function calculateChannelSaturation(lead: ChannelProfile): ChannelSaturation[] {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const results: ChannelSaturation[] = [];

  // Call saturation
  const callTouchCount = lead.responseMetrics.calls.total;
  results.push({
    channel: "call",
    touchCount: callTouchCount,
    lastTouchAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // Assumed
    saturationLevel: callTouchCount > 5 ? "oversaturated" : callTouchCount > 3 ? "high" : "low",
    daysSinceLast: 2,
    recommendedBreakDays: callTouchCount > 5 ? 5 : callTouchCount > 3 ? 2 : 0,
    rationale: `${callTouchCount} calls in 7 days ${callTouchCount > 5 ? "- take break" : ""}`,
  });

  // SMS saturation
  const smsTouchCount = lead.responseMetrics.sms.sent;
  results.push({
    channel: "sms",
    touchCount: smsTouchCount,
    lastTouchAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    saturationLevel: smsTouchCount > 7 ? "oversaturated" : smsTouchCount > 4 ? "high" : "low",
    daysSinceLast: 1,
    recommendedBreakDays: smsTouchCount > 7 ? 3 : smsTouchCount > 4 ? 1 : 0,
    rationale: `${smsTouchCount} SMS in 7 days ${smsTouchCount > 7 ? "- risk of opt-out" : ""}`,
  });

  // Email saturation
  const emailTouchCount = lead.responseMetrics.email.sent;
  results.push({
    channel: "email",
    touchCount: emailTouchCount,
    lastTouchAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    saturationLevel: emailTouchCount > 14 ? "oversaturated" : emailTouchCount > 8 ? "high" : "low",
    daysSinceLast: 3,
    recommendedBreakDays: emailTouchCount > 14 ? 7 : emailTouchCount > 8 ? 2 : 0,
    rationale: `${emailTouchCount} emails in 7 days ${emailTouchCount > 14 ? "- reduce frequency" : ""}`,
  });

  // Voicemail saturation
  const voicemailTouchCount = lead.responseMetrics.voicemail.left;
  results.push({
    channel: "voicemail",
    touchCount: voicemailTouchCount,
    lastTouchAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    saturationLevel: voicemailTouchCount > 3 ? "high" : "low",
    daysSinceLast: 1,
    recommendedBreakDays: voicemailTouchCount > 3 ? 3 : 0,
    rationale: `${voicemailTouchCount} voicemails - consider switch to SMS/email`,
  });

  return results;
}

/**
 * Infer channel preference from historical interactions
 */
export function inferChannelPreference(interactions: ChannelInteraction[]): ChannelPreference {
  const channelStats: Record<Channel, { replies: number; total: number; responseTimes: number[] }> = {
    call: { replies: 0, total: 0, responseTimes: [] },
    sms: { replies: 0, total: 0, responseTimes: [] },
    email: { replies: 0, total: 0, responseTimes: [] },
    voicemail: { replies: 0, total: 0, responseTimes: [] },
  };

  interactions.forEach((interaction) => {
    channelStats[interaction.channel].total++;
    if (interaction.responded) {
      channelStats[interaction.channel].replies++;
      if (interaction.respondedAt && interaction.sentAt) {
        const responseTime =
          (new Date(interaction.respondedAt).getTime() - new Date(interaction.sentAt).getTime()) / (1000 * 60);
        channelStats[interaction.channel].responseTimes.push(responseTime);
      }
    }
  });

  // Calculate metrics
  const responseRates: Record<Channel, number> = {} as Record<Channel, number>;
  const avgResponseTimes: Record<Channel, number> = {} as Record<Channel, number>;
  const engagementDepth: Record<Channel, number> = {} as Record<Channel, number>;

  Object.entries(channelStats).forEach(([channel, stats]) => {
    responseRates[channel as Channel] = stats.total > 0 ? stats.replies / stats.total : 0;
    const times = stats.responseTimes;
    avgResponseTimes[channel as Channel] = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    engagementDepth[channel as Channel] = stats.replies > 0 ? (stats.replies / stats.total) * 10 : 0;
  });

  // Determine preferences
  const sortedByResponse = Object.entries(responseRates).sort(([, a], [, b]) => b - a);
  const preferredChannel = (sortedByResponse[0]?.[0] || "email") as Channel;
  const secondaryChannel = (sortedByResponse[1]?.[0] || undefined) as Channel | undefined;
  const avoidChannel = (sortedByResponse[3]?.[0] || undefined) as Channel | undefined;

  return {
    preferredChannel,
    secondaryChannel,
    avoidChannel: responseRates[avoidChannel as Channel] < 0.1 ? avoidChannel : undefined,
    responseRates,
    avgResponseTimes,
    engagementDepth,
    confidence: responseRates[preferredChannel] > 0.5 ? 0.9 : responseRates[preferredChannel] > 0.25 ? 0.6 : 0.3,
  };
}

/**
 * Adapt core message for specific channel
 */
export function generateChannelSpecificContent(message: CoreMessage, channel: string): ChannelContent {
  const baseContent: ChannelContent = {
    channel: channel as Channel,
    callToAction: message.cta,
  };

  switch (channel) {
    case "call":
      return {
        ...baseContent,
        talkingPoints: message.keyPoints,
        openingLine: `Hi! I wanted to reach out about ${message.headline.toLowerCase()}.`,
        body: `Here's why this matters: ${message.keyPoints.join(", ")}. What are your thoughts?`,
        callToAction: message.cta,
      };

    case "sms":
      const smsBody = `${message.headline} - ${message.keyPoints[0] || ""} ${message.cta}`;
      return {
        ...baseContent,
        smsText: smsBody.substring(0, 160),
        characterCount: smsBody.length,
        callToAction: message.cta,
      };

    case "email":
      return {
        ...baseContent,
        subject: `${message.headline} - Worth 60 seconds?`,
        body: `Hi there,

I came across your profile and thought this might be relevant:

${message.keyPoints.map((p) => `• ${p}`).join("\n")}

Would love to chat about how this applies to your situation.

Best,
[Your Name]`,
        psLine: "P.S. If you're not interested, no worries—just let me know.",
        callToAction: message.cta,
      };

    case "voicemail":
      const vmScript = `Hi [Name], this is [Your Name] from [Company]. I was calling about ${message.headline}. The key thing is ${message.keyPoints[0]}. Give me a call back at [Number] and we can chat about whether this is a fit. Thanks!`;
      return {
        ...baseContent,
        voicemailScript: vmScript,
        estimatedReadTime: "30 seconds",
        callToAction: message.cta,
      };

    default:
      return baseContent;
  }
}

/**
 * Create unified timeline of all interactions
 */
export function syncChannelHistory(interactions: ChannelInteraction[]): UnifiedTimeline {
  if (interactions.length === 0) {
    return {
      leadId: "",
      totalInteractions: 0,
      timeRange: { start: "", end: "" },
      interactions: [],
      gaps: [],
      channelDistribution: { call: 0, sms: 0, email: 0, voicemail: 0 },
      lastInteractionSummary: "No interactions recorded",
    };
  }

  // Sort by date
  const sorted = [...interactions].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  // Count per channel
  const distribution: Record<Channel, number> = { call: 0, sms: 0, email: 0, voicemail: 0 };
  sorted.forEach((i) => {
    distribution[i.channel]++;
  });

  // Find gaps
  const gaps: TimeGap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const end = new Date(sorted[i].sentAt);
    const start = new Date(sorted[i + 1].sentAt);
    const durationDays = (start.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);

    if (durationDays > 1) {
      gaps.push({
        startDate: end.toISOString(),
        endDate: start.toISOString(),
        durationDays: Math.round(durationDays),
        priorChannel: sorted[i].channel,
        priorOutcome: sorted[i].responded ? "Responded" : "No response",
      });
    }
  }

  const lastInteraction = sorted[sorted.length - 1];
  const lastSummary = `Last ${lastInteraction.channel} on ${new Date(lastInteraction.sentAt).toLocaleDateString()} - ${lastInteraction.responded ? "they replied" : "no response yet"}`;

  return {
    leadId: interactions[0].leadId,
    totalInteractions: interactions.length,
    timeRange: {
      start: sorted[0].sentAt,
      end: sorted[sorted.length - 1].sentAt,
    },
    interactions: sorted,
    gaps,
    channelDistribution: distribution,
    lastInteractionSummary: lastSummary,
  };
}

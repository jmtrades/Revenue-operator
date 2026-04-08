/**
 * Smart Voicemail Drop System
 *
 * When a call goes to voicemail, this system determines the PERFECT voicemail
 * to leave based on complete lead context. Not a generic message — a contextual,
 * personalized message that gets callbacks.
 *
 * Based on: who the lead is, call history, previous conversations, industry,
 * deal stage, and behavioral triggers.
 */

// ─── TYPES ────────────────────────────────────────────────────────

export type DealStage =
  | "prospecting"
  | "qualification"
  | "needs_analysis"
  | "proposal"
  | "negotiation"
  | "decision"
  | "closed_won"
  | "closed_lost";

export type VoicemailTone =
  | "consultative"
  | "urgency"
  | "value_first"
  | "curiosity"
  | "social_proof"
  | "personal"
  | "lightweight";

export type VoicemailStrategyType =
  | "DROP"        // Leave voicemail (most cases)
  | "SKIP"        // Don't leave one (too many attempts or preference)
  | "SMS_INSTEAD" // Send SMS instead (mobile-first preference)
  | "SMS_PLUS_VM" // Send SMS then leave VM (high-value lead)
  | "CALL_BACK";  // Schedule callback instead

export interface VoicemailContext {
  leadName: string;
  company: string;
  industry: string;
  callAttempts: number;
  lastConversationSummary?: string;
  lastConversationDate?: Date;
  demoCompleted?: boolean;
  demoFeedback?: string;
  dealStage: DealStage;
  triggerEvent?: string; // "changed_role", "company_news", "industry_trend", etc.
  leadScore?: number;
  hasPhonePreference?: boolean;
  hasTextPreference?: boolean;
  mobileNumber?: string;
  timezone?: string;
  previousVoicemailResponses?: number;
}

export interface VoicemailScript {
  /** The actual voicemail text to read */
  text: string;
  /** Target duration in seconds */
  targetDuration: number;
  /** Tone of voice for delivery */
  tone: VoicemailTone;
  /** Hook that creates callback motivation */
  callbackHook: string;
  /** Why this approach was chosen */
  reasoning: string;
  /** A/B test variant identifier */
  variant?: "base" | "short" | "question" | "urgency" | "social_proof";
}

export interface VoicemailStrategy {
  strategy: VoicemailStrategyType;
  /** Human-readable reasoning */
  reasoning: string;
  /** Script if voice VM is being left */
  script?: VoicemailScript;
  /** SMS fallback if needed */
  smsMessage?: string;
  /** Suggested time window to retry (hours) */
  retryWindowHours?: number;
  /** Whether to include callback link/number */
  includeCallback: boolean;
}

export interface VoicemailHistory {
  date: Date;
  script: VoicemailScript;
  callbackReceived: boolean;
  daysToCallback?: number;
  emailResponse?: boolean;
}

export interface VoicemailInsights {
  optimalLength: number; // seconds
  bestTimeOfDay: "morning" | "afternoon" | "evening";
  maxVoicemails: number; // before giving up
  topPerformingApproach: VoicemailTone;
  estimatedCallbackRate: number; // 0-100%
  reasoning: string;
}

// ─── MAIN FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Generate contextual voicemail script based on lead state and history.
 */
export function generateVoicemailScript(
  leadContext: VoicemailContext
): VoicemailScript {
  // ── Determine voicemail type based on stage ──
  if (leadContext.callAttempts === 0) {
    return generateFirstContactScript(leadContext);
  }

  if (leadContext.lastConversationSummary && leadContext.demoCompleted) {
    return generatePostDemoScript(leadContext);
  }

  if (leadContext.lastConversationSummary) {
    return generateAfterConversationScript(leadContext);
  }

  if (leadContext.triggerEvent) {
    return generateReEngagementScript(leadContext);
  }

  if (leadContext.callAttempts >= 2 && !leadContext.previousVoicemailResponses) {
    return generateReActivationScript(leadContext);
  }

  // Default: value-first approach
  return generateValueFirstScript(leadContext);
}

/**
 * Determine optimal strategy: Drop VM, Skip, SMS, or SMS+VM.
 */
export function selectVoicemailStrategy(
  leadContext: VoicemailContext
): VoicemailStrategy {
  // Gate 1: Already left 3+ with no callback → Skip or SMS instead
  if (
    leadContext.callAttempts >= 3 &&
    (!leadContext.previousVoicemailResponses || leadContext.previousVoicemailResponses === 0)
  ) {
    if (leadContext.mobileNumber && leadContext.hasTextPreference) {
      return {
        strategy: "SMS_INSTEAD",
        reasoning: "Lead has expressed text preference and hasn't responded to voicemails",
        smsMessage: generateSMSFollowUp(leadContext),
        includeCallback: true,
      };
    }

    if (leadContext.callAttempts >= 5) {
      return {
        strategy: "SKIP",
        reasoning:
          "5+ voicemail attempts without response. Risk of over-pursuit. Pause campaign.",
        includeCallback: false,
      };
    }
  }

  // Gate 2: High-value prospect (score 80+, early stage) → SMS + VM
  if (
    leadContext.leadScore &&
    leadContext.leadScore >= 80 &&
    leadContext.dealStage === "prospecting"
  ) {
    return {
      strategy: "SMS_PLUS_VM",
      reasoning: "High-value lead at early stage. Multi-touch approach to capture attention.",
      smsMessage: generateSMSFollowUp(leadContext),
      script: generateVoicemailScript(leadContext),
      retryWindowHours: 4,
      includeCallback: true,
    };
  }

  // Gate 3: Text preference → SMS instead
  if (leadContext.hasTextPreference && leadContext.mobileNumber) {
    return {
      strategy: "SMS_INSTEAD",
      reasoning: "Lead preference for text communication",
      smsMessage: generateSMSFollowUp(leadContext),
      retryWindowHours: 8,
      includeCallback: true,
    };
  }

  // Gate 4: Standard case → Drop voicemail
  return {
    strategy: "DROP",
    reasoning: "Standard outreach. Voicemail creates personal connection and callback urgency.",
    script: generateVoicemailScript(leadContext),
    retryWindowHours: 24,
    includeCallback: true,
  };
}

/**
 * Generate contextual SMS follow-up (when VM/SMS combo is used).
 */
export function generateSMSFollowUp(leadContext: VoicemailContext): string {
  const reason = getCallReason(leadContext);
  const name = leadContext.leadName.split(" ")[0];

  // Aim for under 160 characters when possible
  if (leadContext.callAttempts <= 1) {
    // First attempt
    return `Hi ${name}, just tried calling about ${reason}. Happy to chat whenever works — no pressure. Let me know!`;
  }

  if (leadContext.triggerEvent) {
    return `${name}, noticed ${leadContext.triggerEvent} — thought of you. Quick call to reconnect?`;
  }

  if (leadContext.dealStage === "proposal") {
    return `Hey ${name}, checking in on our proposal. Any questions? I'm here to help.`;
  }

  // Default: lightweight re-engagement
  return `Hi ${name}, trying to catch up. Have a quick moment? Just want to see if timing works now.`;
}

/**
 * Analyze voicemail history to recommend optimal approach for this lead.
 */
export function trackVoicemailEffectiveness(
  history: VoicemailHistory[]
): VoicemailInsights {
  if (history.length === 0) {
    return {
      optimalLength: 18,
      bestTimeOfDay: "morning",
      maxVoicemails: 3,
      topPerformingApproach: "value_first",
      estimatedCallbackRate: 25,
      reasoning: "No history. Using industry defaults.",
    };
  }

  // Calculate which lengths got callbacks
  const withCallbacks = history.filter((h) => h.callbackReceived);
  const avgLengthWithCallback =
    withCallbacks.length > 0
      ? Math.round(
          withCallbacks.reduce((sum, h) => sum + h.script.targetDuration, 0) /
            withCallbacks.length
        )
      : 18;

  // Which tones performed best?
  const tonePerformance = new Map<VoicemailTone, { attempts: number; callbacks: number }>();
  history.forEach((h) => {
    const tone = h.script.tone;
    const current = tonePerformance.get(tone) || { attempts: 0, callbacks: 0 };
    current.attempts++;
    if (h.callbackReceived) current.callbacks++;
    tonePerformance.set(tone, current);
  });

  let topTone: VoicemailTone = "value_first";
  let bestRate = 0;
  tonePerformance.forEach((perf, tone) => {
    const rate = perf.callbacks / perf.attempts;
    if (rate > bestRate) {
      bestRate = rate;
      topTone = tone;
    }
  });

  const callbackRate = Math.round((withCallbacks.length / history.length) * 100);

  return {
    optimalLength: avgLengthWithCallback,
    bestTimeOfDay: "morning", // Real implementation would analyze call times
    maxVoicemails: history.length <= 2 ? 3 : 2,
    topPerformingApproach: topTone,
    estimatedCallbackRate: Math.min(callbackRate * 1.2, 100), // Slight optimism adjustment
    reasoning: `${withCallbacks.length}/${history.length} voicemails got callbacks. Optimal length ~${avgLengthWithCallback}s. Tone "${topTone}" performs best.`,
  };
}

/**
 * Generate voicemail variations for A/B testing.
 */
export function generateVoicemailVariations(
  baseScript: VoicemailScript,
  count: number = 3
): VoicemailScript[] {
  const variations: VoicemailScript[] = [baseScript];

  if (count >= 2) {
    // Shorter version (15 seconds)
    variations.push({
      ...baseScript,
      text: baseScript.text.split(".").slice(0, 2).join("."),
      targetDuration: 15,
      variant: "short",
      reasoning: "A/B: Shorter hook for attention",
    });
  }

  if (count >= 3) {
    // Question-based version
    variations.push({
      ...baseScript,
      text: `Hi ${baseScript.text.split("Hi ")[1]?.split(".")[0]}. Quick question — are you open to exploring [benefit]? Call me back at [number].`,
      tone: "curiosity",
      variant: "question",
      reasoning: "A/B: Question-format increases engagement",
    });
  }

  if (count >= 4) {
    // Urgency version
    variations.push({
      ...baseScript,
      text: baseScript.text.replace(
        /\./g,
        ". This is time-sensitive, so I wanted to reach you directly."
      ),
      tone: "urgency",
      variant: "urgency",
      reasoning: "A/B: Time sensitivity increases callback intent",
    });
  }

  if (count >= 5) {
    // Social proof version
    variations.push({
      ...baseScript,
      text: `Hi, I've been working with companies like [similar company] in your space, and I thought you'd find this valuable. Let me know when you're free.`,
      tone: "social_proof",
      variant: "social_proof",
      reasoning: "A/B: Social proof builds credibility",
    });
  }

  return variations.slice(0, count);
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────

function generateFirstContactScript(ctx: VoicemailContext): VoicemailScript {
  const hook = `I noticed [industry insight] affecting ${ctx.company}, and I think we can help.`;
  const text = `Hi ${ctx.leadName}, this is [Your Name] with [Company]. ${hook} I'll send over a quick 2-minute overview — no pressure, just wanted to reach out. Call me back at [number] if it makes sense.`;

  return {
    text,
    targetDuration: 18,
    tone: "value_first",
    callbackHook: hook,
    reasoning:
      "First contact: Value-first, curiosity hook, short (under 20s). Sets tone for relationship.",
  };
}

function generatePostDemoScript(ctx: VoicemailContext): VoicemailScript {
  const feature = ctx.demoFeedback || "the feature you were interested in";
  const text = `Hi ${ctx.leadName}, thanks again for the demo earlier. You seemed really interested in ${feature}, and I wanted to follow up while it was fresh. Let's find a time this week to dive deeper. Call me back when you get a chance.`;

  return {
    text,
    targetDuration: 20,
    tone: "personal",
    callbackHook: `Reference specific feature they engaged with during demo`,
    reasoning:
      "Post-demo: Reference what they liked, create urgency, ask for next step. Personal touch.",
  };
}

function generateAfterConversationScript(ctx: VoicemailContext): VoicemailScript {
  const lastTopic = ctx.lastConversationSummary ? ctx.lastConversationSummary.split(",")[0] || "our conversation" : "our conversation";
  const text = `Hi ${ctx.leadName}, following up on ${lastTopic} that we discussed. I have a few ideas that might address what you mentioned. Let's set up 15 minutes this week. Call me back at [number].`;

  return {
    text,
    targetDuration: 16,
    tone: "consultative",
    callbackHook: `Directly reference previous discussion topic`,
    reasoning:
      "After conversation: Reference specific topic, solutions-oriented, time-bound CTA.",
  };
}

function generateReEngagementScript(ctx: VoicemailContext): VoicemailScript {
  const event = ctx.triggerEvent || "something interesting in your space";
  const text = `Hi ${ctx.leadName}, I noticed ${event} at ${ctx.company}, and it made me think of our conversation. Thought you'd find this relevant. Let me know if you want to chat. [number].`;

  return {
    text,
    targetDuration: 17,
    tone: "lightweight",
    callbackHook: `Acknowledge the trigger event — shows attentiveness`,
    reasoning:
      "Re-engagement: Lightweight, non-pushy, open-ended. Trigger event proves personalization.",
  };
}

function generateReActivationScript(ctx: VoicemailContext): VoicemailScript {
  const text = `Hi ${ctx.leadName}, it's been a bit since we last connected. Things have changed on our side, and I think the timing might be better now. No pressure — just wanted to reconnect. Call me when you have a moment.`;

  return {
    text,
    targetDuration: 18,
    tone: "lightweight",
    callbackHook: `Acknowledge silence without guilt-tripping`,
    reasoning:
      "After dark period: Lightweight, opens door without pressure. Reframes as positive development.",
  };
}

function generateValueFirstScript(ctx: VoicemailContext): VoicemailScript {
  const benefit = getIndustryBenefit(ctx.industry);
  const text = `Hi ${ctx.leadName}, I work with ${ctx.industry} companies on ${benefit}. Thought ${ctx.company} might benefit from a quick conversation. I'll send over some resources. Let me know if it's worth a chat.`;

  return {
    text,
    targetDuration: 19,
    tone: "value_first",
    callbackHook: `Lead with value, not ask`,
    reasoning: "Default approach: Value-first, industry-relevant, sets expectation low.",
  };
}

function getCallReason(ctx: VoicemailContext): string {
  if (ctx.triggerEvent) return ctx.triggerEvent;
  if (ctx.dealStage === "proposal") return "your proposal";
  if (ctx.demoCompleted) return "the demo";
  if (ctx.lastConversationSummary)
    return ctx.lastConversationSummary.split(",")[0] || "our conversation";
  return `ways to help ${ctx.company}`;
}

function getIndustryBenefit(industry: string): string {
  const benefits: Record<string, string> = {
    technology: "scaling operations and reducing cost",
    healthcare: "patient engagement and compliance",
    finance: "risk management and automation",
    ecommerce: "conversion optimization and retention",
    manufacturing: "supply chain efficiency",
    saas: "customer retention and expansion revenue",
  };
  return benefits[industry.toLowerCase()] || "improving efficiency and revenue";
}

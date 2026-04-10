/**
 * Auto-Follow-Up Engine
 * AI engine that automatically determines the next best action for every lead.
 * No human decision-making required. Determines WHAT, WHEN, and HOW (channel + message).
 *
 * Pure functions — deterministic, testable, no side effects.
 */

/**
 * Lead state snapshot for decision-making.
 */
export interface LeadState {
  lead_id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  current_stage: "new" | "contacted" | "engaged" | "qualified" | "booked" | "showed" | "won" | "lost" | "reactivate";
  last_interaction: string | null; // ISO timestamp
  engagement_score: number; // 0-100
  lead_score: number; // 0-100
  total_touches: number;
  touches_this_week: number;
  days_since_last_contact: number;
  response_rate: number; // 0-1
  opened_emails: number;
  clicked_links: number;
  callback_requested: boolean;
  callback_requested_time: string | null; // ISO timestamp
  pricing_interest_signals: number; // 0=none, 1=mentioned, 2=asked, 3=requested proposal
  showed_for_demo: boolean;
  demo_date: string | null; // ISO timestamp
  last_demo_outcome: "no_show" | "attended" | "positive_feedback" | "objection" | null;
  objection_type: "price" | "timing" | "need" | "competitor" | null;
  is_from_competitor: boolean;
  industry: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Context for making follow-up decisions.
 */
export interface ActionContext {
  workspace_id: string;
  current_time: string; // ISO timestamp
  timezone: string;
  working_hours_start: number; // 0-23
  working_hours_end: number; // 0-23
  working_days: number[]; // 0=Sun, 1=Mon, etc.
  autonomy_level: "observe" | "suggest" | "assisted" | "auto";
  max_touches_per_week: number;
  cool_down_hours_after_high_engagement: number;
}

/**
 * Decision output: what to do, when to do it, and how.
 */
export interface NextAction {
  action: "call" | "sms" | "email" | "wait" | "escalate" | "disqualify";
  channel: "voice" | "sms" | "email" | "system";
  timing: "immediate" | "1_hour" | "2_hours" | "4_hours" | "24_hours" | "2_days" | "7_days" | "manual";
  timing_minutes: number; // Absolute minutes from now
  reason: string;
  message_template: string; // Template key or inline message
  priority: number; // 1-10, where 10 is highest
  confidence: number; // 0-1
  estimated_value_impact: number; // Expected revenue impact in cents
}

/**
 * Channel-appropriate follow-up message.
 */
export interface FollowUpMessage {
  channel: "sms" | "email" | "call" | "voicemail";
  subject?: string; // For emails
  body: string;
  call_script?: string; // For calls/voicemail
  personalization: {
    first_name: string | null;
    company: string | null;
    last_interaction: string | null;
    industry_context?: string;
  };
  tone: "enthusiastic" | "consultative" | "value_first" | "urgent" | "recovery";
  estimated_read_time_seconds: number;
}

/**
 * Action capacity constraints.
 */
export interface ActionCapacity {
  agent_available_minutes: number;
  leads_pending_action: number;
  estimated_minutes_per_call: number;
  estimated_minutes_per_email: number;
  estimated_minutes_per_sms: number;
}

/**
 * Prioritized queue of actions.
 */
export interface PrioritizedQueue {
  actions: Array<{
    lead_id: string;
    action: NextAction;
    estimated_minutes_to_complete: number;
    revenue_impact_cents: number;
    position_in_queue: number;
  }>;
  total_estimated_minutes: number;
  can_complete_all: boolean;
  recommendation: string;
}

/**
 * Signal indicating a lead is ready to re-engage.
 */
export interface ReEngagementSignal {
  detected: boolean;
  signal_type:
    | "website_revisit"
    | "email_reopen"
    | "social_mention"
    | "competitor_contract_expiring"
    | "industry_event"
    | "time_elapsed";
  confidence: number; // 0-1
  recommended_approach: "angle_shift" | "value_reminder" | "competitive_threat" | "time_trigger";
  reason: string;
  suggested_message_theme: string;
}

/**
 * Fatigue scoring to prevent over-contact.
 */
export interface FatigueScore {
  fatigue_level: "low" | "medium" | "high" | "critical";
  score: number; // 0-100
  touches_per_week: number;
  response_rate: number; // 0-1
  recommended_cooldown_hours: number;
  max_touches_remaining: number;
  reason: string;
}

/**
 * Decision Matrix for determining next best action.
 * Pure function — no side effects, deterministic.
 *
 * Priority rules (in order):
 * 1. Callback requested → call at requested time
 * 2. Hot lead + no contact in <1hr → immediate call
 * 3. Pricing interest high + no email in 24h → send value prop email
 * 4. Demo prep → send prep info
 * 5. Demo happened + objection → send objection handling content
 * 6. Warm lead + opened email → SMS follow-up in 2h
 * 7. Cold lead + 3+ touches no response → switch channel
 * 8. Lead went dark after demo → re-engagement sequence
 * 9. Otherwise wait or nurture with value
 */
export function determineNextBestAction(lead: LeadState, context: ActionContext): NextAction {
  // Rule 1: Callback requested
  if (lead.callback_requested && lead.callback_requested_time) {
    const callbackTime = new Date(lead.callback_requested_time);
    const now = new Date(context.current_time);
    const minutesUntilCallback = Math.floor((callbackTime.getTime() - now.getTime()) / 60000);
    const isTimeToCall = minutesUntilCallback <= 60 && minutesUntilCallback > -30; // Call 1h before or up to 30m after

    if (isTimeToCall) {
      return {
        action: "call",
        channel: "voice",
        timing: "immediate",
        timing_minutes: 0,
        reason: "Callback requested by lead at specified time",
        message_template: "callback_confirmation_call",
        priority: 10,
        confidence: 0.95,
        estimated_value_impact: lead.lead_score * 1000,
      };
    } else if (minutesUntilCallback > 0) {
      return {
        action: "wait",
        channel: "system",
        timing: minutesUntilCallback > 1440 ? "manual" : "immediate",
        timing_minutes: Math.min(minutesUntilCallback, 1440),
        reason: `Waiting for callback requested time: ${lead.callback_requested_time}`,
        message_template: "system_callback_wait",
        priority: 9,
        confidence: 1.0,
        estimated_value_impact: 0,
      };
    }
  }

  // Rule 2: Hot lead + no contact in <1hr
  if (lead.lead_score >= 80 && lead.engagement_score >= 75 && lead.days_since_last_contact < 1) {
    return {
      action: "call",
      channel: "voice",
      timing: "immediate",
      timing_minutes: 0,
      reason: `Hot lead (score ${lead.lead_score}) with high engagement (${lead.engagement_score}) needs immediate contact`,
      message_template: "hot_lead_direct_call",
      priority: 10,
      confidence: 0.9,
      estimated_value_impact: Math.floor(lead.lead_score * lead.engagement_score * 100),
    };
  }

  // Rule 3: Pricing interest high + no email sent recently
  if (
    lead.pricing_interest_signals >= 2 &&
    (lead.days_since_last_contact > 0.25 || lead.current_stage === "qualified")
  ) {
    return {
      action: "email",
      channel: "email",
      timing: "immediate",
      timing_minutes: 0,
      reason: `Lead showed pricing interest (signal level ${lead.pricing_interest_signals}). Send value prop email immediately.`,
      message_template: "value_proposition_pricing_email",
      priority: 9,
      confidence: 0.85,
      estimated_value_impact: Math.floor(lead.lead_score * 500),
    };
  }

  // Rule 4: Demo prep (booked stage)
  if (lead.current_stage === "booked" && lead.demo_date) {
    const demoDate = new Date(lead.demo_date);
    const now = new Date(context.current_time);
    const hoursUntilDemo = (demoDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDemo > 0 && hoursUntilDemo <= 24) {
      return {
        action: "email",
        channel: "email",
        timing: hoursUntilDemo > 4 ? "4_hours" : "immediate",
        timing_minutes: Math.max(0, Math.floor(hoursUntilDemo * 60 - 240)),
        reason: `Demo scheduled in ${Math.floor(hoursUntilDemo)} hours. Send prep materials.`,
        message_template: "demo_prep_email",
        priority: 8,
        confidence: 0.95,
        estimated_value_impact: lead.lead_score * 1000,
      };
    }
  }

  // Rule 5: Demo happened with objection
  if (lead.current_stage === "showed" && lead.last_demo_outcome === "objection" && lead.objection_type) {
    const objectHandler: Record<string, string> = {
      price: "objection_price_roi_case_study",
      timing: "objection_timing_flexibility",
      need: "objection_need_discovery",
      competitor: "objection_competitor_comparison",
    };
    const template = objectHandler[lead.objection_type] || "objection_handling_discovery";

    return {
      action: "email",
      channel: "email",
      timing: "24_hours",
      timing_minutes: 24 * 60,
      reason: `Lead raised ${lead.objection_type} objection during demo. Send objection handling content in 24h.`,
      message_template: template,
      priority: 8,
      confidence: 0.8,
      estimated_value_impact: Math.floor(lead.lead_score * 800),
    };
  }

  // Rule 6: Warm lead + opened email → SMS follow-up
  if (
    lead.engagement_score >= 60 &&
    lead.engagement_score < 75 &&
    lead.opened_emails > 0 &&
    lead.days_since_last_contact > 0.08 // ~2 hours
  ) {
    return {
      action: "sms",
      channel: "sms",
      timing: "2_hours",
      timing_minutes: 120,
      reason: `Warm lead opened email (${lead.opened_emails} opens). SMS follow-up in 2h to maintain momentum.`,
      message_template: "warm_sms_followup",
      priority: 7,
      confidence: 0.75,
      estimated_value_impact: Math.floor(lead.lead_score * 400),
    };
  }

  // Rule 7: Cold lead + 3+ touches no response → switch channel
  if (
    lead.current_stage === "contacted" &&
    lead.engagement_score < 40 &&
    lead.total_touches >= 3 &&
    lead.response_rate === 0 &&
    lead.days_since_last_contact >= 1
  ) {
    // If we've been emailing, switch to SMS. If SMS, switch to call.
    const lastChannel = lead.metadata?.last_channel as string | undefined;
    const shouldSwitch = lastChannel === "email" || lastChannel === "sms";

    if (shouldSwitch) {
      const nextChannel = lastChannel === "email" ? "sms" : "voice";
      const action = nextChannel === "sms" ? ("sms" as const) : ("call" as const);

      return {
        action,
        channel: nextChannel === "sms" ? "sms" : "voice",
        timing: "24_hours",
        timing_minutes: 24 * 60,
        reason: `Cold lead with ${lead.total_touches} touches and no response. Switching from ${lastChannel} to ${nextChannel}.`,
        message_template: `channel_switch_${nextChannel}`,
        priority: 5,
        confidence: 0.65,
        estimated_value_impact: Math.floor(lead.lead_score * 200),
      };
    }
  }

  // Rule 8: Lead went dark after demo
  if (lead.current_stage === "showed" && lead.days_since_last_contact >= 3 && lead.demo_date) {
    return {
      action: "email",
      channel: "email",
      timing: "24_hours",
      timing_minutes: 24 * 60,
      reason: `Lead went dark ${Math.floor(lead.days_since_last_contact)} days after demo. Re-engagement needed.`,
      message_template: "demo_dark_reengagement",
      priority: 7,
      confidence: 0.7,
      estimated_value_impact: Math.floor(lead.lead_score * 600),
    };
  }

  // Rule 9: Escalate if needed (high-risk signals)
  if (lead.metadata?.escalation_flag === true) {
    return {
      action: "escalate",
      channel: "system",
      timing: "immediate",
      timing_minutes: 0,
      reason: "Lead flagged for escalation. Route to human decision-maker.",
      message_template: "escalation_handoff",
      priority: 10,
      confidence: 0.9,
      estimated_value_impact: 0,
    };
  }

  // Rule 10: Disqualify if fatigue is critical or no viable path
  const fatigue = calculateFollowUpFatigue(lead);
  if (fatigue.fatigue_level === "critical") {
    return {
      action: "disqualify",
      channel: "system",
      timing: "manual",
      timing_minutes: 0,
      reason: `Follow-up fatigue critical. ${fatigue.reason}. Recommend pausing or moving to low-touch nurture.`,
      message_template: "disqualify_fatigue",
      priority: 1,
      confidence: 0.8,
      estimated_value_impact: 0,
    };
  }

  // Default: Wait and nurture with value
  return {
    action: "wait",
    channel: "system",
    timing: "7_days",
    timing_minutes: 7 * 24 * 60,
    reason: `Lead not matching high-priority criteria. Schedule value-first nurture in 7 days.`,
    message_template: "value_nurture_default",
    priority: 3,
    confidence: 0.6,
    estimated_value_impact: 0,
  };
}

/**
 * Generate channel-appropriate follow-up message.
 * Personalizes with lead context and tone matching engagement level.
 */
export function generateFollowUpMessage(action: NextAction, lead: LeadState): FollowUpMessage {
  const firstName = lead.name?.split(" ")[0] || "there";
  const industryContext = lead.industry ? ` in ${lead.industry}` : "";

  // Determine tone based on engagement and action
  let tone: FollowUpMessage["tone"] = "consultative";
  if (action.priority >= 9) tone = "urgent";
  else if (lead.engagement_score >= 75) tone = "enthusiastic";
  else if (lead.engagement_score < 40) tone = "value_first";
  else if (action.message_template.includes("objection")) tone = "recovery";

  // Build personalized body
  let body = "";
  let subject = "";
  let callScript = "";

  if (action.channel === "email") {
    subject = generateEmailSubject(action.message_template, lead);
    body = generateEmailBody(action.message_template, firstName, lead);
  } else if (action.channel === "sms") {
    body = generateSMSBody(action.message_template, firstName, lead);
  } else if (action.channel === "voice") {
    callScript = generateCallScript(action.message_template, firstName, lead);
  }

  return {
    channel: action.channel === "voice" ? "call" : (action.channel as "sms" | "email"),
    subject,
    body,
    call_script: callScript,
    personalization: {
      first_name: firstName,
      company: lead.company,
      last_interaction: lead.last_interaction,
      industry_context: industryContext,
    },
    tone,
    estimated_read_time_seconds: action.channel === "sms" ? 5 : action.channel === "email" ? 30 : 0,
  };
}

/**
 * Prioritize action queue by revenue impact and urgency.
 */
export function prioritizeActionQueue(leads: LeadState[], capacity: ActionCapacity): PrioritizedQueue {
  const actions = leads
    .map((lead) => {
      const action = determineNextBestAction(lead, {
        workspace_id: "",
        current_time: new Date().toISOString(),
        timezone: "UTC",
        working_hours_start: 9,
        working_hours_end: 17,
        working_days: [1, 2, 3, 4, 5],
        autonomy_level: "auto",
        max_touches_per_week: 3,
        cool_down_hours_after_high_engagement: 2,
      });

      const minutesToComplete =
        action.channel === "voice"
          ? capacity.estimated_minutes_per_call
          : action.channel === "sms"
            ? capacity.estimated_minutes_per_sms
            : capacity.estimated_minutes_per_email;

      return {
        lead_id: lead.lead_id,
        action,
        estimated_minutes_to_complete: minutesToComplete,
        revenue_impact_cents: action.estimated_value_impact,
        position_in_queue: 0, // Will be set after sorting
      };
    })
    .filter((a) => a.action.action !== "wait" && a.action.action !== "disqualify")
    .sort((a, b) => {
      // Sort by priority score: (priority + revenue impact) / time
      const scoreA = (a.action.priority * 10 + a.revenue_impact_cents / 100) / a.estimated_minutes_to_complete;
      const scoreB = (b.action.priority * 10 + b.revenue_impact_cents / 100) / b.estimated_minutes_to_complete;
      return scoreB - scoreA;
    })
    .map((action, idx) => ({
      ...action,
      position_in_queue: idx + 1,
    }));

  const totalEstimatedMinutes = actions.reduce((sum, a) => sum + a.estimated_minutes_to_complete, 0);
  const canCompleteAll = totalEstimatedMinutes <= capacity.agent_available_minutes;

  return {
    actions,
    total_estimated_minutes: totalEstimatedMinutes,
    can_complete_all: canCompleteAll,
    recommendation: canCompleteAll
      ? "All queued actions can be completed in available time."
      : `Can complete first ${Math.floor(capacity.agent_available_minutes / (totalEstimatedMinutes / actions.length))} of ${actions.length} actions.`,
  };
}

/**
 * Detect re-engagement opportunities for cold leads.
 */
export function detectReEngagementOpportunity(lead: LeadState): ReEngagementSignal | null {
  // No signal if lead is already hot or recently engaged
  if (lead.engagement_score >= 60 || lead.days_since_last_contact < 3) {
    return null;
  }

  // Check for re-engagement signals
  const websiteRevisit = (lead.metadata?.website_visits_last_7_days as number | undefined) || 0;
  const emailReopens = (lead.metadata?.email_reopens_last_7_days as number | undefined) || 0;
  const socialMention = (lead.metadata?.social_mention_last_30_days as boolean | undefined) || false;
  const competitorContractExpiring = (lead.metadata?.competitor_contract_expires_in_days as number | undefined) || null;
  const lastEngagementDays = lead.days_since_last_contact;

  if (websiteRevisit > 2) {
    return {
      detected: true,
      signal_type: "website_revisit",
      confidence: Math.min(websiteRevisit / 5, 1.0),
      recommended_approach: "angle_shift",
      reason: `Lead revisited website ${websiteRevisit} times in last 7 days. Show new use case or angle.`,
      suggested_message_theme: "New capability aligned to their industry",
    };
  }

  if (emailReopens > 1) {
    return {
      detected: true,
      signal_type: "email_reopen",
      confidence: 0.7,
      recommended_approach: "value_reminder",
      reason: `Lead re-opened previous email ${emailReopens} times. Interest may be rekindling.`,
      suggested_message_theme: "Value reminder with new insights",
    };
  }

  if (socialMention) {
    return {
      detected: true,
      signal_type: "social_mention",
      confidence: 0.6,
      recommended_approach: "value_reminder",
      reason: `Lead mentioned on social media recently. Show ongoing relevance.`,
      suggested_message_theme: "Industry insight or case study",
    };
  }

  if (
    competitorContractExpiring &&
    competitorContractExpiring > 0 &&
    competitorContractExpiring <= 60 &&
    lead.is_from_competitor
  ) {
    return {
      detected: true,
      signal_type: "competitor_contract_expiring",
      confidence: 0.85,
      recommended_approach: "competitive_threat",
      reason: `Competitor contract expires in ${competitorContractExpiring} days. Perfect re-engagement window.`,
      suggested_message_theme: "Competitive advantage and timeline alignment",
    };
  }

  if (lastEngagementDays >= 30 && lastEngagementDays <= 60) {
    return {
      detected: true,
      signal_type: "time_elapsed",
      confidence: 0.5,
      recommended_approach: "angle_shift",
      reason: `${Math.floor(lastEngagementDays)} days since last contact. Enough time for market/situation change.`,
      suggested_message_theme: "What's changed in your world",
    };
  }

  return null;
}

/**
 * Calculate follow-up fatigue to prevent over-contacting.
 */
export function calculateFollowUpFatigue(lead: LeadState): FatigueScore {
  const responseRate = lead.response_rate || 0;
  const touchesPerWeek = lead.touches_this_week;
  const totalTouches = lead.total_touches;

  let score = 0;
  let reason = "";

  // Touches per week (max 100 points)
  if (touchesPerWeek >= 5) {
    score += 100;
    reason += "Excessive touches this week (5+). ";
  } else if (touchesPerWeek >= 4) {
    score += 80;
    reason += "Very high touch frequency (4). ";
  } else if (touchesPerWeek >= 3) {
    score += 50;
    reason += "High touch frequency (3). ";
  }

  // Response rate (lower = more fatigued)
  if (totalTouches >= 3 && responseRate === 0) {
    score += 40;
    reason += "No response despite 3+ touches. ";
  } else if (totalTouches >= 5 && responseRate < 0.2) {
    score += 50;
    reason += "Very low response rate (<20%) on 5+ touches. ";
  }

  // Channel variety (lack of = fatigue)
  const channelsUsed = [
    lead.email && lead.email.length > 0 ? 1 : 0,
    lead.phone && lead.phone.length > 0 ? 1 : 0,
    lead.metadata?.sms_sent ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  if (channelsUsed < 2 && touchesPerWeek >= 3) {
    score += 20;
    reason += "Limited channel diversity despite high frequency. ";
  }

  // Determine fatigue level
  let fatigue_level: FatigueScore["fatigue_level"] = "low";
  if (score >= 80) {
    fatigue_level = "critical";
  } else if (score >= 60) {
    fatigue_level = "high";
  } else if (score >= 30) {
    fatigue_level = "medium";
  }

  // Calculate cooldown and remaining touches
  const recommended_cooldown_hours = Math.ceil(score / 20);
  const max_touches_remaining = Math.max(0, 5 - totalTouches);

  return {
    fatigue_level,
    score,
    touches_per_week: touchesPerWeek,
    response_rate: responseRate,
    recommended_cooldown_hours,
    max_touches_remaining,
    reason: reason.trim(),
  };
}

// ============ Helper functions for message generation ============

function generateEmailSubject(template: string, lead: LeadState): string {
  const _firstName = lead.name?.split(" ")[0] || "there";
  const subjects: Record<string, string> = {
    hot_lead_direct_call: `Quick chat about ${lead.company || "your business"}?`,
    value_proposition_pricing_email: `ROI breakdown for ${lead.company || "companies like yours"}`,
    demo_prep_email: `Your demo prep materials`,
    objection_price_roi_case_study: `How our customers justified the investment`,
    warm_sms_followup: `One more thing...`,
    channel_switch_sms: `One quick message`,
    demo_dark_reengagement: `Next steps after your demo`,
    value_nurture_default: `Something new in ${lead.industry || "your industry"}`,
  };
  return subjects[template] || `Following up on our conversation`;
}

function generateEmailBody(template: string, firstName: string, lead: LeadState): string {
  const bodies: Record<string, string> = {
    hot_lead_direct_call: `Hi ${firstName},\n\nI'd love to chat about how we can help ${lead.company}. Are you free for a quick call tomorrow?\n\nBest`,
    value_proposition_pricing_email: `Hi ${firstName},\n\nSince you asked about pricing, I wanted to share an ROI breakdown based on companies like ${lead.company}.\n\nLet me know if you'd like to discuss the numbers.\n\nBest`,
    demo_prep_email: `Hi ${firstName},\n\nAttached are your demo prep materials. Looking forward to walking through this with you.\n\nBest`,
    objection_price_roi_case_study: `Hi ${firstName},\n\nI hear the price concern—that's common. Here's how other ${lead.industry} companies justified the investment and saw ROI in 6 months.\n\nBest`,
    warm_sms_followup: `I saw you opened our last email. Quick question: what's one thing you'd want to solve first?`,
    channel_switch_sms: `${firstName}, missed you. Trying another way. What's the best way to reach you?`,
    demo_dark_reengagement: `Hi ${firstName},\n\nFollowing up on your demo. I know things move fast—where are we with this?\n\nBest`,
    value_nurture_default: `Hi ${firstName},\n\nThought you'd find this relevant for ${lead.company}.\n\nBest`,
  };
  return bodies[template] || `Hi ${firstName},\n\nFollowing up on our conversation.`;
}

function generateSMSBody(template: string, firstName: string, _lead: LeadState): string {
  const bodies: Record<string, string> = {
    warm_sms_followup: `${firstName}, saw you opened our email. What's one thing you'd want to solve first?`,
    channel_switch_sms: `Hi ${firstName}. Trying another way. Best time for a quick call?`,
    demo_dark_reengagement: `${firstName}, following up on your demo. Where are we with this?`,
  };
  return bodies[template] || `Hi ${firstName}, following up. Free for a quick chat?`;
}

function generateCallScript(template: string, firstName: string, lead: LeadState): string {
  const scripts: Record<string, string> = {
    hot_lead_direct_call: `Hi ${firstName}! I wanted to reach out because I think we can really help ${lead.company} with [value prop]. Do you have a minute?`,
    callback_confirmation_call: `Hi ${firstName}, thanks for requesting a callback. I'm ready to walk through how we can help ${lead.company}. Let's dive in.`,
    demo_prep_email: `Hi ${firstName}, I'm calling to make sure you got everything you need for the demo tomorrow. Any questions I can clarify?`,
  };
  return scripts[template] || `Hi ${firstName}, I wanted to follow up on our conversation. Do you have a minute?`;
}

/**
 * Build campaign-specific system prompt injection for outbound calls.
 * Used when executing a campaign call so the agent's goal matches the campaign type.
 * Enhanced with lead intelligence: state, score, tags, history-based strategy adaptation.
 */

export type CampaignType =
  | "speed_to_lead"
  | "lead_followup"
  | "lead_qualification"
  | "appointment_reminder"
  | "appointment_setting"
  | "no_show_recovery"
  | "reactivation"
  | "quote_chase"
  | "cold_outreach"
  | "review_request"
  | "custom";

export type LeadState = "NEW" | "CONTACTED" | "QUALIFIED" | "CUSTOMER" | "OPTED_OUT" | "DO_NOT_CALL";

export type LeadForPrompt = {
  name?: string | null;
  phone?: string | null;
  company?: string | null;
  state?: LeadState | null;
  score?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  metadata?: { service_requested?: string; notes?: string; last_contact_date?: string } | null;
};

export type LeadStrategy = {
  approach: "introduction" | "follow-up" | "closing" | "reactivation" | "premium" | "qualification";
  tone: "warm" | "professional" | "urgent" | "casual" | "formal";
  objectives: string[];
  openingLine: string;
};

/**
 * Determine strategy based on lead state, score, campaign type, and history.
 * Returns approach, tone, objectives, and personalized opening line.
 */
export function getLeadStrategy(
  lead: LeadForPrompt,
  campaignType: CampaignType,
  previousCallCount: number = 0
): LeadStrategy {
  const state = lead.state || "NEW";
  const score = lead.score ?? 0;
  const isHighValue = score >= 70;
  const isMediumValue = score >= 40 && score < 70;
  const isLowValue = score < 40;
  const hasPreviousContact = previousCallCount > 0;

  // Strategy matrix: state → approach
  let approach: LeadStrategy["approach"] = "qualification";
  let tone: LeadStrategy["tone"] = "professional";
  let objectives: string[] = [];
  let openingLine = "";

  if (state === "NEW") {
    approach = isHighValue ? "premium" : "introduction";
    tone = isHighValue ? "warm" : "professional";
    objectives = ["build rapport", "introduce offering", "assess fit"];
    openingLine = isHighValue
      ? `Hi ${lead.name}, I'm reaching out because I think our solution could be a great fit for ${lead.company}. Do you have a quick minute?`
      : `Hi ${lead.name}, I'm calling because we help companies like ${lead.company} with ${getCampaignFocusArea(campaignType)}. Do you have a moment?`;
  } else if (state === "CONTACTED") {
    approach = isHighValue ? "closing" : "follow-up";
    tone = isHighValue ? "urgent" : "warm";
    objectives = hasPreviousContact
      ? ["reference previous discussion", "address concerns", "move to next step"]
      : ["continue conversation", "progress qualification", "schedule next step"];
    openingLine = hasPreviousContact
      ? `Hi ${lead.name}, following up on our last conversation — I wanted to circle back on those points we discussed.`
      : `Hi ${lead.name}, thanks for your interest last time. I had a few more details you might find helpful.`;
  } else if (state === "QUALIFIED") {
    approach = "closing";
    tone = "formal";
    objectives = ["confirm commitment", "schedule", "finalize details"];
    openingLine = `Hi ${lead.name}, great news — I'm ready to get you set up. When works best for you?`;
  } else if (state === "CUSTOMER") {
    approach = "reactivation";
    tone = "warm";
    objectives = ["check in", "identify upsell", "strengthen relationship"];
    openingLine = `Hi ${lead.name}, I wanted to personally check in and see how everything's going with us.`;
  } else {
    // Fallback for OPTED_OUT, DO_NOT_CALL, or unknown
    approach = "introduction";
    tone = "casual";
    objectives = ["permission check", "gentle re-engagement"];
    openingLine = `Hi ${lead.name}, quick question — is this still a good time?`;
  }

  return { approach, tone, objectives, openingLine };
}

function getCampaignFocusArea(campaignType: CampaignType): string {
  const focusAreas: Record<CampaignType, string> = {
    cold_outreach: "generating leads",
    appointment_setting: "scheduling consultations",
    lead_qualification: "understanding your needs",
    quote_chase: "finalizing pricing",
    no_show_recovery: "rescheduling",
    reactivation: "reconnecting",
    lead_followup: "following up",
    appointment_reminder: "confirming appointments",
    review_request: "gathering feedback",
    speed_to_lead: "quick qualification",
    custom: "our services",
  };
  return focusAreas[campaignType] || "our services";
}

export function buildCampaignPrompt(
  campaignType: CampaignType,
  lead: LeadForPrompt,
  options?: {
    qualifiedAction?: string;
    unqualifiedAction?: string;
    appointmentType?: string;
    availableTimes?: string;
    followUpContext?: string;
    nextStep?: string;
    reactivationAction?: string;
    previousCallCount?: number;
    previousCallOutcomes?: Array<{ outcome?: string; summary?: string }>;
  }
): string {
  const name = lead.name?.trim() || "there";
  const company = lead.company?.trim() || "";
  const serviceRequested = lead.metadata?.service_requested?.trim() || "our services";
  const lastContact = lead.metadata?.last_contact_date?.trim() || "a while ago";
  const notes = (lead.metadata?.notes ?? lead.notes)?.trim() || "";
  const tagsStr = lead.tags?.join(", ") || "";

  const qualifiedAction = options?.qualifiedAction ?? "mark as qualified and book appointment";
  const unqualifiedAction = options?.unqualifiedAction ?? "thank them and end politely";
  const appointmentType = options?.appointmentType ?? "consultation";
  const availableTimes = options?.availableTimes ?? "ask what works for them";
  const followUpContext = options?.followUpContext ?? "their recent inquiry";
  const nextStep = options?.nextStep ?? "book an appointment";
  const reactivationAction = options?.reactivationAction ?? "book a consultation";
  const previousCallCount = options?.previousCallCount ?? 0;
  const previousCallOutcomes = options?.previousCallOutcomes ?? [];

  // Get adaptive strategy
  const strategy = getLeadStrategy(lead, campaignType, previousCallCount);
  const strategySection = `
STRATEGY (Lead-Adaptive):
- Approach: ${strategy.approach}
- Tone: ${strategy.tone}
- Opening: "${strategy.openingLine}"
- Objectives: ${strategy.objectives.join(", ")}`;

  // Build history context if available
  const historySection = previousCallCount > 0
    ? `
CALL HISTORY:
- Previous calls: ${previousCallCount}
- Last outcome: ${previousCallOutcomes[0]?.outcome || "Unknown"}
- Previous context: ${previousCallOutcomes[0]?.summary || "No summary available"}`
    : "";

  // Build lead intelligence section
  const intelligenceSection = `
LEAD INTELLIGENCE:
- State: ${lead.state || "NEW"}
- Score: ${lead.score ?? "Not rated"} (High-value: ${(lead.score ?? 0) >= 70 ? "yes" : "no"})
${tagsStr ? `- Tags: ${tagsStr}` : ""}
${lead.company ? `- Company: ${company}` : ""}`;

  switch (campaignType) {
    case "speed_to_lead":
    case "lead_qualification":
      return `
CAMPAIGN GOAL: Qualify this lead.
You are calling ${name}${company ? ` at ${company}` : ""}.
${strategySection}

Ask about: timeline, budget, and decision maker.
If qualified: ${qualifiedAction}.
If not qualified: ${unqualifiedAction}.

${intelligenceSection}
${historySection}
${notes ? `Additional notes: ${notes}` : ""}`;

    case "appointment_setting":
    case "appointment_reminder":
    case "no_show_recovery":
      return `
CAMPAIGN GOAL: Book or confirm an appointment.
You are calling ${name} to schedule a ${appointmentType}.
${strategySection}

Available times: ${availableTimes}.
If they want to book: confirm date, time, and what to expect.
If they decline: ask when would be better and note their preference.

${intelligenceSection}
${historySection}
${notes ? `Additional notes: ${notes}` : ""}`;

    case "lead_followup":
    case "quote_chase":
      return `
CAMPAIGN GOAL: Follow up with this contact.
You are calling ${name} to follow up on ${followUpContext}.
${strategySection}

Ask if they have any questions or need anything else.
If they want to proceed: ${nextStep}.
If not interested right now: ask when to check back.

${intelligenceSection}
${historySection}
${notes ? `Additional notes: ${notes}` : ""}`;

    case "reactivation":
    case "cold_outreach":
      return `
CAMPAIGN GOAL: Re-engage this contact.
You are calling ${name}. They last contacted us ${lastContact}.
${strategySection}

Mention any new offerings or changes since they last engaged.
If interested: ${reactivationAction}.
If not interested: thank them and remove from active list.

${intelligenceSection}
${historySection}
${notes ? `Additional notes: ${notes}` : ""}`;

    case "review_request":
      return `
CAMPAIGN GOAL: Request a review after their visit.
You are calling ${name} about their recent experience.
${strategySection}

Keep it short and low-pressure. If they agree, guide them to leave a review.
If they decline: thank them and end politely.

${intelligenceSection}
${notes ? `Additional notes: ${notes}` : ""}`;

    case "custom":
    default:
      return `
CAMPAIGN GOAL: Follow up with this contact.
You are calling ${name}${serviceRequested ? ` about ${serviceRequested}` : ""}.
${strategySection}

Re-engage them, answer questions, try to book an appointment or next step.
If not interested: thank them and end politely.

${intelligenceSection}
${historySection}
${notes ? `Additional notes: ${notes}` : ""}`;
  }
}

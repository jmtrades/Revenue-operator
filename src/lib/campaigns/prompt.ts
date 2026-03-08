/**
 * Build campaign-specific system prompt injection for outbound calls.
 * Used when executing a campaign call so the agent's goal matches the campaign type.
 */

export type CampaignType =
  | "lead_followup"
  | "lead_qualification"
  | "appointment_reminder"
  | "appointment_setting"
  | "reactivation"
  | "cold_outreach"
  | "review_request"
  | "custom";

export type LeadForPrompt = {
  name?: string | null;
  phone?: string | null;
  company?: string | null;
  metadata?: { service_requested?: string; notes?: string; last_contact_date?: string } | null;
};

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
  }
): string {
  const name = lead.name?.trim() || "there";
  const company = lead.company?.trim() || "";
  const serviceRequested = lead.metadata?.service_requested?.trim() || "our services";
  const lastContact = lead.metadata?.last_contact_date?.trim() || "a while ago";
  const notes = lead.metadata?.notes?.trim() || "";

  const qualifiedAction = options?.qualifiedAction ?? "mark as qualified and book appointment";
  const unqualifiedAction = options?.unqualifiedAction ?? "thank them and end politely";
  const appointmentType = options?.appointmentType ?? "consultation";
  const availableTimes = options?.availableTimes ?? "ask what works for them";
  const followUpContext = options?.followUpContext ?? "their recent inquiry";
  const nextStep = options?.nextStep ?? "book an appointment";
  const reactivationAction = options?.reactivationAction ?? "book a consultation";

  switch (campaignType) {
    case "lead_qualification":
      return `
CAMPAIGN GOAL: Qualify this lead.
You are calling ${name}${company ? ` at ${company}` : ""}.
Ask about: timeline, budget, and decision maker.
If qualified: ${qualifiedAction}.
If not qualified: ${unqualifiedAction}.
${notes ? `Notes: ${notes}` : ""}`;

    case "appointment_setting":
    case "appointment_reminder":
      return `
CAMPAIGN GOAL: Book or confirm an appointment.
You are calling ${name} to schedule a ${appointmentType}.
Available times: ${availableTimes}.
If they want to book: confirm date, time, and what to expect.
If they decline: ask when would be better and note their preference.
${notes ? `Notes: ${notes}` : ""}`;

    case "lead_followup":
      return `
CAMPAIGN GOAL: Follow up with this contact.
You are calling ${name} to follow up on ${followUpContext}.
Ask if they have any questions or need anything else.
If they want to proceed: ${nextStep}.
If not interested right now: ask when to check back.
${notes ? `Notes: ${notes}` : ""}`;

    case "reactivation":
    case "cold_outreach":
      return `
CAMPAIGN GOAL: Re-engage this contact.
You are calling ${name}. They last contacted us ${lastContact}.
Mention any new offerings or changes since they last engaged.
If interested: ${reactivationAction}.
If not interested: thank them and remove from active list.
${notes ? `Notes: ${notes}` : ""}`;

    case "review_request":
      return `
CAMPAIGN GOAL: Request a review after their visit.
You are calling ${name} about their recent experience.
Keep it short and low-pressure. If they agree, guide them to leave a review.
If they decline: thank them and end politely.`;

    case "custom":
    default:
      return `
CAMPAIGN GOAL: Follow up with this contact.
You are calling ${name}${serviceRequested ? ` about ${serviceRequested}` : ""}.
Re-engage them, answer questions, try to book an appointment or next step.
If not interested: thank them and end politely.
${notes ? `Notes: ${notes}` : ""}`;
  }
}

/**
 * Templates v2 Engine
 * Conversion-focused, human-like message generation.
 * Short, confident, calm, not robotic, no cringe.
 * 1-2 sentences usually, can ask ONE clear question.
 */

import type { ConversationState } from "@/lib/conversation-state/resolver";
import type { Playbook } from "@/lib/playbooks";
import type { ObjectionType, ObjectionResponseSlots } from "@/lib/objections/library";
import type { BusinessContext } from "@/lib/playbooks";

export interface TemplateContext {
  state: ConversationState;
  playbook: Playbook;
  objectionType?: ObjectionType;
  objectionSlots?: ObjectionResponseSlots;
  businessContext: BusinessContext;
  leadContext: {
    leadName?: string;
    company?: string;
    lastMessage?: string;
  };
  channel: "sms" | "email" | "web";
}

/**
 * Build message from state, playbook, objection, and context.
 * Deterministic template selection - no free-form generation.
 */
export function buildMessage(context: TemplateContext): string {
  const { state, playbook: _playbook, objectionType, objectionSlots, businessContext, leadContext, channel } = context;
  const leadName = leadContext.leadName;

  // If objection detected, use objection response
  if (objectionType && objectionSlots) {
    return buildObjectionMessage(objectionSlots, businessContext, leadName, channel);
  }

  // State-driven template selection
  switch (state) {
    case "NEW_INTEREST":
      return buildNewInterestMessage(businessContext, leadName, channel);

    case "CLARIFICATION":
      return buildClarificationMessage(businessContext, leadName, leadContext.lastMessage, channel);

    case "CONSIDERING":
      return buildConsideringMessage(businessContext, leadName, channel);

    case "SOFT_OBJECTION":
      return buildSoftObjectionMessage(businessContext, leadName, channel);

    case "HARD_OBJECTION":
      return buildHardObjectionMessage(businessContext, leadName, channel);

    case "DRIFT":
      return buildDriftMessage(businessContext, leadName, channel);

    case "COMMITMENT":
      return buildCommitmentMessage(businessContext, leadName, channel);

    case "POST_BOOKING":
      return buildPostBookingMessage(businessContext, leadName, channel);

    case "NO_SHOW":
      return buildNoShowMessage(businessContext, leadName, channel);

    case "COLD":
      return buildColdMessage(businessContext, leadName, channel);

    default:
      return "Hey — what were you looking to get done?";
  }
}

function buildNewInterestMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const businessName = businessContext.business_name;
  const offer = businessContext.offer_summary;

  if (businessName && offer) {
    return `Hey — yeah we can help with that. What were you looking to get done?`;
  }
  if (offer) {
    return `Hey — yeah we can help with that. What were you looking to get done?`;
  }
  return "Hey — yeah we can help. What were you looking to get done?";
}

function buildClarificationMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  lastMessage: string | undefined,
  _channel: string
): string {
  if (lastMessage && lastMessage.length < 50) {
    const answer = getClarificationAnswer(lastMessage, businessContext);
    return answer.length > 80 ? answer : `${answer} What else?`;
  }
  return "What do you want to know?";
}

function getClarificationAnswer(question: string, businessContext: BusinessContext): string {
  const qLower = question.toLowerCase();
  if (/(price|cost|how much)/i.test(qLower) && businessContext.pricing_range) {
    return businessContext.pricing_range;
  }
  if (/(what|how|who)/i.test(qLower) && businessContext.offer_summary) {
    return businessContext.offer_summary;
  }
  return businessContext.offer_summary || "We cover that — what bit matters to you?";
}

function buildConsideringMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const bookingLink = businessContext.booking_link;
  if (bookingLink) {
    return `Any questions? ${bookingLink}`;
  }
  return "What would help you decide?";
}

function buildSoftObjectionMessage(
  _businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  return "No rush. When you're ready we can have a quick look.";
}

function buildHardObjectionMessage(
  _businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  return "Understood. If things change, we're here.";
}

function buildDriftMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const bookingLink = businessContext.booking_link;
  if (bookingLink) {
    return `Still wanted help with this or sorted now? ${bookingLink}`;
  }
  return "Still wanted help with this or sorted now?";
}

function buildCommitmentMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const bookingLink = businessContext.booking_link;
  if (bookingLink) {
    return `Here you go. ${bookingLink}`;
  }
  return "When works for a quick call?";
}

function buildPostBookingMessage(
  _businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  return "Quick one — still on for the call?";
}

function buildNoShowMessage(
  _businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  return "We missed you — things get busy. Want to reschedule or sorted elsewhere?";
}

function buildColdMessage(
  businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const bookingLink = businessContext.booking_link;
  if (bookingLink) {
    return `You’d asked about this before — still relevant? ${bookingLink}`;
  }
  return "You’d asked about this before — still relevant?";
}

function buildObjectionMessage(
  slots: ObjectionResponseSlots,
  _businessContext: BusinessContext,
  _leadName: string | undefined,
  _channel: string
): string {
  const parts: string[] = [];
  if (slots.acknowledgement) {
    parts.push(slots.acknowledgement);
  }

  if (slots.reframing) {
    parts.push(slots.reframing);
  }

  if (slots.question) {
    parts.push(slots.question);
  }

  if (slots.next_step) {
    parts.push(slots.next_step);
  }

  // Combine into 1-2 sentences max
  let message = parts.join(" ");
  
  // Ensure max 2 sentences
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 2) {
    message = sentences.slice(0, 2).join(". ") + ".";
  }

  return message.trim() || "Got it. Easiest way is a quick look — want to grab a time?";
}

/**
 * Validate message against playbook constraints.
 */
export function validateMessage(message: string, playbook: Playbook): { valid: boolean; reason?: string } {
  const msgLower = message.toLowerCase();

  // Check forbidden phrases
  for (const phrase of playbook.forbidden_phrases) {
    if (msgLower.includes(phrase.toLowerCase())) {
      return { valid: false, reason: `Contains forbidden phrase: ${phrase}` };
    }
  }

  // Check question count
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount > playbook.max_questions) {
    return { valid: false, reason: `Too many questions (max ${playbook.max_questions})` };
  }

  // Check length (max 2 sentences)
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 2) {
    return { valid: false, reason: "Too many sentences (max 2)" };
  }

  return { valid: true };
}

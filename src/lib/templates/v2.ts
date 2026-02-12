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
  const { state, playbook, objectionType, objectionSlots, businessContext, leadContext, channel } = context;
  const businessName = businessContext.business_name || "";
  const leadName = leadContext.leadName;
  const greeting = leadName ? `Hi ${leadName}` : "Hi";

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

    default:
      return `${greeting}. Thanks for reaching out. How can I help?`;
  }
}

function buildNewInterestMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  const businessName = businessContext.business_name;
  const offer = businessContext.offer_summary;

  if (businessName && offer) {
    return `${greeting}. ${businessName} ${offer}. What are you looking for?`;
  }
  if (offer) {
    return `${greeting}. ${offer}. What are you looking for?`;
  }
  return `${greeting}. Thanks for reaching out. What can I help with?`;
}

function buildClarificationMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  lastMessage: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  
  if (lastMessage && lastMessage.length < 50) {
    // Short question - provide direct answer
    return `${greeting}. ${getClarificationAnswer(lastMessage, businessContext)}`;
  }
  
  return `${greeting}. ${businessContext.offer_summary || "I can answer questions."} What would you like to know?`;
}

function getClarificationAnswer(question: string, businessContext: BusinessContext): string {
  const qLower = question.toLowerCase();
  
  if (/(price|cost|how much)/i.test(qLower) && businessContext.pricing_range) {
    return businessContext.pricing_range;
  }
  
  if (/(what|how|who)/i.test(qLower)) {
    return businessContext.offer_summary || "I can answer questions.";
  }
  
  return businessContext.offer_summary || "Happy to answer questions.";
}

function buildConsideringMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  const bookingLink = businessContext.booking_link;
  
  if (bookingLink) {
    return `${greeting}. What questions do you have? ${bookingLink}`;
  }
  
  return `${greeting}. What would help you decide?`;
}

function buildSoftObjectionMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  return `${greeting}. No rush. When you're ready, happy to discuss.`;
}

function buildHardObjectionMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  return `${greeting}. Understood. If anything changes, happy to reconnect.`;
}

function buildDriftMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  const bookingLink = businessContext.booking_link;
  
  if (bookingLink) {
    return `${greeting}. Still interested? ${bookingLink}`;
  }
  
  return `${greeting}. Still interested?`;
}

function buildCommitmentMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  const bookingLink = businessContext.booking_link;
  
  if (bookingLink) {
    return `${greeting}. Great. ${bookingLink}`;
  }
  
  return `${greeting}. Great. When works for a quick call?`;
}

function buildPostBookingMessage(
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  return `${greeting}. Just confirming you're still on for our call.`;
}

function buildObjectionMessage(
  slots: ObjectionResponseSlots,
  businessContext: BusinessContext,
  leadName: string | undefined,
  channel: string
): string {
  const greeting = leadName ? `Hi ${leadName}` : "Hi";
  const parts: string[] = [];

  if (slots.acknowledgement) {
    parts.push(`${greeting}. ${slots.acknowledgement}`);
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

  return message.trim() || `${greeting}. Thanks for letting me know.`;
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

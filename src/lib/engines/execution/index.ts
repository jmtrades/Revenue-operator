/**
 * Execution Engine — Maps intervention_decision to deterministic templates.
 * No generative messaging. Only: schedule, send, confirm, revive, prepare.
 * Template selection: (stage × hesitation × intervention_type) → deterministic message.
 */

import { buildMessage, ACTION_TEMPLATES, type TemplateSlots } from "@/lib/templates";
import type { InterventionDecision } from "@/lib/engines/decision";

/** Deterministic slot fill from structured data only. No LLM. */
function fillSlotsDeterministic(
  interventionType: string,
  context: { leadName?: string; company?: string }
): TemplateSlots {
  const name = context.leadName?.trim() || "there";
  const company = context.company?.trim() || "";
  const def = ACTION_TEMPLATES[interventionType];
  const slots: TemplateSlots = {};

  switch (interventionType) {
    case "greeting":
      slots.greeting = `Hi ${name}`;
      slots.question_1 = "How can I help you today?";
      break;
    case "clarifying_question":
      slots.greeting = `Hi ${name}`;
      slots.question_1 = "Could you tell me a bit more about what you're looking for?";
      break;
    case "follow_up":
      slots.context_line = `Following up on our last exchange`;
      slots.question_1 = "Any questions I can help with?";
      break;
    case "qualification_question":
      slots.context_line = "To make sure we're a good fit";
      slots.question_1 = "What's the main challenge you're trying to solve?";
      slots.question_2 = "What would success look like for you?";
      break;
    case "booking":
      slots.greeting = `Hi ${name}`;
      slots.context_line = "I'd be happy to help";
      slots.cta = "Would you like to schedule a quick call?";
      break;
    case "call_invite":
      slots.greeting = `Hi ${name}`;
      slots.context_line = "A call would be the fastest way to move forward";
      slots.cta = "Here are some times that work:";
      break;
    case "reminder":
      slots.greeting = `Hi ${name}`;
      slots.context_line = "Reminder: you have a call coming up";
      slots.cta = "Let me know if you need to reschedule.";
      break;
    case "prep_info":
      slots.greeting = `Hi ${name}`;
      slots.context_line = "Quick prep for our call";
      break;
    case "recovery":
    case "win_back":
      slots.greeting = `Hi ${name}`;
      slots.context_line = company ? `We noticed things have been quiet with ${company}` : "We noticed things have been quiet";
      slots.question_1 = "Still interested in exploring options?";
      break;
    case "offer":
      slots.context_line = "We have an option that might help";
      slots.cta = "Worth a quick chat?";
      break;
    case "next_step":
      slots.context_line = "Ready for the next step";
      slots.cta = "Would you like to schedule a call?";
      break;
    case "question":
      slots.context_line = "Thanks for reaching out";
      slots.question_1 = "What's the best way to help you?";
      break;
    default:
      slots.greeting = `Hi ${name}`;
      slots.question_1 = "Could you tell me a bit more about what you're looking for?";
  }

  return slots;
}

/** Build deterministic message from intervention. No AI. */
export function buildMessageFromIntervention(
  decision: InterventionDecision,
  context: { leadName?: string; company?: string }
): string {
  if (!decision.intervene || !decision.intervention_type) {
    return "Thanks for reaching out. How can I help you today?";
  }
  const slots = fillSlotsDeterministic(decision.intervention_type, context);
  return buildMessage(decision.intervention_type, slots);
}

/**
 * Execution Engine — Maps intervention_decision to deterministic templates.
 * No generative messaging. Only: schedule, send, confirm, revive, prepare.
 * Template selection: (stage × hesitation × intervention_type) → deterministic message.
 */

import { buildMessage, ACTION_TEMPLATES, type TemplateSlots } from "@/lib/templates";
import type { InterventionDecision } from "@/lib/engines/decision";

/** Deterministic slot fill from structured data only. No LLM. capacity_pressure: 0 open, 1 normal, 2 limited, 3 critical. */
function fillSlotsDeterministic(
  interventionType: string,
  context: { leadName?: string; company?: string; capacity_pressure?: number }
): TemplateSlots {
  const name = context.leadName?.trim() || "there";
  const _company = context.company?.trim() || "";
  const capacity = context.capacity_pressure ?? 0;
  const limited = capacity >= 2;
  const critical = capacity >= 3;
  const _def = ACTION_TEMPLATES[interventionType];
  const slots: TemplateSlots = {};

  switch (interventionType) {
    case "greeting":
      slots.greeting = critical ? `Hi ${name}` : `Hi ${name}`;
      slots.question_1 = critical ? "When can you do a quick call?" : "How can I help you today?";
      break;
    case "clarifying_question":
      slots.greeting = `Hi ${name}`;
      slots.question_1 = limited ? "What's the main thing you need help with?" : "Could you tell me a bit more about what you're looking for?";
      break;
    case "follow_up":
      slots.context_line = limited ? "Following up" : "Just following up";
      slots.question_1 = critical ? "When works for a call?" : limited ? "Let me know if you'd like to schedule." : "No rush — let me know if you'd like me to keep this open.";
      break;
    case "qualification_question":
      slots.context_line = limited ? "Quick check" : "To make sure we're a good fit";
      slots.question_1 = limited ? "What's the main challenge?" : "What's the main challenge you're trying to solve?";
      break;
    case "booking":
      slots.greeting = `Hi ${name}`;
      slots.context_line = critical ? "" : "Happy to help";
      slots.cta = critical ? "When can you do a call?" : "Would you like to schedule a call?";
      break;
    case "call_invite":
      slots.greeting = `Hi ${name}`;
      slots.context_line = critical ? "" : limited ? "A call would help" : "A call might help move this forward";
      slots.cta = critical ? "Here are times that work." : "Here are some times that work.";
      break;
    case "reminder":
      slots.greeting = `Hi ${name}`;
      slots.context_line = limited ? "Reminder: call coming up" : "Reminder: you have a call coming up";
      slots.cta = "Let me know if you need to reschedule.";
      break;
    case "prep_info":
      slots.greeting = `Hi ${name}`;
      slots.context_line = "Quick prep for our call";
      break;
    case "recovery":
    case "win_back":
      slots.greeting = `Hi ${name}`;
      slots.context_line = critical ? "Following up." : limited ? "Following up — no rush." : "Just following up — no rush at all.";
      slots.question_1 = critical ? "When works for a call?" : "Let me know if you'd like me to keep this open.";
      break;
    case "defer":
      slots.context_line = "Happy to leave this here — just let me know if you'd like to continue.";
      break;
    case "offer":
      slots.context_line = limited ? "Option that might help" : "We have an option that might help";
      slots.cta = "Worth a quick chat?";
      break;
    case "next_step":
      slots.context_line = critical ? "" : "Keeping this open for you";
      slots.cta = critical ? "When can you do a call?" : "Would you like to schedule a call when you're ready?";
      break;
    case "question":
      slots.context_line = limited ? "Thanks" : "Thanks for reaching out";
      slots.question_1 = critical ? "When works for a call?" : "What's the best way to help you?";
      break;
    default:
      slots.greeting = `Hi ${name}`;
      slots.question_1 = limited ? "What do you need?" : "Could you tell me a bit more about what you're looking for?";
  }
  return slots;
}

/** Low-confidence safe defer. Coordinator tone, no pressure. */
export const DEFER_MESSAGE = "Happy to leave this here — just let me know if you'd like to continue.";

/** Build deterministic message from intervention. No AI. capacity_pressure not exposed to user; only adjusts efficiency. */
export function buildMessageFromIntervention(
  decision: InterventionDecision,
  context: { leadName?: string; company?: string; capacity_pressure?: number }
): string {
  if (!decision.intervene || !decision.intervention_type) {
    return "Thanks for reaching out. How can I help you today?";
  }
  const slots = fillSlotsDeterministic(decision.intervention_type, context);
  return buildMessage(decision.intervention_type, slots);
}

/**
 * Playbooks Engine
 * Deterministic playbooks per conversation state.
 * Defines allowed intents, forbidden phrases, goals, cadence, and template selection.
 */

import type { ConversationState } from "@/lib/conversation-state/resolver";
import type { Objective } from "@/lib/conversation-state/objectives";

export interface BusinessContext {
  business_name: string;
  offer_summary: string;
  ideal_customer: string;
  disqualifiers?: string;
  pricing_range?: string | null;
  booking_link?: string | null;
  tone_guidelines?: {
    style?: "calm" | "direct" | "premium" | "consultative";
    formality?: "professional" | "casual" | "formal";
  };
  negotiation_rules?: {
    discounts_allowed?: boolean;
    deposit_required?: boolean;
    payment_terms?: string | null;
  };
}

export interface LeadContext {
  leadName?: string;
  company?: string;
  state: string;
  lastMessage?: string;
  conversationAgeHours?: number;
}

export type InterventionType =
  | "acknowledge"
  | "clarify"
  | "qualify"
  | "objection_handle"
  | "reengage"
  | "book"
  | "confirm"
  | "defer";

export interface Playbook {
  primary_goal: Objective;
  allowed_interventions: InterventionType[];
  forbidden_phrases: string[];
  tone: "calm" | "direct" | "premium" | "consultative";
  max_questions: 1 | 2;
  recommended_next_action_type: InterventionType;
  recommended_delay_rules: {
    immediate?: boolean;
    hours?: number;
    days?: number;
    low_pressure_multiplier?: number; // Multiply delay if low pressure mode
  };
  template_set_id: string;
}

/**
 * Get playbook for a conversation state.
 * Deterministic mapping based on state + business context.
 */
export function getPlaybookForState(
  state: ConversationState,
  businessContext: BusinessContext,
  leadContext: LeadContext
): Playbook {
  const tone = businessContext.tone_guidelines?.style ?? "calm";
  const isLowPressure = leadContext.state === "REACTIVATE" || (leadContext.conversationAgeHours ?? 0) > 72;

  switch (state) {
    case "NEW_INTEREST":
      return {
        primary_goal: "acknowledge",
        allowed_interventions: ["acknowledge", "clarify", "qualify"],
        forbidden_phrases: ["I'm an AI", "automated", "bot"],
        tone,
        max_questions: 1,
        recommended_next_action_type: "acknowledge",
        recommended_delay_rules: {
          immediate: true,
        },
        template_set_id: "new_interest",
      };

    case "CLARIFICATION":
      return {
        primary_goal: "clarify",
        allowed_interventions: ["clarify", "qualify"],
        forbidden_phrases: ["I don't know", "let me check", "I'll get back to you"],
        tone,
        max_questions: 2,
        recommended_next_action_type: "clarify",
        recommended_delay_rules: {
          immediate: true,
        },
        template_set_id: "clarification",
      };

    case "CONSIDERING":
      return {
        primary_goal: "reduce_uncertainty",
        allowed_interventions: ["qualify", "objection_handle", "book"],
        forbidden_phrases: ["hurry", "limited time", "act now"],
        tone,
        max_questions: 1,
        recommended_next_action_type: "qualify",
        recommended_delay_rules: {
          hours: 4,
          low_pressure_multiplier: 2,
        },
        template_set_id: "considering",
      };

    case "SOFT_OBJECTION":
      return {
        primary_goal: "reduce_uncertainty",
        allowed_interventions: ["objection_handle", "reengage", "defer"],
        forbidden_phrases: ["you're wrong", "that's not true", "you should"],
        tone,
        max_questions: 1,
        recommended_next_action_type: "objection_handle",
        recommended_delay_rules: {
          hours: 24,
          low_pressure_multiplier: 1.5,
        },
        template_set_id: "soft_objection",
      };

    case "HARD_OBJECTION":
      return {
        primary_goal: "reduce_uncertainty",
        allowed_interventions: ["objection_handle", "defer"],
        forbidden_phrases: ["you're wrong", "that's not true", "you must"],
        tone: "calm", // Always calm for hard objections
        max_questions: 1,
        recommended_next_action_type: "objection_handle",
        recommended_delay_rules: {
          hours: isLowPressure ? 72 : 48,
        },
        template_set_id: "hard_objection",
      };

    case "DRIFT":
      return {
        primary_goal: "reengage",
        allowed_interventions: ["reengage", "defer"],
        forbidden_phrases: ["why haven't you", "you disappeared", "where did you go"],
        tone: "calm",
        max_questions: 1,
        recommended_next_action_type: "reengage",
        recommended_delay_rules: {
          hours: 24,
          low_pressure_multiplier: 2,
        },
        template_set_id: "drift",
      };

    case "COMMITMENT":
      return {
        primary_goal: "secure_commitment",
        allowed_interventions: ["book", "confirm"],
        forbidden_phrases: ["maybe", "think about it", "later"],
        tone,
        max_questions: 1,
        recommended_next_action_type: "book",
        recommended_delay_rules: {
          immediate: true,
        },
        template_set_id: "commitment",
      };

    case "POST_BOOKING":
      return {
        primary_goal: "prepare_attendance",
        allowed_interventions: ["confirm", "reengage"],
        forbidden_phrases: ["don't forget", "remember", "important"],
        tone: "calm",
        max_questions: 1,
        recommended_next_action_type: "confirm",
        recommended_delay_rules: {
          hours: 24, // Confirm 24h before call
        },
        template_set_id: "post_booking",
      };

    default:
      // Fallback
      return {
        primary_goal: "acknowledge",
        allowed_interventions: ["acknowledge"],
        forbidden_phrases: [],
        tone,
        max_questions: 1,
        recommended_next_action_type: "acknowledge",
        recommended_delay_rules: {
          immediate: true,
        },
        template_set_id: "default",
      };
  }
}

/**
 * Calculate next action timing based on playbook delay rules.
 */
export function calculateNextActionAt(playbook: Playbook, isLowPressure: boolean): Date {
  const now = new Date();
  const rules = playbook.recommended_delay_rules;

  if (rules.immediate) {
    return now;
  }

  let delayHours = rules.hours ?? 0;
  if (rules.days) {
    delayHours = rules.days * 24;
  }

  if (isLowPressure && rules.low_pressure_multiplier) {
    delayHours *= rules.low_pressure_multiplier;
  }

  const nextAction = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  return nextAction;
}

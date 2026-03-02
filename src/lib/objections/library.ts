/**
 * Objection Library
 * Detects objection types and provides response slots.
 * Not closing, but persuasive and stabilizing.
 */

import type { ConversationState } from "@/lib/conversation-state/resolver";

export type ObjectionType =
  | "price"
  | "timing"
  | "trust"
  | "send_info"
  | "comparison"
  | "talk_later"
  | "need_partner"
  | "too_busy"
  | "not_interested"
  | null;

export interface ObjectionResponseSlots {
  acknowledgement: string; // Acknowledge the concern
  reframing: string; // Reframe value/benefit
  question: string; // Single clarifying question (optional)
  next_step: string; // Clear next step (call/booking/info)
}

export interface BusinessContext {
  business_name: string;
  offer_summary: string;
  pricing_range?: string | null;
  booking_link?: string | null;
  negotiation_rules?: {
    discounts_allowed?: boolean;
    deposit_required?: boolean;
    payment_terms?: string | null;
  };
}

/**
 * Detect objection type from message content.
 * Uses pattern matching for deterministic detection.
 */
export function detectObjectionType(
  message: string,
  conversationState: ConversationState
): ObjectionType {
  const msgLower = message.toLowerCase().trim();

  // Price objections
  if (
    /(too expensive|too much|cost|price|pricing|budget|afford|cheaper|discount)/i.test(msgLower) &&
    conversationState !== "COMMITMENT"
  ) {
    return "price";
  }

  // Timing objections
  if (/(not now|later|busy|timing|when|schedule|time)/i.test(msgLower) && /(later|not now|busy)/i.test(msgLower)) {
    return "timing";
  }

  // Trust objections
  if (/(don't trust|scam|spam|legit|real|verify|prove)/i.test(msgLower)) {
    return "trust";
  }

  // Send info requests
  if (/(send|email|info|information|details|brochure|pamphlet)/i.test(msgLower) && /(send|email)/i.test(msgLower)) {
    return "send_info";
  }

  // Comparison shopping
  if (/(compare|vs|versus|alternative|other|looking at|checking)/i.test(msgLower)) {
    return "comparison";
  }

  // Talk later
  if (/(talk later|call later|reach out|contact|follow up)/i.test(msgLower) && /(later|next)/i.test(msgLower)) {
    return "talk_later";
  }

  // Need to ask partner/spouse
  if (/(partner|spouse|wife|husband|boss|team|discuss|think about)/i.test(msgLower)) {
    return "need_partner";
  }

  // Too busy
  if (/(too busy|overwhelmed|swamped|no time|hectic)/i.test(msgLower)) {
    return "too_busy";
  }

  // Not interested (hard rejection)
  if (/(not interested|no thanks|stop|unsubscribe|remove)/i.test(msgLower)) {
    return "not_interested";
  }

  return null;
}

/**
 * Get objection response slots based on type and context.
 * Returns deterministic response components.
 */
export function getObjectionResponseSlots(
  objectionType: ObjectionType,
  context: BusinessContext,
  _conversationState: ConversationState
): ObjectionResponseSlots | null {
  if (!objectionType) return null;

  const businessName = context.business_name || "we";
  const hasBookingLink = !!context.booking_link;
  const discountsAllowed = context.negotiation_rules?.discounts_allowed ?? false;

  switch (objectionType) {
    case "price":
      if (!context.pricing_range) {
        // Pricing unknown - ask clarifying question
        return {
          acknowledgement: "I understand pricing is important.",
          reframing: "",
          question: "What budget range are you considering?",
          next_step: hasBookingLink
            ? `I can walk through options on a quick call. ${context.booking_link}`
            : "Happy to discuss pricing and see if we're a fit.",
        };
      }

      if (discountsAllowed) {
        return {
          acknowledgement: "I understand pricing is a consideration.",
          reframing: `Our ${context.offer_summary} typically ${context.pricing_range}.`,
          question: "What would make this work for your budget?",
          next_step: hasBookingLink
            ? `Let's discuss options. ${context.booking_link}`
            : "Happy to explore what's possible.",
        };
      }

      // No discounts - anchor value
      return {
        acknowledgement: "I understand pricing matters.",
        reframing: `Our ${context.offer_summary} ${context.pricing_range}.`,
        question: "What's most important to you in this decision?",
        next_step: hasBookingLink
          ? `I can show you how this delivers value. ${context.booking_link}`
          : "Happy to discuss how this fits your needs.",
      };

    case "timing":
      return {
        acknowledgement: "I understand timing is important.",
        reframing: "",
        question: "When would be a better time?",
        next_step: hasBookingLink
          ? `No rush. When you're ready: ${context.booking_link}`
          : "Happy to reconnect when timing works better.",
      };

    case "trust":
      return {
        acknowledgement: "I understand you want to verify this is legitimate.",
        reframing: `${businessName} ${context.offer_summary}.`,
        question: "What would help you feel more confident?",
        next_step: hasBookingLink
          ? `Happy to answer questions on a call. ${context.booking_link}`
          : "I can provide references or answer any questions.",
      };

    case "send_info":
      return {
        acknowledgement: "I can share more details.",
        reframing: "",
        question: "",
        next_step: hasBookingLink
          ? `I'll send info, and we can discuss on a quick call if helpful. ${context.booking_link}`
          : "I'll send details. Happy to answer questions after you review.",
      };

    case "comparison":
      return {
        acknowledgement: "I understand you're comparing options.",
        reframing: `${businessName} ${context.offer_summary}.`,
        question: "What's most important to you in making this decision?",
        next_step: hasBookingLink
          ? `I can help you evaluate fit. ${context.booking_link}`
          : "Happy to discuss how we compare to alternatives.",
      };

    case "talk_later":
      return {
        acknowledgement: "No problem.",
        reframing: "",
        question: "",
        next_step: hasBookingLink
          ? `When you're ready: ${context.booking_link}`
          : "Happy to reconnect when you're ready.",
      };

    case "need_partner":
      return {
        acknowledgement: "I understand you want to discuss this with others.",
        reframing: "",
        question: "",
        next_step: hasBookingLink
          ? `Take your time. When ready: ${context.booking_link}`
          : "Happy to reconnect after you've discussed.",
      };

    case "too_busy":
      return {
        acknowledgement: "I understand you're busy.",
        reframing: "",
        question: "",
        next_step: hasBookingLink
          ? `No pressure. When you have 15 minutes: ${context.booking_link}`
          : "Happy to reconnect when you have time.",
      };

    case "not_interested":
      // Respect opt-out, but leave door open
      return {
        acknowledgement: "Understood.",
        reframing: "",
        question: "",
        next_step: "If anything changes, happy to reconnect.",
      };

    default:
      return null;
  }
}

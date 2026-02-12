/**
 * Template-slot messaging. No freeform risk.
 * All outbound messages from controlled templates with slots.
 */

import type { LeadState } from "@/lib/types";

export type TemplateSlots = {
  greeting?: string;
  context_line?: string;
  question_1?: string;
  question_2?: string;
  cta?: string;
};

const RESTRICTED_TOPICS = [
  "pricing guarantee",
  "refund policy",
  "legal advice",
  "medical advice",
  "financial advice",
  "investment advice",
];

/** Base templates per action. AI fills slots only. */
export const ACTION_TEMPLATES: Record<string, { slots: (keyof TemplateSlots)[]; maxLength: number }> = {
  greeting: { slots: ["greeting", "question_1"], maxLength: 200 },
  question: { slots: ["context_line", "question_1"], maxLength: 200 },
  clarifying_question: { slots: ["greeting", "question_1"], maxLength: 150 },
  follow_up: { slots: ["context_line", "question_1"], maxLength: 200 },
  qualification_question: { slots: ["context_line", "question_1", "question_2"], maxLength: 250 },
  discovery_questions: { slots: ["context_line", "question_1"], maxLength: 250 },
  value_proposition: { slots: ["context_line", "cta"], maxLength: 250 },
  booking: { slots: ["greeting", "context_line", "cta"], maxLength: 200 },
  call_invite: { slots: ["greeting", "context_line", "cta"], maxLength: 200 },
  reminder: { slots: ["greeting", "context_line", "cta"], maxLength: 200 },
  prep_info: { slots: ["greeting", "context_line"], maxLength: 200 },
  next_step: { slots: ["context_line", "cta"], maxLength: 200 },
  retention: { slots: ["greeting", "context_line"], maxLength: 200 },
  referral_ask: { slots: ["greeting", "context_line", "cta"], maxLength: 200 },
  recovery: { slots: ["greeting", "question_1"], maxLength: 200 },
  feedback_request: { slots: ["greeting", "question_1"], maxLength: 150 },
  check_in: { slots: ["greeting", "context_line"], maxLength: 200 },
  upsell: { slots: ["context_line", "cta"], maxLength: 200 },
  win_back: { slots: ["greeting", "context_line", "cta"], maxLength: 200 },
  offer: { slots: ["context_line", "cta"], maxLength: 200 },
  defer: { slots: ["context_line"], maxLength: 100 },
};

/** Build message from slots. Enforce structure. */
export function buildMessage(action: string, slots: TemplateSlots): string {
  const def = ACTION_TEMPLATES[action] ?? ACTION_TEMPLATES.clarifying_question;
  const parts: string[] = [];
  for (const slot of def.slots) {
    const val = slots[slot];
    if (val && typeof val === "string") parts.push(val.trim());
  }
  const msg = parts.join(" ").trim();
  return msg.slice(0, def.maxLength) || "Thanks for reaching out. How can I help you today?";
}

/** Validate no restricted topics in filled slots. */
export function containsRestrictedTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return RESTRICTED_TOPICS.some((t) => lower.includes(t));
}

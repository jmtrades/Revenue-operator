/**
 * Deterministic MessagePlan generator. Used when LLM is unavailable or fails.
 * Plan includes clause plan (array of clause types); no template ids.
 */

import type { MessagePlan, MessageIntentType, Stance, Tone, Audience, ClausePlan, ClauseType } from "./types";

const DEFAULT_TONE: Tone = "neutral";
const DEFAULT_STANCE: Stance = "request";

/** Map audience to effective tone for fragment selection (same facts, different wording). */
const AUDIENCE_TONE: Record<Audience, Tone> = {
  organization: "firm",
  professional: "neutral",
  personal: "warm",
  public: "neutral",
};

const INTENT_TO_CLAUSES: Record<MessageIntentType, ClauseType[]> = {
  follow_up: ["next_step"],
  confirm_booking: ["confirmation_request"],
  reschedule_request: ["confirmation_request", "next_step"],
  payment_link: ["payment_prompt"],
  payment_reminder: ["payment_prompt", "next_step"],
  clarification: ["next_step"],
  close_loop: ["close_loop"],
  handoff_hold: ["handoff"],
  acknowledgement_request: ["acknowledgment", "confirmation_request"],
  dispute_resolution: ["acknowledgment", "handoff"],
  outcome_confirmation: ["outcome"],
};

export function clausesForIntent(intent: MessageIntentType): ClausePlan[] {
  const types = INTENT_TO_CLAUSES[intent] ?? ["next_step"];
  return types.map((type) => ({ type }));
}

export function createDeterministicPlan(
  intent: MessageIntentType,
  options?: { stance?: Stance; tone?: Tone; audience?: Audience; entities?: Partial<MessagePlan["entities"]>; reason_tags?: string[] }
): MessagePlan {
  const stance = options?.stance ?? DEFAULT_STANCE;
  const explicitTone = options?.tone;
  const audience = options?.audience;
  const tone = explicitTone ?? (audience ? AUDIENCE_TONE[audience] : DEFAULT_TONE);
  const entities = options?.entities ?? {};
  const reason_tags = options?.reason_tags ?? [];
  return {
    intent,
    stance,
    entities: { ...entities },
    constraints: { max_chars: 320, channel: "sms" },
    tone,
    ...(audience && { audience }),
    reason_tags,
    clauses: clausesForIntent(intent),
  };
}

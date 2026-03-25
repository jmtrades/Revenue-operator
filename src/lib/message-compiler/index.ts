/**
 * Message Compiler: structured plan + deterministic rendering. No templates; no raw LLM text.
 */

import type { MessagePlan, MessageIntentType, BusinessContextForCompiler } from "./types";
import { createDeterministicPlan, clausesForIntent } from "./plan-generator";
import { renderMessage } from "./renderer";
import { parseMessagePlan } from "./schema";

export type { MessagePlan, MessageIntentType, MessagePlanEntities, BusinessContextForCompiler, ClausePlan, ClauseType, Audience } from "./types";
export { MessageIntent } from "./types";
export { parseMessagePlan } from "./schema";
export { createDeterministicPlan, clausesForIntent } from "./plan";
export { renderMessage, optOutSuffixIfRequired } from "./render";

const DEFAULT_CONTEXT: BusinessContextForCompiler = {};

export interface CompileMessageInput {
  intent?: MessageIntentType;
  channel?: "sms" | "email" | "web";
  stance?: MessagePlan["stance"];
  tone?: MessagePlan["tone"];
  audience?: MessagePlan["audience"];
  entities?: Partial<MessagePlan["entities"]>;
  businessContext?: BusinessContextForCompiler;
  requireOptOut?: boolean;
  /** When true, append record_expectation clause (once per conversation after proof reference sent). */
  addRecordExpectation?: boolean;
}

/**
 * Produce final outbound message from intent and optional context.
 * Uses deterministic plan only; no LLM. Safe for recovery and transactional flows.
 */
export function compileMessage(
  intent: MessageIntentType,
  context?: {
    channel?: "sms" | "email" | "web";
    stance?: MessagePlan["stance"];
    tone?: MessagePlan["tone"];
    audience?: MessagePlan["audience"];
    entities?: Partial<MessagePlan["entities"]>;
    businessContext?: BusinessContextForCompiler;
    requireOptOut?: boolean;
    addRecordExpectation?: boolean;
  }
): string {
  const plan = createDeterministicPlan(intent, {
    stance: context?.stance,
    tone: context?.tone,
    audience: context?.audience,
    entities: context?.entities,
  });
  if (context?.addRecordExpectation && Array.isArray(plan.clauses)) {
    plan.clauses = [...plan.clauses, { type: "record_expectation" }];
  }
  if (context?.channel) {
    plan.constraints = { ...plan.constraints, channel: context.channel, max_chars: context.channel === "sms" ? 320 : 500 };
  }
  const businessContext = context?.businessContext ?? DEFAULT_CONTEXT;
  const channel = context?.channel ?? "sms";
  return renderMessage(plan, businessContext, channel, { requireOptOut: context?.requireOptOut });
}

/**
 * Compile and return both text and plan. For API: compileMessage(workspaceId, input) use this with input.intent.
 */
export function compileMessageWithPlan(intent: MessageIntentType, context?: CompileMessageInput): { text: string; plan: MessagePlan } {
  const plan = createDeterministicPlan(intent, {
    stance: context?.stance,
    tone: context?.tone,
    audience: context?.audience,
    entities: context?.entities,
  });
  if (context?.addRecordExpectation && Array.isArray(plan.clauses)) {
    plan.clauses = [...plan.clauses, { type: "record_expectation" }];
  }
  if (context?.channel) {
    plan.constraints = { ...plan.constraints, channel: context.channel, max_chars: context.channel === "sms" ? 320 : 500 };
  }
  const businessContext = context?.businessContext ?? DEFAULT_CONTEXT;
  const channel = context?.channel ?? "sms";
  const text = renderMessage(plan, businessContext, channel, { requireOptOut: context?.requireOptOut });
  return { text, plan };
}

/**
 * Render a pre-built plan (e.g. from LLM that returned only plan fields). Validates with schema.
 */
export function renderPlan(
  plan: MessagePlan,
  businessContext: BusinessContextForCompiler = {},
  channel: "sms" | "email" | "web" = "sms",
  options?: { requireOptOut?: boolean }
): string {
  return renderMessage(plan, businessContext, channel, options);
}

/**
 * Validate raw object as MessagePlan. Use when LLM returns plan-shaped JSON.
 * Injects deterministic clauses from intent if missing.
 */
export function validatePlan(raw: unknown): MessagePlan | null {
  const result = parseMessagePlan(raw);
  if (!result.success) return null;
  const data = result.data as MessagePlan;
  if (!data.clauses || !Array.isArray(data.clauses) || data.clauses.length === 0) {
    data.clauses = clausesForIntent(data.intent);
  }
  return data;
}

/** Map conversation state to MessageIntent for decision-job. */
export function stateToIntent(state: string): MessageIntentType | null {
  const map: Record<string, MessageIntentType> = {
    NEW_INTEREST: "clarification",
    CLARIFICATION: "clarification",
    CONSIDERING: "follow_up",
    SOFT_OBJECTION: "clarification",
    HARD_OBJECTION: "clarification",
    DRIFT: "follow_up",
    COLD: "follow_up",
    COMMITMENT: "confirm_booking",
    POST_BOOKING: "confirm_booking",
    NO_SHOW: "reschedule_request",
  };
  return map[state] ?? null;
}

/** Map action type to MessageIntent for decision-job fallback. */
export function actionToIntent(action: string): MessageIntentType | null {
  const map: Record<string, MessageIntentType> = {
    greeting: "clarification",
    clarifying_question: "clarification",
    follow_up: "follow_up",
    qualification_question: "clarification",
    booking: "confirm_booking",
    call_invite: "follow_up",
    reminder: "confirm_booking",
    prep_info: "follow_up",
  };
  return map[action] ?? null;
}

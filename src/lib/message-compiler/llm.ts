/**
 * Optional structured MessagePlan from LLM. Strict JSON, schema-validated.
 * On failure returns null; caller must use deterministic plan.
 */

import type { MessagePlan, MessageIntentType } from "./types";
import { parseMessagePlan } from "./schema";
import { createDeterministicPlan } from "./plan-generator";

export interface CompilerInput {
  engine?: string;
  state?: string;
  intent?: MessageIntentType;
  channel?: "sms" | "email" | "web";
  entities?: Record<string, string | undefined>;
}

/**
 * If LLM is configured and returns valid plan JSON, return it. Otherwise null.
 * Caller should fall back to createDeterministicPlan.
 */
export async function generateStructuredPlan(_workspaceId: string, _input: CompilerInput): Promise<MessagePlan | null> {
  // No LLM call by default; keeps messaging deterministic and objection-free.
  return null;
}

/**
 * Resolve plan: optional LLM first, then deterministic fallback.
 */
export async function resolvePlan(
  workspaceId: string,
  intent: MessageIntentType,
  input?: CompilerInput
): Promise<MessagePlan> {
  const plan = await generateStructuredPlan(workspaceId, { ...input, intent });
  if (plan && parseMessagePlan(plan).success) return plan;
  return createDeterministicPlan(intent, {
    stance: input?.entities ? undefined : undefined,
    entities: input?.entities,
  });
}
